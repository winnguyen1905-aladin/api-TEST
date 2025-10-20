/**
 * Socket Events Type Definitions
 * Following naming convention: <domain>.<entity>.<action>[.<qualifier>]
 */

// ============================================================
// Common Types
// ============================================================

export interface SocketResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface Message {
  id: string;
  senderId: string;
  cypherText: string;
  contractId?: string;
  timestamp: number;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'AUDIO';
  replyToId?: string;
  isPinned?: boolean;
  reactions?: Array<{
    userId: string;
    reaction: string;
  }>;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: number;
  memberCount: number;
  settings?: Record<string, any>;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  profilePicture?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  lastActive?: Date;
}

// ============================================================
// MESSAGE EVENTS (chat.message.*)
// ============================================================

export namespace ChatMessageEvents {
  // chat.message.send
  export interface SendPayload {
    roomId: string;
    cypherText: string;
  }

  export interface SendResponse {
    delivered: boolean;
    messageId: string;
    timestamp: Date;
  }

  // chat.message.edit
  export interface EditPayload {
    messageId: string;
    content: string;
  }
  export interface EditResponse {
    messageId: string;
    updatedAt: number;
  }

  // chat.message.delete
  export interface DeletePayload {
    messageId: string;
  }

  // chat.message.react
  export interface ReactPayload {
    messageId: string;
    reaction: string;
  }
  export interface ReactResponse {
    messageId: string;
    reaction: string;
  }

  // chat.message.typing
  export interface TypingPayload {
    roomId: string;
    isTyping: boolean;
  }

  // chat.message.read
  export interface ReadPayload {
    messageId: string;
    roomId: string;
  }

  // chat.message.history.get
  export interface HistoryGetPayload {
    roomId: string;
    limit?: number;
    offset?: number;
    before?: string;
  }
  export interface HistoryGetResponse {
    messages: Message[];
    hasMore: boolean;
    total: number;
  }

  // chat.message.search
  export interface SearchPayload {
    query: string;
    roomId?: string;
    limit?: number;
  }
  export interface SearchResponse {
    messages: Message[];
    total: number;
  }

  // chat.message.pin
  export interface PinPayload {
    messageId: string;
    roomId: string;
  }

  // chat.message.unpin
  export interface UnpinPayload {
    messageId: string;
    roomId: string;
  }

  // chat.message.forward
  export interface ForwardPayload {
    messageId: string;
    targetRoomId: string;
  }
  export interface ForwardResponse {
    newMessageId: string;
  }

  // chat.message.reply
  export interface ReplyPayload {
    messageId: string;
    content: string;
    roomId: string;
  }
  export interface ReplyResponse {
    messageId: string;
    replyToId: string;
  }
}

// ============================================================
// DIRECT MESSAGE EVENTS (chat.direct.*)
// ============================================================

export namespace ChatDirectEvents {
  // chat.direct.message.send
  export interface MessageSendPayload {
    recipientId: string;
    content: string;
    type?: string;
  }
  export interface MessageSendResponse {
    messageId: string;
    conversationId: string;
  }

  // chat.direct.typing
  export interface TypingPayload {
    recipientId: string;
    isTyping: boolean;
  }

  // chat.direct.read
  export interface ReadPayload {
    conversationId: string;
    messageId: string;
  }

  // chat.direct.history.get
  export interface HistoryGetPayload {
    userId: string;
    limit?: number;
    offset?: number;
  }
  export interface HistoryGetResponse {
    messages: Message[];
    hasMore: boolean;
  }
}

// ============================================================
// ROOM EVENTS (chat.room.*)
// ============================================================

export namespace ChatRoomEvents {
  // chat.room.create
  export interface CreatePayload {
    name: string;
    description?: string;
    isPrivate?: boolean;
    members?: string[];
  }
  export interface CreateResponse {
    roomId: string;
    room: Room;
  }

  // chat.room.join
  export interface JoinPayload {
    roomId: string;
    password?: string;
  }
  export interface JoinResponse {
    room: Room;
    members: User[];
  }

  // chat.room.leave
  export interface LeavePayload {
    roomId: string;
  }

  // chat.room.list
  export interface ListPayload {
    filter?: string;
    limit?: number;
  }
  export interface ListResponse {
    rooms: Room[];
    total: number;
  }

  // chat.room.members.get
  export interface MembersGetPayload {
    roomId: string;
  }
  export interface MembersGetResponse {
    members: User[];
  }

  // chat.room.invite
  export interface InvitePayload {
    roomId: string;
    userId: string;
  }

