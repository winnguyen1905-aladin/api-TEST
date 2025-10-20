import {
  AuthenticatedSocket,
  ChatService,
  Client,
  SocketEventCallback,
} from "@modules";
import { ServerContext } from "@/common";
import { BaseGateway } from "./base.gateway";
import {
  Ack,
  Gateway,
  MessageBody,
  On,
  ConnectedSocket,
} from "@/common/decorators/ws-decorators";
import * as crypto from "crypto";
import { MessageQueueService } from "@/modules/cache";
import { inject } from "inversify";
import { TYPES } from "@/common/di/types";
import { ChatMessageEvents, Message } from "@/common/types/socket-events.types";

@Gateway("chat")
export class ChatGateway extends BaseGateway {
  constructor(
    private readonly chatService: ChatService,
    @inject(TYPES.MessageQueueService)
    private readonly messageQueue: MessageQueueService
  ) {
    super();
  }

  protected override getNamespace(): string {
    return "chat";
  }

  // TODO:
  protected override async onInitialConnect(
    socket: AuthenticatedSocket
  ): Promise<void> {
    const { token } = socket.handshake.auth;

    const authResult = await this.validateJwtToken(token);

    if (!authResult.valid) {
      socket.emit("chatAuthError", {
        error: "Username required for chat access",
        code: "NO_USERNAME",
      });
      socket.disconnect(true);
    }

    // socket.data.username = username;

    socket.data = {
      ...socket.data,
      user: authResult.user,
      connectionType: "chat",
      connectionTime: new Date(),
      messageCount: 0,
    };

    await this.chatService.saveUserInfo(socket.data.user.name, {
      name: socket.data.user.name,
      lastOnline: new Date().toISOString(),
    });

    socket.emit("chatConnectionReady", {
      message: `Chat server ready. Welcome, ${socket.data.user.name}!`,
      serverCapabilities: {
        messaging: true,
        fileUpload: true,
        emojis: true,
        friendManagement: true,
        maxMessageLength: 1000,
        rateLimit: "10 messages/minute",
      },
      user: socket.data.user,
      authRequired: false,
    });
  }

  @On("disconnect")
  async onChatDisconnect(
    @ConnectedSocket() socket: AuthenticatedSocket
  ): Promise<void> {
    const reason = arguments[1] as string;
    this.logInfo(`Chat client disconnecting: ${reason}`, socket);

    try {
      // Clear authentication timeout if it exists
      if (socket.data?.authTimeout) {
        clearTimeout(socket.data.authTimeout);
        delete socket.data.authTimeout;
      }

      const user = socket.data?.user;
      const username = socket.data?.username;

      if (user) {
        // Update lastOnline in Redis
        if (username) {
          await this.chatService.updateLastOnline(username);
        }

        // Notify other users about offline status
        this.broadcastToRoom(socket, "global-chat", "userOffline", {
          userId: user.id,
          userName: user.name,
          reason,
          timestamp: new Date(),
        });

        // Leave chat rooms
        await this.leaveRoom(socket, "global-chat");
        await this.leaveRoom(socket, `chat-${user.id}`);

        // Log chat statistics
        const messageCount = socket.data?.messageCount || 0;
        const sessionDuration =
          Date.now() - new Date(socket.data.connectionTime).getTime();

        this.logInfo(
          `Chat user ${
            user.name
          } disconnected: ${reason} (${messageCount} messages, ${Math.round(
            sessionDuration / 1000
          )}s session)`,
          socket
        );
      }
    } catch (error) {
      this.logError("Error during chat disconnect handling", error, socket);
    }
  }

  // ==============================
  // MESSAGE EVENTS ==============================================================================================================================
  // ==============================

