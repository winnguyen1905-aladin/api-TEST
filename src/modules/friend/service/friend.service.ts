import { injectable } from 'inversify';
import { createClient, RedisClientType } from 'redis';

export interface UserInfo {
  name: string;
  lastOnline: string;
}

@injectable()
export class FriendService {
  private redisClient: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.redisClient.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    // Connect to Redis
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.redisClient.connect();
      }
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  // User Management Methods
  async saveUserInfo(userName: string, userInfo: UserInfo): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (!userName || !userInfo.name) {
        return { success: false, message: 'Username and user info are required' };
      }

      const key = `user:${userName}:info`;
      await this.redisClient.hSet(key, {
        name: userInfo.name,
        lastOnline: userInfo.lastOnline || new Date().toISOString()
      });

      return { success: true, message: 'User info saved successfully' };
    } catch (error: any) {
      console.error('Error saving user info:', error);
      return { success: false, message: error.message || 'Failed to save user info' };
    }
  }

  async getUserInfo(userName: string): Promise<UserInfo | null> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const key = `user:${userName}:info`;
      const userInfo = await this.redisClient.hGetAll(key);

      if (!userInfo || !userInfo.name) {
        return null;
      }

      return {
        name: userInfo.name,
        lastOnline: userInfo.lastOnline
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  async updateLastOnline(userName: string): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const key = `user:${userName}:info`;
      await this.redisClient.hSet(key, 'lastOnline', new Date().toISOString());
    } catch (error) {
      console.error('Error updating last online:', error);
    }
  }

  async addFriend(userName: string, friendName: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      // Validate inputs
      if (!userName || !friendName) {
        return { success: false, message: 'Username and friend name are required' };
      }

      if (userName === friendName) {
        return { success: false, message: 'Cannot add yourself as a friend' };
      }

      // Use Redis SET to store friends list
      const key = `user:${userName}:friends`;
      
      // Check if already friends
      const isFriend = await this.redisClient.sIsMember(key, friendName);
      if (isFriend) {
        return { success: false, message: `${friendName} is already your friend` };
      }

      // Add friend to set
      await this.redisClient.sAdd(key, friendName);

      return { success: true, message: `${friendName} added successfully` };
    } catch (error: any) {
      console.error('Error adding friend:', error);
      return { success: false, message: error.message || 'Failed to add friend' };
    }
  }

  async getFriends(userName: string): Promise<string[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const key = `user:${userName}:friends`;
      const friends = await this.redisClient.sMembers(key);
      return friends;
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  }

  async removeFriend(userName: string, friendName: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const key = `user:${userName}:friends`;
      const removed = await this.redisClient.sRem(key, friendName);

      if (removed > 0) {
        return { success: true, message: `${friendName} removed successfully` };
      } else {
        return { success: false, message: `${friendName} is not in your friends list` };
      }
    } catch (error: any) {
      console.error('Error removing friend:', error);
      return { success: false, message: error.message || 'Failed to remove friend' };
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.redisClient.quit();
        this.isConnected = false;
        console.log('Redis Client Disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting Redis:', error);
    }
  }
}

