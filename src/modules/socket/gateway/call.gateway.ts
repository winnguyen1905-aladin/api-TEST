// src/modules/socket/gateways/call.gateway.ts
import { CallService, Client } from "@modules";
import { BaseGateway } from "./base.gateway";
// ServiceLocator removed - using constructor injection
import type {
  JoinRoomData,
  TransportRequestData,
  ConnectTransportData,
  StartProducingData,
  ConsumeMediaData,
  UnpauseConsumerData,
  SocketEventCallback,
  AuthenticatedSocket,
} from "@/common";

import {
  Gateway,
  On,
  ConnectedSocket,
  MessageBody,
  Ack,
} from "@/common/decorators/ws-decorators";

@Gateway()
export class CallGateway extends BaseGateway {
  constructor(private readonly callService: CallService) {
    super();
    // this.callService = ServiceLocator.getCallService();
  }

  protected override getNamespace(): string {
    return "call";
  }

  // Override onInitialConnect from BaseGateway instead of using @On('connect')
  protected override async onInitialConnect(
    socket: AuthenticatedSocket
  ): Promise<void> {
    this.logInfo(
      "Call client connected, initializing video call setup",
      socket
    );

    // Set initial state for video calls
    socket.data.connectionTime = new Date();
    socket.data.connectionType = "call";
    socket.data.authenticated = false;
    socket.data.mediaReady = false;

    // Set longer timeout for video call setup (45 seconds)
    const authTimeout = setTimeout(() => {
      if (!socket.data.authenticated) {
        this.logError(
          "Call authentication timeout - video setup took too long",
          null,
          socket
        );
        socket.emit("callAuthError", {
          error: "Authentication timeout for video call",
          code: "CALL_AUTH_TIMEOUT",
        });
        socket.disconnect(true);
      }
    }, 45000); // 45 seconds for video call

    socket.data.authTimeout = authTimeout;

    // Send call-specific connection response
    socket.emit("callConnectionReady", {
      message:
        "Video call server ready. Please authenticate with video call permissions.",
      serverCapabilities: {
        video: true,
        audio: true,
        screenShare: true,
        maxParticipants: 50,
      },
      authRequired: true,
    });
  }

  // NOT USED
  // @On('authenticateCall')
  // async onCallAuthenticate(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() data: { token?: string; deviceCapabilities?: any }
  // ): Promise<void> {
  //   try {
  //     this.logInfo('Processing call authentication with device capabilities', socket);

  //     // Validate JWT with call-specific requirements
  //     const authResult = await this.validateCallToken(data.token);

  //     if (!authResult.valid) {
  //       this.logError('Call authentication failed', authResult.error, socket);
  //       socket.emit('callAuthError', {
  //         error: authResult.error || 'Invalid video call token',
  //         code: 'CALL_AUTH_FAILED'
  //       });
  //       socket.disconnect(true);
  //       return;
  //     }

  //     // Clear authentication timeout
  //     if (socket.data.authTimeout) {
  //       clearTimeout(socket.data.authTimeout);
  //       delete socket.data.authTimeout;
  //     }

  //     // Store authenticated user data with call-specific info
  //     socket.data.authenticated = true;
  //     socket.data.user = authResult.user;
  //     socket.data.deviceCapabilities = data.deviceCapabilities || {};

  //     // Join call notification room
  //     await this.joinRoom(socket, `call-notifications-${authResult.user.id}`);

  //     // Initialize MediaSoup capabilities
  //     const userAny = authResult.user as any;
  //     socket.data.mediaCapabilities = {
  //       video: userAny.permissions?.includes('video_call'),
  //       audio: userAny.permissions?.includes('audio_call'),
  //       screenShare: userAny.permissions?.includes('screen_share')
  //     };

  //     // Emit successful call authentication
  //     socket.emit('callAuthSuccess', {
  //       user: authResult.user,
  //       mediaCapabilities: socket.data.mediaCapabilities,
  //       message: 'Video call authentication successful'
  //     });

