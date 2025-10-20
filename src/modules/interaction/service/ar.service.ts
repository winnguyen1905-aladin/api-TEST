import { Client } from "@/modules/room/domain/client.domain";
import * as mediasoup from "mediasoup";
import { injectable, inject } from "inversify";
import { TYPES } from "@/common/di/types";
import { ServerContext } from "@/common";
import {
  AR3DObjectDto,
  ARSessionDto,
  ARMarkerDto,
  AddAR3DObjectRequestDto
} from "../dto";

// Internal interface for AR session with Map (can't serialize Maps to JSON)
interface ARSessionInternal {
  clientId: string;
  roomId: string;
  objects: Map<string, AR3DObjectDto>;
  anchorPoints: ARMarkerDto[];
  isActive: boolean;
}

@injectable()
export class ARService {
  private arSessions = new Map<string, ARSessionInternal>(); // clientId -> ARSession
  private roomARObjects = new Map<string, Map<string, AR3DObjectDto>>(); // roomId -> objectId -> AR3DObject

  constructor(@inject(TYPES.ServerContext) private readonly context: ServerContext) { }

  async startARStream(client: Client, rtpParameters: mediasoup.types.RtpParameters): Promise<string> {
    if (!client.upstreamTransport) {
      throw new Error("No upstream transport available");
    }

    // Create producer for AR-enhanced video stream
    const producerId = await client.upstreamTransport.produce({
      kind: "video",
      rtpParameters,
    });

    client.addProducer("ar", producerId);

    // Initialize AR session
    if (client.room) {
      const session: ARSessionInternal = {
        clientId: client.socket.id,
        roomId: client.room.roomName,
        objects: new Map(),
        anchorPoints: [],
        isActive: true
      };

      this.arSessions.set(client.socket.id, session);

      // Initialize room AR objects if not exists
      if (!this.roomARObjects.has(client.room.roomName)) {
        this.roomARObjects.set(client.room.roomName, new Map());
      }
    }

    console.log(`AR stream started for client ${client.socket.id}`);
    return producerId.id;
  }

  addAR3DObject(client: Client, object: AddAR3DObjectRequestDto): string {
    if (!client.room) throw new Error("Client not in room");

    const ar3DObject: AR3DObjectDto = {
      ...object,
      id: `ar_${client.socket.id}_${Date.now()}`,
      clientId: client.socket.id,
      timestamp: Date.now()
    };

    // Add to room objects
    const roomObjects = this.roomARObjects.get(client.room.roomName);
    if (roomObjects) {
      roomObjects.set(ar3DObject.id, ar3DObject);
    }

    // Add to client session
    const session = this.arSessions.get(client.socket.id);
    if (session) {
      session.objects.set(ar3DObject.id, ar3DObject);
    }

    // Broadcast to all clients in room
    this.broadcastAREvent(client.room.roomName, {
      type: 'object-added',
      object: ar3DObject
    });

    return ar3DObject.id;
  }

  updateAR3DObject(client: Client, objectId: string, updates: Partial<AR3DObjectDto>): void {
    if (!client.room) return;

    const roomObjects = this.roomARObjects.get(client.room.roomName);
    const existingObject = roomObjects?.get(objectId);

    if (!existingObject || existingObject.clientId !== client.socket.id) {
      throw new Error("Object not found or not owned by client");
    }

    const updatedObject = { ...existingObject, ...updates, timestamp: Date.now() };
    roomObjects!.set(objectId, updatedObject);

    // Update client session
    const session = this.arSessions.get(client.socket.id);
    if (session) {
      session.objects.set(objectId, updatedObject);
    }

    // Broadcast update
    this.broadcastAREvent(client.room.roomName, {
      type: 'object-updated',
      objectId,
      updates: updatedObject
    });
  }

  removeAR3DObject(client: Client, objectId: string): void {
    if (!client.room) return;

    const roomObjects = this.roomARObjects.get(client.room.roomName);
    const existingObject = roomObjects?.get(objectId);

    if (!existingObject || existingObject.clientId !== client.socket.id) {
      throw new Error("Object not found or not owned by client");
    }

    // Remove from room and session
    roomObjects!.delete(objectId);
    const session = this.arSessions.get(client.socket.id);
    if (session) {
      session.objects.delete(objectId);
    }

    // Broadcast removal
    this.broadcastAREvent(client.room.roomName, {
      type: 'object-removed',
      objectId
    });
  }

  updateARMarkers(client: Client, markers: ARMarkerDto[]): void {
    const session = this.arSessions.get(client.socket.id);
    if (session) {
      session.anchorPoints = markers;

      // Broadcast marker updates for multi-user AR alignment
      if (client.room) {
        this.broadcastAREvent(client.room.roomName, {
          type: 'markers-updated',
          clientId: client.socket.id,
          markers
        });
      }
    }
  }

  private broadcastAREvent(roomId: string, event: any): void {
    this.context.io.to(roomId).emit('ar-event', event);
  }

  getRoomARObjects(roomId: string): AR3DObjectDto[] {
    const roomObjects = this.roomARObjects.get(roomId);
    return roomObjects ? Array.from(roomObjects.values()) : [];
  }

  // Clean up when client leaves
  handleClientLeave(clientId: string, roomId: string): void {
    const session = this.arSessions.get(clientId);
    if (session) {
      // Remove all objects owned by this client
      const roomObjects = this.roomARObjects.get(roomId);
      if (roomObjects) {
        for (const [objectId, object] of roomObjects.entries()) {
          if (object.clientId === clientId) {
            roomObjects.delete(objectId);
            this.broadcastAREvent(roomId, {
              type: 'object-removed',
              objectId
            });
          }
        }
      }

      this.arSessions.delete(clientId);
    }
  }
}

// Singleton export removed - use DI container instead