  // chat.room.settings.update
  export interface SettingsUpdatePayload {
    roomId: string;
    settings: Record<string, any>;
  }
  export interface SettingsUpdateResponse {
    room: Room;
  }

  // chat.room.delete
  export interface DeletePayload {
    roomId: string;
  }

  // chat.room.member.kick
  export interface MemberKickPayload {
    roomId: string;
    userId: string;
  }

  // chat.room.member.ban
  export interface MemberBanPayload {
    roomId: string;
    userId: string;
    reason?: string;
  }

  // chat.room.member.role.update
  export interface MemberRoleUpdatePayload {
    roomId: string;
    userId: string;
    role: 'admin' | 'moderator' | 'member';
  }
}

// ============================================================
// GLOBAL CHAT EVENTS (chat.global.*)
// ============================================================

export namespace ChatGlobalEvents {
  // chat.global.message.send
  export interface MessageSendPayload {
    content: string;
    messageType?: string;
    timestamp: number;
  }
  export interface MessageSendResponse {
    success: boolean;
    message: Message;
  }

  // chat.global.history.get
  export interface HistoryGetPayload {
    limit?: number;
    offset?: number;
  }
  export interface HistoryGetResponse {
    messages: Message[];
    hasMore: boolean;
    total: number;
  }

  // chat.global.typing
  export interface TypingPayload {
    isTyping: boolean;
  }
}

// ============================================================
// BOT COMMAND EVENTS (bot.command.*)
// ============================================================

export namespace BotCommandEvents {
  export interface BotCommand {
    name: string;
    description: string;
    usage: string;
    category: string;
    examples?: string[];
  }

  // bot.command.execute
  export interface ExecutePayload {
    command: string;
    args?: string[];
    roomId?: string;
  }
  export interface ExecuteResponse {
    result: any;
    responseId: string;
  }

  // bot.command.list
  export interface ListPayload {
    category?: string;
  }
  export interface ListResponse {
    commands: BotCommand[];
  }

  // bot.command.help
  export interface HelpPayload {
    command: string;
  }
  export interface HelpResponse {
    command: string;
    description: string;
    usage: string;
    examples: string[];
  }

  // bot.command.suggest
  export interface SuggestPayload {
    input: string;
  }
  export interface SuggestResponse {
    suggestions: Array<{
      command: string;
      description: string;
    }>;
  }
}

// ============================================================
// BOT RESPONSE EVENTS (bot.response.*)
// ============================================================

export namespace BotResponseEvents {
  // bot.response.get
  export interface GetPayload {
    responseId: string;
  }
  export interface GetResponse {
    response: any;
    timestamp: number;
  }
}

// ============================================================
// BOT INTERACTION EVENTS (bot.interaction.*)
// ============================================================

export namespace BotInteractionEvents {
  // bot.interaction.button
  export interface ButtonPayload {
    messageId: string;
    buttonId: string;
    value?: any;
  }
  export interface ButtonResponse {
    result: any;
  }

  // bot.interaction.menu
  export interface MenuPayload {
    messageId: string;
    menuId: string;
    selectedOption: string;
  }
  export interface MenuResponse {
    result: any;
  }
}

// ============================================================
// BOT SETTINGS EVENTS (bot.settings.*)
// ============================================================

export namespace BotSettingsEvents {
  // bot.settings.get
  export interface GetPayload {
    botId?: string;
  }
  export interface GetResponse {
    settings: Record<string, any>;
  }

  // bot.settings.update
  export interface UpdatePayload {
    botId: string;
    settings: Record<string, any>;
  }
  export interface UpdateResponse {
    settings: Record<string, any>;
  }
}

// ============================================================
// SERVER EMITTED EVENTS
// ============================================================

export namespace ServerEmittedEvents {
  // chat.message.new
  export interface MessageNew {
    message: Message;
  }

  // chat.message.updated
  export interface MessageUpdated {
    messageId: string;
    content: string;
    updatedAt: number;
  }

  // chat.message.deleted
  export interface MessageDeleted {
    messageId: string;
    roomId: string;
  }

  // chat.message.reaction.added
  export interface MessageReactionAdded {
    messageId: string;
    userId: string;
    reaction: string;
  }

  // chat.global.message.new
  export interface GlobalMessageNew {
    message: Message;
  }

  // chat.global.typing
  export interface GlobalTyping {
    userId: string;
    userName: string;
    isTyping: boolean;
  }

  // chat.direct.message.new
  export interface DirectMessageNew {
    message: Message;
    conversationId: string;
  }

