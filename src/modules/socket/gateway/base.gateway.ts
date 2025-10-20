import { Socket } from 'socket.io';
import { Client } from '@modules';
import { ServerContext, AuthenticatedSocket } from '@/common';
import { On, ConnectedSocket } from '@/common/decorators/ws-decorators';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

export abstract class BaseGateway {

	protected ctx!: ServerContext;

	setContext(ctx: ServerContext): void {
		this.ctx = ctx;
		this.onContextSet();
	}

	protected onContextSet(): void {
	}

	async onConnect(socket: Socket): Promise<void> {

		socket.data.authenticated = false;
		socket.data.connectionTime = new Date();

		const authTimeout = setTimeout(() => {
			if (!socket.data.authenticated) {
				socket.emit('authError', { error: 'Authentication timeout', code: 'AUTH_TIMEOUT' });
				socket.disconnect(true);
			}}, this.getAuthTimeout());

		socket.data.authTimeout = authTimeout;

		await this.onInitialConnect(socket);
	}

  protected abstract onInitialConnect(socket: Socket): Promise<void>;

	protected getAuthTimeout(): number {
		return 30000;
	}

	@On('authenticate')
	async onAuthenticate(
		@ConnectedSocket() socket: Socket,
		data: { token?: string;[key: string]: any }
	): Promise<void> {
		try {
			this.logConnect(socket);
			const authResult = await this.validateJwtToken(data.token);

			if (!authResult.valid) {
				socket.emit('authError', {
					error: authResult.error || 'Invalid token',
					code: 'AUTH_FAILED'
				});
				socket.disconnect(true);
				return;
			}

			if (socket.data.authTimeout) {
				clearTimeout(socket.data.authTimeout);
				delete socket.data.authTimeout;
			}

			socket.data.authenticated = true;
			socket.data.user = authResult.user;

			await this.onSocketConnect(socket, authResult.user);

			socket.emit('authSuccess', {
				user: authResult.user,
				message: 'Authentication successful'
			});

			this.logInfo(`User authenticated: ${authResult.user?.id || 'unknown'}`, socket);
		} catch (error) {
			this.logError('Authentication error', error, socket);
			socket.emit('authError', {
				error: 'Authentication failed',
				code: 'AUTH_ERROR'
			});
			socket.disconnect(true);
		}
	}

	@On('disconnect')
	onDisconnect(@ConnectedSocket() socket: Socket): void {
		const reason = arguments[1] as string;
		this.logDisconnect(socket, reason);

		try {
			if (socket.data?.authTimeout) {
				clearTimeout(socket.data.authTimeout);
				delete socket.data.authTimeout;
			}

			const client = this.getClientFromSocket(socket);
			if (client) {
				this.handleClientDisconnect(client, socket, reason);
			}

			this.onSocketDisconnect(socket, reason);
		} catch (error) {
			this.logError('Error during disconnect handling', error, socket);
		}
	}

	protected async onSocketConnect(socket: Socket, user?: any): Promise<void> {
		this.logInfo(`Socket connected successfully`, socket);
	}

	protected onSocketDisconnect(socket: Socket, reason: string): void {
	}

	protected handleClientDisconnect(client: Client, socket: Socket, reason: string): void {
		this.logInfo(`Client ${client.userName} disconnected from room ${client.room?.roomName || 'none'}`, socket);

		if (client.room) {
			this.handleRoomCleanup(client, socket, reason);
		}
	}

	protected handleRoomCleanup(client: Client, socket: Socket, reason: string): void {
		socket.leave(client.room!.roomName);
	}

	protected getClientFromSocket(socket: Socket): Client | null {
		return (socket.data?.client as Client) || null;
	}

	protected requireClientFromSocket(socket: Socket): Client {
		const client = this.getClientFromSocket(socket);
		if (!client) {
			throw new Error('Client not found in socket data - user may not be joined to a room');
		}
		return client;
	}

