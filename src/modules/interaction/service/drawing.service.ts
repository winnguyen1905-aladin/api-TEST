import { Client } from "@/modules/room/domain/client.domain";
import * as mediasoup from "mediasoup";
import { injectable, inject } from "inversify";
import { TYPES } from "@/common/di/types";
import { ServerContext } from "@/common";
import { DrawingEventDto, DrawingStateDto, DrawingStrokeDto } from "../dto";

@injectable()
export class DrawingService {

  private drawingStates = new Map<string, DrawingStateDto>(); // roomId -> DrawingState

  constructor(@inject(TYPES.ServerContext) private readonly context: ServerContext) { }

  async startDrawingStream(client: Client, rtpParameters: mediasoup.types.RtpParameters): Promise<string> {
    if (!client.upstreamTransport) {
      throw new Error("No upstream transport available");
    }

    // Create a producer for drawing data (can be used for real-time drawing overlay)
    const producerId = await client.upstreamTransport.produce({
      kind: "video",
      rtpParameters,
    });

    client.addProducer("drawing", producerId);

    // Initialize drawing state for room if not exists
    if (client.room && !this.drawingStates.has(client.room.roomName)) {
      this.drawingStates.set(client.room.roomName, {
        strokes: [],
        activeClients: [] // Array instead of Set for JSON serialization
      });
    }

    console.log(`Drawing stream started for client ${client.socket.id} in room ${client.room?.roomName}`);
    return producerId.id;
  }

  handleDrawingEvent(client: Client, event: DrawingEventDto): void {
    if (!client.room) return;

    const roomState = this.drawingStates.get(client.room.roomName);
    if (!roomState) return;

    // Process drawing event
    switch (event.type) {
      case 'draw':
        this.addStroke(roomState, event);
        break;
      case 'clear':
        this.clearDrawing(roomState);
        break;
      case 'undo':
        this.undoLastStroke(roomState, event.clientId);
        break;
    }

    // Broadcast to all clients in room
    this.broadcastDrawingEvent(client.room.roomName, event);
  }

  private addStroke(state: DrawingStateDto, event: DrawingEventDto): void {
    if (!event.coordinates) return;

    const stroke: DrawingStrokeDto = {
      id: `${event.clientId}_${event.timestamp}`,
      clientId: event.clientId,
      points: [event.coordinates],
      brushSize: event.brushSize || 2,
      color: event.color || '#000000',
      timestamp: event.timestamp
    };

    state.strokes.push(stroke);
  }

  private clearDrawing(state: DrawingStateDto): void {
    state.strokes = [];
  }

  private undoLastStroke(state: DrawingStateDto, clientId: string): void {
    // Remove last stroke from this client
    for (let i = state.strokes.length - 1; i >= 0; i--) {
      if (state.strokes[i].clientId === clientId) {
        state.strokes.splice(i, 1);
        break;
      }
    }
  }

  private broadcastDrawingEvent(roomId: string, event: DrawingEventDto): void {
    this.context.io.to(roomId).emit('drawing-event', event);
  }

  getDrawingState(roomId: string): DrawingStateDto | undefined {
    return this.drawingStates.get(roomId);
  }

  // Clean up when client leaves room
  handleClientLeave(roomId: string, clientId: string): void {
    const state = this.drawingStates.get(roomId);
    if (state) {
      state.activeClients = state.activeClients.filter(id => id !== clientId);
    }
  }
}
