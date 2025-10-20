import { Client } from "@/modules/room/domain/client.domain";
import { injectable } from "inversify";

@injectable()
export class InteractionService {
  handleDrawing(client: Client, drawData: { roomId: string, x: number, y: number, color: string, action: 'start' | 'draw' | 'end' }) {
    client.socket.to(drawData.roomId).emit('drawingUpdate', {
      userId: client.socket.data.user.id,
      ...drawData
    });
  }
}