  @On("chat.message.send")
  async handleMessageSend(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: ChatMessageEvents.SendPayload,
    @Ack() ack: SocketEventCallback<ChatMessageEvents.SendResponse>
  ): Promise<void> {
    try {
      const user = socket.data?.user;

      if (!payload.cypherText?.trim())
        return ack({ ok: false, error: "Message cannot be empty" });

      // Check message length
      const maxLength = socket.data?.chatCapabilities?.messageLimit || 200;
      if (payload.cypherText.length > maxLength) {
        return ack({
          ok: false,
          error: `Message too long. Max ${maxLength} characters.`,
        });
      }

      // Increment message count for statistics
      socket.data.messageCount = (socket.data.messageCount || 0) + 1;

      // Create message object
      const messageData: Message = {
        id: crypto.randomUUID(),
        senderId: user.id,
        contractId: payload.roomId,
        cypherText: payload.cypherText.trim(),
        timestamp: Date.now(),
        type: "TEXT",
      };

      // ✅ STEP 1: Push to PERSISTENT QUEUE FIRST (đảm bảo message không bị mất)
      // Đây là điểm quan trọng nhất để đảm bảo tính toàn vẹn
      const result = await this.messageQueue.queueMessage({
        messageId: messageData.id,
        senderId: user.id,
        cypherText: payload.cypherText.trim(),
        contractId: payload.roomId,
        type: "TEXT",
        metadata: { socketId: socket.id, timestamp: Date.now() },
      });

      if (result.isDuplicate) {
        return ack({
          ok: true,
          data: {
            delivered: true,
            messageId: messageData.id,
            duplicate: true,
          },
        });
      }

      // ✅ STEP 2: Broadcast realtime (CHỈ SAU KHI queue thành công)
      this.emitToRoom(payload.roomId, "chat.message.new", messageData);

      // ✅ STEP 3: ACK to client (message đã được persist trong queue)
      ack({ ok: true, data: { delivered: true, messageId: messageData.id } });

      // External consumer sẽ xử lý async và lưu vào database
      // Nếu consumer fail → BullMQ sẽ retry 5 lần (đảm bảo tính toàn vẹn)
    } catch (error: any) {
      ack({ ok: false, error: error.message || "Failed to send message" });
    }
  }

  // @On("chat.message.edit")
  // async handleMessageEdit(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { messageId: string; content: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("chat.message.delete")
  // async handleMessageDelete(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { messageId: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("chat.message.react")
  // async handleMessageReact(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { messageId: string; reaction: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  @On("chat.message.typing")
  async handleMessageTyping(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; isTyping: boolean }
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.message.read")
  async handleMessageRead(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string; roomId: string },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  // @On("chat.message.history.get")
  // async handleMessageHistoryGet(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody()
  //   payload: {
  //     roomId: string;
  //     limit?: number;
  //     offset?: number;
  //     before?: string;
  //   },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("chat.message.search")
  // async handleMessageSearch(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { query: string; roomId?: string; limit?: number },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  @On("chat.message.pin")
  async handleMessagePin(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string; roomId: string },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.message.unpin")
  async handleMessageUnpin(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string; roomId: string },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  // @On("chat.message.forward")
  // async handleMessageForward(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { messageId: string; targetRoomId: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("chat.message.reply")
  // async handleMessageReply(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody()
  //   payload: { messageId: string; content: string; roomId: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // ==============================
  // DIRECT MESSAGE EVENTS ============================================================================================================================================
  // ==============================

  // @On("chat.direct.message.send")
  // async handleDirectMessageSend(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody()
  //   payload: { recipientId: string; content: string; type?: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("chat.direct.typing")
  // async handleDirectTyping(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { recipientId: string; isTyping: boolean }
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("chat.direct.read")
  // async handleDirectRead(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { conversationId: string; messageId: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("chat.direct.history.get")
  // async handleDirectHistoryGet(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { userId: string; limit?: number; offset?: number },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // ==============================
  // BOT COMMAND EVENTS =====================================================================================================================================
  // ==============================

  // @On("bot.command.execute")
  // async handleBotCommandExecute(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody()
  //   payload: { command: string; args?: string[]; roomId?: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("bot.command.list")
  // async handleBotCommandList(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { category?: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("bot.command.help")
  // async handleBotCommandHelp(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { command: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("bot.command.suggest")
  // async handleBotCommandSuggest(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { input: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("bot.response.get")
  // async handleBotResponseGet(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { responseId: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("bot.interaction.button")
  // async handleBotInteractionButton(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody()
  //   payload: { messageId: string; buttonId: string; value?: any },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("bot.interaction.menu")
  // async handleBotInteractionMenu(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody()
  //   payload: { messageId: string; menuId: string; selectedOption: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("bot.settings.get")
  // async handleBotSettingsGet(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { botId?: string },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // @On("bot.settings.update")
  // async handleBotSettingsUpdate(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { botId: string; settings: Record<string, any> },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   // Implementation here
  // }

  // ==============================
  // ROOM EVENTS
  // ==============================