  //     this.logInfo(`Call user authenticated: ${authResult.user.name} with video permissions`, socket);
  //   } catch (error) {
  //     this.logError('Call authentication error', error, socket);
  //     socket.emit('callAuthError', {
  //       error: 'Video call authentication failed',
  //       code: 'CALL_AUTH_ERROR'
  //     });
  //     socket.disconnect(true);
  //   }
  // }

  @On("disconnect")
  async onCallDisconnect(
    @ConnectedSocket() socket: AuthenticatedSocket
  ): Promise<void> {
    const reason = arguments[1] as string;
    this.logInfo(`Call client disconnecting: ${reason}`, socket);

    try {
      // Clear authentication timeout if it exists
      if (socket.data?.authTimeout) {
        clearTimeout(socket.data.authTimeout);
        delete socket.data.authTimeout;
      }

      const user = socket.data?.user;
      const client = this.getClientFromSocket(socket);

      if (client) {
        // Complex MediaSoup cleanup
        this.logInfo(
          `Cleaning up MediaSoup resources for ${client.userName}`,
          socket
        );
        this.callService.handleDisconnect(client);

        // Notify other participants in the room
        if (client.room) {
          this.broadcastToRoom(socket, client.room.roomName, "participantLeft", {
            userId: user?.id,
            userName: client.userName,
            reason,
            timestamp: new Date(),
          });

          // Log room status
          this.logInfo(
            `Participant left room ${client.room.roomName}. Remaining: ${client.room.clients.length}`,
            socket
          );
        }
      }

      // Clean up call-specific data
      if (user) {
        // Leave call notification room
        await this.leaveRoom(socket, `call-notifications-${user.id}`);

        this.logInfo(`Call user ${user.name} disconnected: ${reason}`, socket);
      }
    } catch (error) {
      this.logError("Error during call disconnect handling", error, socket);
    }
  }

  private async validateCallToken(token?: string): Promise<any> {
    if (!token) {
      return {
        valid: false,
        error: "No video call token provided",
      };
    }

    try {
      const result = await this.validateJwtToken(token);

      if (result.valid && result.user) {
        const userAny = result.user as any; // Type assertion for extended properties

        // Check video call specific permissions
        if (
          !userAny.permissions?.includes("video_call") &&
          !userAny.permissions?.includes("audio_call")
        ) {
          return {
            valid: false,
            error: "User does not have video/audio call permissions",
          };
        }

        // Check concurrent call limits
        if (userAny.activeCalls >= 5) {
          return {
            valid: false,
            error: "Maximum concurrent calls reached (5)",
          };
        }

        // Check if user has sufficient bandwidth allocation
        if (userAny.bandwidthTier === "basic" && userAny.activeCalls >= 1) {
          return {
            valid: false,
            error: "Basic tier allows only 1 concurrent call",
          };
        }
      }

      return result;
    } catch (error) {
      return {
        valid: false,
        error: "Video call token validation failed",
        details: error,
      };
    }
  }

  //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  //--------------------------------- CALL SPECIFIC HANDLERS ---------------------------------------------------------------------------------------------------------------------------------
  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  @On("joinRoom")
  async handleJoinRoom(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: JoinRoomData,
    @Ack() ack: SocketEventCallback
  ) {
    const { userName } = data;
    const client = new Client(userName, socket);

    try {
      const response = await this.callService.handleJoinRoom(
        client,
        data,
        this.ctx.io
      );

      if ((response as any)?.error) {
        return ack(response);
      }

      await this.joinRoom(socket, client.room!.roomName);
      socket.data.client = client;
      return ack(response);
    } catch (error) {
      console.error("Join room error:", error);
      return ack({ error: "Failed to join room" });
    }
  }

  @On("requestTransport")
  async requestTransport(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: TransportRequestData,
    @Ack() ack: SocketEventCallback
  ): Promise<void> {
    try {
      const res = await this.callService.handleRequestTransport(
        this.requireClientFromSocket(socket),
        data
      );
      return ack(res);
    } catch (error: any) {
      console.error("Request transport error:", error);
      return ack({ error: error?.message ?? "Failed to create transport" });
    }
  }