  // chat.room.member.joined
  export interface RoomMemberJoined {
    roomId: string;
    user: User;
  }

  // chat.room.member.left
  export interface RoomMemberLeft {
    roomId: string;
    userId: string;
  }

  // bot.response.ready
  export interface BotResponseReady {
    responseId: string;
    response: any;
  }

  // bot.command.result
  export interface BotCommandResult {
    command: string;
    result: any;
    success: boolean;
  }
}

// ============================================================
// EVENT NAME CONSTANTS
// ============================================================

export const SOCKET_EVENTS = {
  // Message events
  CHAT_MESSAGE_SEND: 'chat.message.send',
  CHAT_MESSAGE_EDIT: 'chat.message.edit',
  CHAT_MESSAGE_DELETE: 'chat.message.delete',
  CHAT_MESSAGE_REACT: 'chat.message.react',
  CHAT_MESSAGE_TYPING: 'chat.message.typing',
  CHAT_MESSAGE_READ: 'chat.message.read',
  CHAT_MESSAGE_HISTORY_GET: 'chat.message.history.get',
  CHAT_MESSAGE_SEARCH: 'chat.message.search',
  CHAT_MESSAGE_PIN: 'chat.message.pin',
  CHAT_MESSAGE_UNPIN: 'chat.message.unpin',
  CHAT_MESSAGE_FORWARD: 'chat.message.forward',
  CHAT_MESSAGE_REPLY: 'chat.message.reply',

  // Direct message events
  CHAT_DIRECT_MESSAGE_SEND: 'chat.direct.message.send',
  CHAT_DIRECT_TYPING: 'chat.direct.typing',
  CHAT_DIRECT_READ: 'chat.direct.read',
  CHAT_DIRECT_HISTORY_GET: 'chat.direct.history.get',

  // Room events
  CHAT_ROOM_CREATE: 'chat.room.create',
  CHAT_ROOM_JOIN: 'chat.room.join',
  CHAT_ROOM_LEAVE: 'chat.room.leave',
  CHAT_ROOM_LIST: 'chat.room.list',
  CHAT_ROOM_MEMBERS_GET: 'chat.room.members.get',
  CHAT_ROOM_INVITE: 'chat.room.invite',
  CHAT_ROOM_SETTINGS_UPDATE: 'chat.room.settings.update',
  CHAT_ROOM_DELETE: 'chat.room.delete',
  CHAT_ROOM_MEMBER_KICK: 'chat.room.member.kick',
  CHAT_ROOM_MEMBER_BAN: 'chat.room.member.ban',
  CHAT_ROOM_MEMBER_ROLE_UPDATE: 'chat.room.member.role.update',

  // Global chat events
  CHAT_GLOBAL_MESSAGE_SEND: 'chat.global.message.send',
  CHAT_GLOBAL_HISTORY_GET: 'chat.global.history.get',
  CHAT_GLOBAL_TYPING: 'chat.global.typing',

  // Bot command events
  BOT_COMMAND_EXECUTE: 'bot.command.execute',
  BOT_COMMAND_LIST: 'bot.command.list',
  BOT_COMMAND_HELP: 'bot.command.help',
  BOT_COMMAND_SUGGEST: 'bot.command.suggest',

  // Bot response events
  BOT_RESPONSE_GET: 'bot.response.get',

  // Bot interaction events
  BOT_INTERACTION_BUTTON: 'bot.interaction.button',
  BOT_INTERACTION_MENU: 'bot.interaction.menu',

  // Bot settings events
  BOT_SETTINGS_GET: 'bot.settings.get',
  BOT_SETTINGS_UPDATE: 'bot.settings.update',

  // Server emitted events
  CHAT_MESSAGE_NEW: 'chat.message.new',
  CHAT_MESSAGE_UPDATED: 'chat.message.updated',
  CHAT_MESSAGE_DELETED: 'chat.message.deleted',
  CHAT_MESSAGE_REACTION_ADDED: 'chat.message.reaction.added',
  CHAT_GLOBAL_MESSAGE_NEW: 'chat.global.message.new',
  CHAT_GLOBAL_TYPING_BROADCAST: 'chat.global.typing',
  CHAT_DIRECT_MESSAGE_NEW: 'chat.direct.message.new',
  CHAT_ROOM_MEMBER_JOINED: 'chat.room.member.joined',
  CHAT_ROOM_MEMBER_LEFT: 'chat.room.member.left',
  BOT_RESPONSE_READY: 'bot.response.ready',
  BOT_COMMAND_RESULT: 'bot.command.result',
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

