import { BaseGateway } from "@/modules/socket/gateway/base.gateway";
import { InteractionService } from "@/modules/socket/service/interaction.service";
import { On, ConnectedSocket, Gateway, MessageBody } from "@/common/decorators/ws-decorators";
import { Socket } from "socket.io";
import { AuthenticatedSocket } from "@/common";

@Gateway('interaction')
export class InteractionGateway extends BaseGateway {
  protected override async onInitialConnect(socket: AuthenticatedSocket): Promise<void> {
    throw new Error("Method not implemented.");
  }

	constructor(private readonly interactionService: InteractionService) {
		super();
	}

	protected override getNamespace(): string {
		return 'interaction';
	}

	// Server chỉ làm "message broker"
	@On('drawing')
	async handleDrawing(
		@ConnectedSocket() socket: Socket,
		@MessageBody() drawData: { roomId: string, x: number, y: number, color: string, action: 'start' | 'draw' | 'end' }
	) {
		// Chỉ broadcast tọa độ cho clients khác trong room
		socket.to(drawData.roomId).emit('drawingUpdate', {
			userId: socket.data.user.id,
			...drawData
		});
	}

}