  @On("connectTransport")
  async connectTransport(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: ConnectTransportData,
    @Ack<string>() ack: SocketEventCallback<string>
  ) {
    try {
      const result = await this.callService.handleConnectTransport(
        this.requireClientFromSocket(socket),
        data
      );
      return ack(result);
    } catch (error) {
      console.log("Connect transport error:", error);
      return ack("error");
    }
  }

  @On("startProducing")
  async startProducing(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: StartProducingData,
    @Ack() ack: SocketEventCallback
  ) {
    try {
      const producerId = await this.callService.handleStartProducing(
        this.requireClientFromSocket(socket),
        data,
        this.ctx.io
      );
      return ack(producerId);
    } catch (error: any) {
      console.log("Start producing error:", error);
      return ack({ error: error?.message ?? "Failed to start producing" });
    }
  }

  @On("audioChange")
  audioChange(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() typeOfChange: string
  ) {
    this.callService.handleAudioChange(
      this.requireClientFromSocket(socket),
      typeOfChange
    );
  }

  @On("closeProducers")
  async closeProducers(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { producerIds: string[] }
  ) {
    try {
      const client = this.requireClientFromSocket(socket);

      if (!client.room) {
        console.log("[Server] No room found for client");
        return;
      }

      console.log(
        `[Server] Closing ${data.producerIds.length} producers for ${client.userName}`
      );

      let closedScreenAudio = false;
      let closedScreenVideo = false;

      // Close producers on server and remove from client
      data.producerIds.forEach((pid) => {
        // Find which producer this is (screenAudio or screenVideo)
        for (const [kind, producer] of Object.entries(client.producer)) {
          if (producer?.id === pid) {
            console.log(`[Server] Closing ${kind} producer ${pid}`);
            producer.close();
            delete client.producer[kind];

            if (kind === "screenAudio") closedScreenAudio = true;
            if (kind === "screenVideo") closedScreenVideo = true;
            break;
          }
        }

        // Remove from active speakers list
        const index = client.room!.activeSpeakerList.indexOf(pid);
        if (index > -1) {
          client.room!.activeSpeakerList.splice(index, 1);
          console.log(`[Server] Removed producer ${pid} from active speakers`);
        }

        // Broadcast to all other clients in the room
        this.broadcastToRoom(socket, client.room!.roomName, "producerClosed", {
          producerId: pid,
          userId: socket.data.user?.id,
        });
      });

      // If both screen producers are closed, close the upstream transport if it's separate
      // Note: In the current implementation, screen share uses the same upstreamTransport
      // If you create a separate transport for screen share, add logic here to close it
      if (closedScreenAudio && closedScreenVideo) {
        console.log(
          `[Server] Both screen producers closed for ${client.userName}`
        );
      }

      console.log(
        `[Server] Successfully closed and broadcasted ${data.producerIds.length} producers`
      );
    } catch (error) {
      this.logError("Error handling closeProducers", error, socket);
    }
  }

  @On("consumeMedia")
  async consumeMedia(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: ConsumeMediaData,
    @Ack() ack: SocketEventCallback
  ) {
    try {
      const result = await this.callService.handleConsumeMedia(
        this.requireClientFromSocket(socket),
        data
      );
      return ack(result);
    } catch (error) {
      console.log("Consume media error:", error);
      return ack("consumeFailed");
    }
  }

  @On("unpauseConsumer")
  async unpauseConsumer(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: UnpauseConsumerData,
    @Ack<string>() ack: SocketEventCallback<string>
  ) {
    try {
      const result = await this.callService.handleUnpauseConsumer(
        this.requireClientFromSocket(socket),
        data
      );
      return ack(result);
    } catch (error) {
      console.log("Error unpausing consumer:", error);
      return ack("error");
    }
  }
}