  @On("chat.room.create")
  async handleRoomCreate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody()
    payload: {
      name: string;
      description?: string;
      isPrivate?: boolean;
      members?: string[];
    },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.room.join")
  async handleRoomJoin(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; password?: string },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.room.leave")
  async handleRoomLeave(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.room.list")
  async handleRoomList(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { filter?: string; limit?: number },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.room.members.get")
  async handleRoomMembersGet(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.room.invite")
  async handleRoomInvite(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; userId: string },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.room.settings.update")
  async handleRoomSettingsUpdate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; settings: Record<string, any> },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.room.delete")
  async handleRoomDelete(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.room.member.kick")
  async handleRoomMemberKick(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; userId: string },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.room.member.ban")
  async handleRoomMemberBan(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; userId: string; reason?: string },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  @On("chat.room.member.role.update")
  async handleRoomMemberRoleUpdate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; userId: string; role: string },
    @Ack() ack: SocketEventCallback<any>
  ): Promise<void> {
    // Implementation here
  }

  // ==============================
  // LEGACY EVENTS (Deprecated - keep for backwards compatibility)
  // ==============================

  // /** @deprecated Use 'chat.global.message.send' instead */
  // @On('chat:sendGlobalMessage')
  // async legacySendGlobalMessage(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { content: string; messageType?: string; timestamp: number },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   return this.handleSendGlobalMessage(socket, payload, ack);
  // }

  // /** @deprecated Use 'chat.global.history.get' instead */
  // @On('chat:getGlobalHistory')
  // async legacyGetGlobalHistory(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { limit?: number; offset?: number },
  //   @Ack() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   return this.handleGetGlobalHistory(socket, payload, ack);
  // }

  // /** @deprecated Use 'chat.global.typing' instead */
  // @On('chat:globalTyping')
  // legacyGlobalTyping(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { isTyping: boolean }
  // ): void {
  //   return this.handleGlobalTyping(socket, payload);
  // }

  /** @deprecated Use 'chat.message.send' instead */

  // @On('sendMessage')
  // async sendMessage(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { room: string; text: string },
  //   @Ack<{ delivered: boolean }>() ack: SocketEventCallback<{ delivered: boolean }>
  // ) {
  //   try {
  //     const user = socket.data?.user;

  //     // Validate message
  //     if (!payload.text?.trim()) {
  //       return ack({ ok: false, error: 'Message cannot be empty' });
  //     }

  //     // Check message length
  //     const maxLength = socket.data?.chatCapabilities?.messageLimit || 100;
  //     if (payload.text.length > maxLength) {
  //       return ack({ ok: false, error: `Message too long. Max ${maxLength} characters.` });
  //     }

  //     // Increment message count for statistics
  //     socket.data.messageCount = (socket.data.messageCount || 0) + 1;

  //     // Create message object
  //     const messageData = {
  //       id: crypto.randomUUID(),
  //       userId: user.id,
  //       userName: user.name,
  //       cypherText: payload.text.trim(),
  //       room: payload.room,
  //       timestamp: new Date()
  //     };

  //     // ✅ STEP 1: Push to PERSISTENT QUEUE FIRST (đảm bảo message không bị mất)
  //     // Đây là điểm quan trọng nhất để đảm bảo tính toàn vẹn
  //     try {
  //       const jobId = await this.messageQueue.queueMessage({
  //         messageId: messageData.id,
  //         senderId: user.id,
  //         senderName: user.name,
  //         content: payload.text.trim(),
  //         channelId: payload.room,
  //         metadata: { socketId: socket.id, timestamp: Date.now() }
  //       });
  //     } catch (queueError: any) {
  //       // Nếu queue fail → Không broadcast, trả lỗi cho client
  //       this.logError('Failed to queue message', queueError, socket);
  //       return ack({
  //         ok: false,
  //         error: 'Failed to queue message for processing. Please try again.'
  //       });
  //     }

  //     // ✅ STEP 2: Broadcast realtime (CHỈ SAU KHI queue thành công)
  //     this.emitToRoom(payload.room, 'newMessage', messageData);

  //     // ✅ STEP 3: ACK to client (message đã được persist trong queue)
  //     ack({ ok: true, data: { delivered: true, messageId: messageData.id } });

  //     // External consumer sẽ xử lý async và lưu vào database
  //     // Nếu consumer fail → BullMQ sẽ retry 5 lần (đảm bảo tính toàn vẹn)
  //   } catch (error: any) {
  //     this.logError('Send message error', error, socket);
  //     ack({ ok: false, error: error.message || 'Failed to send message' });
  //   }
  // }

  // // Friend Management Events
  // @On('addFriend')
  // async handleAddFriend(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() data: { userName: string; friendName: string },
  //   @Ack<{ success: boolean; message?: string; friends?: string[] }>() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   try {
  //     this.logInfo(`Adding friend: ${data.userName} -> ${data.friendName}`, socket);

  //     const result = await this.chatService.addFriend(data.userName, data.friendName);

  //     if (result.success) {
  //       const friends = await this.chatService.getFriends(data.userName);
  //       ack({
  //         ok: true,
  //         data: {
  //           success: true,
  //           message: result.message,
  //           friends
  //         }
  //       });
  //     } else {
  //       ack({
  //         ok: false,
  //         error: result.message
  //       });
  //     }
  //   } catch (error: any) {
  //     this.logError('Error adding friend', error, socket);
  //     ack({
  //       ok: false,
  //       error: error.message || 'Failed to add friend'
  //     });
  //   }
  // }

  // @On('getFriends')
  // async handleGetFriends(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() data: { userName: string },
  //   @Ack<{ success: boolean; friends?: string[] }>() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   try {
  //     this.logInfo(`Getting friends for: ${data.userName}`, socket);

  //     const friends = await this.chatService.getFriends(data.userName);

  //     ack({
  //       ok: true,
  //       data: {
  //         success: true,
  //         friends
  //       }
  //     });
  //   } catch (error: any) {
  //     this.logError('Error getting friends', error, socket);
  //     ack({
  //       ok: false,
  //       error: error.message || 'Failed to get friends'
  //     });
  //   }
  // }

  // @On('removeFriend')
  // async handleRemoveFriend(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() data: { userName: string; friendName: string },
  //   @Ack<{ success: boolean; message?: string; friends?: string[] }>() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   try {
  //     this.logInfo(`Removing friend: ${data.userName} -> ${data.friendName}`, socket);

  //     const result = await this.chatService.removeFriend(data.userName, data.friendName);

  //     if (result.success) {
  //       const friends = await this.chatService.getFriends(data.userName);
  //       ack({
  //         ok: true,
  //         data: {
  //           success: true,
  //           message: result.message,
  //           friends
  //         }
  //       });
  //     } else {
  //       ack({
  //         ok: false,
  //         error: result.message
  //       });
  //     }
  //   } catch (error: any) {
  //     this.logError('Error removing friend', error, socket);
  //     ack({
  //       ok: false,
  //       error: error.message || 'Failed to remove friend'
  //     });
  //   }
  // }

  // @On('getUserInfo')
  // async handleGetUserInfo(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() data: { userName: string },
  //   @Ack<{ name: string; lastOnline: string } | null>() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   try {
  //     this.logInfo(`Getting user info: ${data.userName}`, socket);

  //     const userInfo = await this.chatService.getUserInfo(data.userName);

  //     if (userInfo) {
  //       ack({
  //         ok: true,
  //         data: userInfo
  //       });
  //     } else {
  //       ack({
  //         ok: false,
  //         error: 'User not found'
  //       });
  //     }
  //   } catch (error: any) {
  //     this.logError('Error getting user info', error, socket);
  //     ack({
  //       ok: false,
  //       error: error.message || 'Failed to get user info'
  //     });
  //   }
  // }

  // ==============================
  // GLOBAL CHAT EVENTS (Special case of room events)
  // ==============================

  // @On('chat.global.message.send')
  // async handleSendGlobalMessage(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { content: string; messageType?: string; timestamp: number },
  //   @Ack<{ success: boolean; message?: any }>() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   try {
  //     console.log('🌍📥 [BACKEND] Received global message request:', payload);
  //     console.log('🌍🔍 [BACKEND] Socket ID:', socket.id);
  //     console.log('🌍🔍 [BACKEND] socket.data:', socket.data);
  //     console.log('🌍🔍 [BACKEND] socket.handshake.auth:', socket.handshake.auth);

  //     let username = socket.data?.username;
  //     console.log('🌍👤 [BACKEND] Username from socket.data:', username);

  //     if (!username) {
  //       console.error('🌍❌ [BACKEND] No username in socket.data');
  //       console.error('🌍🔍 [BACKEND] Trying to get from handshake.auth...');

  //       // Try to get from handshake as fallback
  //       const fallbackUsername = socket.handshake.auth?.username;
  //       if (fallbackUsername) {
  //         console.log('🌍✅ [BACKEND] Found username in handshake.auth:', fallbackUsername);
  //         // Set it for future use
  //         username = fallbackUsername;
  //         socket.data.username = fallbackUsername;
  //         socket.data.user = { id: fallbackUsername, name: fallbackUsername };
  //       } else {
  //         console.error('🌍❌ [BACKEND] No username in handshake.auth either!');
  //         return ack({ ok: false, error: 'Not authenticated' });
  //       }
  //     }

  //     // Validate message
  //     if (!payload.content?.trim()) {
  //       return ack({ ok: false, error: 'Message cannot be empty' });
  //     }

  //     // Check message length
  //     const maxLength = 1000;
  //     if (payload.content.length > maxLength) {
  //       return ack({ ok: false, error: `Message too long. Max ${maxLength} characters.` });
  //     }

  //     // Create message object (username is now guaranteed to exist)
  //     const messageId = crypto.randomUUID();
  //     const messageData = {
  //       id: messageId,
  //       senderId: username,
  //       senderName: username,
  //       content: payload.content.trim(),
  //       timestamp: payload.timestamp || Date.now(),
  //       messageType: payload.messageType || 'text',
  //       channelId: 'global',
  //     };

  //     console.log('🌍✅ [BACKEND] Created message data:', messageData);

  //     // TODO: global channel dont need send to queue

  //     // ✅ STEP 1: Push to PERSISTENT QUEUE FIRST
  //     // Đảm bảo message được lưu vào Redis trước khi broadcast
  //     try {
  //       const jobId = await this.messageQueue.queueMessage({
  //         messageId: messageData.id,
  //         senderId: username,
  //         senderName: username,
  //         content: payload.content.trim(),
  //         channelId: 'global',
  //         metadata: {
  //           socketId: socket.id,
  //           messageType: payload.messageType || 'text',
  //           timestamp: payload.timestamp || Date.now()
  //         }
  //       });

  //       console.log(`🌍💾 [BACKEND] Message persisted to queue: ${messageId} (Job: ${jobId})`);
  //     } catch (queueError: any) {
  //       console.error('🌍❌ [BACKEND] Failed to queue message:', queueError);
  //       this.logError('Failed to queue global message', queueError, socket);
  //       return ack({
  //         ok: false,
  //         error: 'Failed to persist message. Please try again.'
  //       });
  //     }

  //     // ✅ STEP 2: Broadcast to all connected clients (AFTER queue success)
  //     if (this.ctx?.io) {
  //       const chatNamespace = this.ctx.io.of('/chat');
  //       const connectedSocketsCount = chatNamespace.sockets.size;
  //       console.log(`🌍📡 [BACKEND] Broadcasting to ${connectedSocketsCount} sockets in /chat namespace`);

  //       chatNamespace.emit('chat.global.message.new', {
  //         message: messageData,
  //       });

  //       console.log('🌍✅ [BACKEND] Broadcast complete');
  //     } else {
  //       console.error('🌍❌ [BACKEND] No io context available!');
  //     }

  //     // Log activity
  //     this.logInfo(`Global message sent by ${username}: "${payload.content}"`, socket);

  //     // ✅ STEP 3: ACK to client (message đã được persist)
  //     ack({
  //       ok: true,
  //       data: {
  //         success: true,
  //         message: messageData,
  //       },
  //     });

  //     console.log('🌍✅ [BACKEND] Acknowledgment sent to sender');
  //   } catch (error: any) {
  //     console.error('🌍❌ [BACKEND] Send global message error:', error);
  //     this.logError('Send global message error', error, socket);
  //     ack({
  //       ok: false,
  //       error: error.message || 'Failed to send global message',
  //     });
  //   }
  // }

  // @On('chat.global.history.get')
  // async handleGetGlobalHistory(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { limit?: number; offset?: number },
  //   @Ack<{ messages: any[]; hasMore: boolean; total: number }>() ack: SocketEventCallback<any>
  // ): Promise<void> {
  //   try {
  //     const username = socket.data?.username;
  //     if (!username) {
  //       return ack({ ok: false, error: 'Not authenticated' });
  //     }

  //     this.logInfo(`Getting global chat history for: ${username}`, socket);

  //     // For now, return empty history as we don't have persistence
  //     // In a real application, you would fetch from Redis/Database
  //     const messages: any[] = [];

  //     ack({
  //       ok: true,
  //       data: {
  //         messages,
  //         hasMore: false,
  //         total: 0,
  //       },
  //     });
  //   } catch (error: any) {
  //     this.logError('Get global history error', error, socket);
  //     ack({
  //       ok: false,
  //       error: error.message || 'Failed to get global history',
  //     });
  //   }
  // }

  // @On('chat.global.typing')
  // handleGlobalTyping(
  //   @ConnectedSocket() socket: AuthenticatedSocket,
  //   @MessageBody() payload: { isTyping: boolean }
  // ): void {
  //   try {
  //     const username = socket.data?.username;
  //     if (!username) {
  //       return;
  //     }

  //     // Broadcast typing indicator to all other clients
  //     socket.broadcast.emit('chat.global.typing', {
  //       userId: username,
  //       userName: username,
  //       isTyping: payload.isTyping,
  //     });

  //     this.logInfo(`Global typing: ${username} - ${payload.isTyping}`, socket);
  //   } catch (error: any) {
  //     this.logError('Global typing error', error, socket);
  //   }
  // }
}