	protected hasClient(socket: Socket): boolean {
		return this.getClientFromSocket(socket) !== null;
	}

	protected isAuthenticated(socket: Socket): boolean {
		return Boolean(socket.data?.authenticated);
	}

	protected getAuthenticatedUser(socket: Socket): any | null {
		return socket.data?.user || null;
	}

	protected requireAuthenticatedUser(socket: Socket): any {
		const user = this.getAuthenticatedUser(socket);
		if (!user) {
			throw new Error('User not authenticated');
		}
		return user;
	}

	protected getNamespace(): string {
		return 'base';
	}

	protected logConnect(socket: Socket): void {
		console.log(`[${this.getNamespace()}] Socket connected: ${socket.id}`);
	}

	protected logDisconnect(socket: Socket, reason: string): void {
		console.log(`[${this.getNamespace()}] Socket disconnected: ${socket.id}, reason: ${reason}`);
	}

	protected logInfo(message: string, socket?: Socket): void {
		const socketInfo = socket ? ` [socket: ${socket.id}]` : '';
		console.log(`[${this.getNamespace()}] ${message}${socketInfo}`);
	}

	protected logError(message: string, error: any, socket?: Socket): void {
		const socketInfo = socket ? ` [socket: ${socket.id}]` : '';
		console.error(`[${this.getNamespace()}] ${message}${socketInfo}:`, error);
	}

	protected emitToRoom(roomName: string, event: string, data: any): void {
		if (this.ctx?.io) {
			this.ctx.io.to(roomName).emit(event, data);
		}
	}

	protected broadcastToRoom(socket: Socket, roomName: string, event: string, data: any): void {
		socket.to(roomName).emit(event, data);
	}

	protected async joinRoom(socket: Socket, roomName: string): Promise<void> {
		try {
			await socket.join(roomName);
			this.logInfo(`Socket joined room: ${roomName}`, socket);
		} catch (error) {
			this.logError(`Failed to join room: ${roomName}`, error, socket);
			throw error;
		}
	}

	protected async leaveRoom(socket: Socket, roomName: string): Promise<void> {
		try {
			await socket.leave(roomName);
			this.logInfo(`Socket left room: ${roomName}`, socket);
		} catch (error) {
			this.logError(`Failed to leave room: ${roomName}`, error, socket);
			throw error;
		}
	}

	protected async validateJwtToken(token?: string): Promise<JwtValidationResult> {
		if (!token) {
			return {
				valid: false,
				error: 'No token provided'
			};
		}

		try {
			const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

			const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production-use-random-string';

			const decoded = await this.verifyJwtToken(cleanToken, jwtSecret);

			const user = {
				id: decoded.id || decoded.sub || this.generateUserId(),
				email: decoded.email || 'unknown@example.com',
				name: decoded.name || decoded.username || 'Unknown User',
				profilePicture: decoded.profilePicture || decoded.picture || '',
				lastActive: new Date(),
				...decoded
			};

			return {
				valid: true,
				user
			};
		} catch (error) {
			return {
				valid: false,
				error: 'Invalid or expired token',
				details: error
			};
		}
	}

	private generateUserId(): string {
		return crypto.randomUUID();
	}

	protected createAuthMiddleware() {
		return async (socket: Socket, data: any) => {
			if (!this.isAuthenticated(socket)) {
				throw new Error('User not authenticated. Please authenticate first.');
			}
		};
	}

	protected async verifyJwtToken(token: string, secret: string): Promise<any> {
		return new Promise((resolve, reject) => {
			jwt.verify(token, secret, (err, decoded) => {
				if (err) {
					reject(err);
				} else {
					resolve(decoded);
				}
			});
		});
	}
}

export interface JwtValidationResult {
	valid: boolean;
	user?: {
		id: string;
		email: string;
		name: string;
		profilePicture: string;
		lastActive: Date;
	};
	error?: string;
	details?: any;
}
