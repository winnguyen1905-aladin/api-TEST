import * as mediasoup from 'mediasoup';
import { injectable } from 'inversify';
import { Room } from '../domain/room.domain';

@injectable()
export class RoomService {
  private rooms: Room[] = [];

  createRoom(roomName: string, worker: mediasoup.types.Worker): Room {
    const room = new Room(roomName, worker);
    this.rooms.push(room);
    return room;
  }

  findRoom(roomName: string): Room | undefined {
    return this.rooms.find(room => room.roomName === roomName);
  }

  removeRoom(roomName: string): void {
    const index = this.rooms.findIndex(room => room.roomName === roomName);
    if (index !== -1) {
      const room = this.rooms[index];
      room.cleanup(); // Clean up periodic refresh and other resources
      this.rooms.splice(index, 1);
      console.log(`[RoomService] Room ${roomName} removed and cleaned up`);
    }
  }

  getAllRooms(): Room[] {
    return this.rooms;
  }

  getRoomCount(): number {
    return this.rooms.length;
  }
}

// Singleton export removed - use DI container instead
