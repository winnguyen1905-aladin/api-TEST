import { Client } from '@modules';
import { FriendService } from '@/modules/friend';

import { injectable, inject } from 'inversify';
import { TYPES } from '@/common/di/types';

@injectable()
export class ChatService {
  constructor(
    @inject(TYPES.FriendService) private readonly friendService: FriendService
  ) {}

  // Chat functionality
  handleSendMessage(client: Client, message: string, roomName: string): void {
    // Implementation for sending chat messages
    console.log(
      `Chat message from ${client.userName} in room ${roomName}: ${message}`,
    );
  }

  handleTypingStart(client: Client, roomName: string): void {
    // Implementation for typing indicators
    console.log(`${client.userName} started typing in room ${roomName}`);
  }

  handleTypingStop(client: Client, roomName: string): void {
    // Implementation for stopping typing indicators
    console.log(`${client.userName} stopped typing in room ${roomName}`);
  }

  // Friend functionality
  async addFriend(userName: string, friendName: string): Promise<{ success: boolean; message: string }> {
    return this.friendService.addFriend(userName, friendName);
  }

  async getFriends(userName: string): Promise<string[]> {
    return this.friendService.getFriends(userName);
  }

  async removeFriend(userName: string, friendName: string): Promise<{ success: boolean; message: string }> {
    return this.friendService.removeFriend(userName, friendName);
  }

  // User info functionality
  async saveUserInfo(userName: string, userInfo: { name: string; lastOnline: string }): Promise<{ success: boolean; message: string }> {
    return this.friendService.saveUserInfo(userName, userInfo);
  }

  async getUserInfo(userName: string): Promise<{ name: string; lastOnline: string } | null> {
    return this.friendService.getUserInfo(userName);
  }

  async updateLastOnline(userName: string): Promise<void> {
    return this.friendService.updateLastOnline(userName);
  }
}
