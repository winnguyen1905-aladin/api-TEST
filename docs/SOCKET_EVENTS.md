# Socket Events Documentation

## Naming Convention

All socket events follow the pattern: `<domain>.<entity>.<action>[.<qualifier>]`

**Examples:**
- `chat.message.send` - Chat domain, message entity, send action
- `bot.command.execute` - Bot domain, command entity, execute action
- `chat.message.history.get` - Chat domain, message entity, history action, get qualifier

---

## Chat Gateway Events

### Message Events (`chat.message.*`)

#### `chat.message.send`
Send a message to a chat room.

**Payload:**
```typescript
{
  roomId: string;
  content: string;
  type?: string;  // 'text' | 'image' | 'file' | etc.
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    messageId: string;
    timestamp: number;
  };
  error?: string;
}
```

---

#### `chat.message.edit`
Edit an existing message.

**Payload:**
```typescript
{
  messageId: string;
  content: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    messageId: string;
    updatedAt: number;
  };
  error?: string;
}
```

---

#### `chat.message.delete`
Delete a message.

**Payload:**
```typescript
{
  messageId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  error?: string;
}
```

---

#### `chat.message.react`
React to a message with an emoji.

**Payload:**
```typescript
{
  messageId: string;
  reaction: string;  // emoji string
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    messageId: string;
    reaction: string;
  };
  error?: string;
}
```

---

#### `chat.message.typing`
Send typing indicator to a room.

**Payload:**
```typescript
{
  roomId: string;
  isTyping: boolean;
}
```

**Note:** No acknowledgment response.

---

#### `chat.message.read`
Mark a message as read.

**Payload:**
```typescript
{
  messageId: string;
  roomId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  error?: string;
}
```

---

#### `chat.message.history.get`
Get message history for a room.

**Payload:**
```typescript
{
  roomId: string;
  limit?: number;     // default: 50
  offset?: number;    // default: 0
  before?: string;    // messageId to fetch messages before
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    messages: Array<Message>;
    hasMore: boolean;
    total: number;
  };
  error?: string;
}
```

---

#### `chat.message.search`
Search messages.

**Payload:**
```typescript
{
  query: string;
  roomId?: string;   // optional room filter
  limit?: number;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    messages: Array<Message>;
    total: number;
  };
  error?: string;
}
```

---

#### `chat.message.pin`
Pin a message in a room.

**Payload:**
```typescript
{
  messageId: string;
  roomId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  error?: string;
}
```

---

#### `chat.message.unpin`
Unpin a message from a room.

**Payload:**
```typescript
{
  messageId: string;
  roomId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  error?: string;
}
```

---

#### `chat.message.forward`
Forward a message to another room.

**Payload:**
```typescript
{
  messageId: string;
  targetRoomId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    newMessageId: string;
  };
  error?: string;
}
```

---

#### `chat.message.reply`
Reply to a message.

**Payload:**
```typescript
{
  messageId: string;  // message being replied to
  content: string;
  roomId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    messageId: string;
    replyToId: string;
  };
  error?: string;
}
```

---

### Direct Message Events (`chat.direct.*`)

#### `chat.direct.message.send`
Send a direct message to a user.

**Payload:**
```typescript
{
  recipientId: string;
  content: string;
  type?: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    messageId: string;
    conversationId: string;
  };
  error?: string;
}
```

---

#### `chat.direct.typing`
Send typing indicator in direct message.

**Payload:**
```typescript
{
  recipientId: string;
  isTyping: boolean;
}
```

**Note:** No acknowledgment response.

---

#### `chat.direct.read`
Mark direct message as read.

**Payload:**
```typescript
{
  conversationId: string;
  messageId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  error?: string;
}
```

---

#### `chat.direct.history.get`
Get direct message history with a user.

**Payload:**
```typescript
{
  userId: string;
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    messages: Array<Message>;
    hasMore: boolean;
  };
  error?: string;
}
```

---

### Room Events (`chat.room.*`)

#### `chat.room.create`
Create a new chat room.

**Payload:**
```typescript
{
  name: string;
  description?: string;
  isPrivate?: boolean;
  members?: string[];  // user IDs
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    roomId: string;
    room: Room;
  };
  error?: string;
}
```

---

#### `chat.room.join`
Join a chat room.

**Payload:**
```typescript
{
  roomId: string;
  password?: string;  // if room is password protected
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    room: Room;
    members: Array<User>;
  };
  error?: string;
}
```

---

#### `chat.room.leave`
Leave a chat room.

**Payload:**
```typescript
{
  roomId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  error?: string;
}
```

---

#### `chat.room.list`
List available chat rooms.

**Payload:**
```typescript
{
  filter?: string;   // search filter
  limit?: number;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    rooms: Array<Room>;
    total: number;
  };
  error?: string;
}
```

---

#### `chat.room.members.get`
Get members of a room.

**Payload:**
```typescript
{
  roomId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    members: Array<User>;
  };
  error?: string;
}
```

---

#### `chat.room.invite`
Invite a user to a room.

**Payload:**
```typescript
{
  roomId: string;
  userId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  error?: string;
}
```

---

#### `chat.room.settings.update`
Update room settings.

**Payload:**
```typescript
{
  roomId: string;
  settings: {
    name?: string;
    description?: string;
    isPrivate?: boolean;
    password?: string;
  };
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    room: Room;
  };
  error?: string;
}
```

---

#### `chat.room.delete`
Delete a room (admin/owner only).

**Payload:**
```typescript
{
  roomId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  error?: string;
}
```

---

#### `chat.room.member.kick`
Kick a member from the room.

**Payload:**
```typescript
{
  roomId: string;
  userId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  error?: string;
}
```

---

#### `chat.room.member.ban`
Ban a member from the room.

**Payload:**
```typescript
{
  roomId: string;
  userId: string;
  reason?: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  error?: string;
}
```

---

#### `chat.room.member.role.update`
Update a member's role in the room.

**Payload:**
```typescript
{
  roomId: string;
  userId: string;
  role: 'admin' | 'moderator' | 'member';
}
```

**Response:**
```typescript
{
  ok: boolean;
  error?: string;
}
```

---

### Global Chat Events (`chat.global.*`)

#### `chat.global.message.send`
Send a message to global chat.

**Payload:**
```typescript
{
  content: string;
  messageType?: string;
  timestamp: number;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    success: boolean;
    message: Message;
  };
  error?: string;
}
```

---

#### `chat.global.history.get`
Get global chat history.

**Payload:**
```typescript
{
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    messages: Array<Message>;
    hasMore: boolean;
    total: number;
  };
  error?: string;
}
```

---

#### `chat.global.typing`
Send typing indicator to global chat.

**Payload:**
```typescript
{
  isTyping: boolean;
}
```

**Note:** No acknowledgment response.

---

## Bot Command Events

### Command Events (`bot.command.*`)

#### `bot.command.execute`
Execute a bot command.

**Payload:**
```typescript
{
  command: string;       // e.g., 'help', 'weather', 'translate'
  args?: string[];       // command arguments
  roomId?: string;       // optional room context
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    result: any;
    responseId: string;
  };
  error?: string;
}
```

---

#### `bot.command.list`
List available bot commands.

**Payload:**
```typescript
{
  category?: string;  // filter by category
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    commands: Array<{
      name: string;
      description: string;
      usage: string;
      category: string;
    }>;
  };
  error?: string;
}
```

---

#### `bot.command.help`
Get help for a specific command.

**Payload:**
```typescript
{
  command: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    command: string;
    description: string;
    usage: string;
    examples: string[];
  };
  error?: string;
}
```

---

#### `bot.command.suggest`
Get command suggestions based on input.

**Payload:**
```typescript
{
  input: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    suggestions: Array<{
      command: string;
      description: string;
    }>;
  };
  error?: string;
}
```

---

### Response Events (`bot.response.*`)

#### `bot.response.get`
Get a bot response by ID.

**Payload:**
```typescript
{
  responseId: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    response: any;
    timestamp: number;
  };
  error?: string;
}
```

---

### Interaction Events (`bot.interaction.*`)

#### `bot.interaction.button`
Handle button interaction from bot message.

**Payload:**
```typescript
{
  messageId: string;
  buttonId: string;
  value?: any;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    result: any;
  };
  error?: string;
}
```

---

#### `bot.interaction.menu`
Handle menu selection from bot message.

**Payload:**
```typescript
{
  messageId: string;
  menuId: string;
  selectedOption: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    result: any;
  };
  error?: string;
}
```

---

### Settings Events (`bot.settings.*`)

#### `bot.settings.get`
Get bot settings.

**Payload:**
```typescript
{
  botId?: string;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    settings: Record<string, any>;
  };
  error?: string;
}
```

---

#### `bot.settings.update`
Update bot settings.

**Payload:**
```typescript
{
  botId: string;
  settings: Record<string, any>;
}
```

**Response:**
```typescript
{
  ok: boolean;
  data?: {
    settings: Record<string, any>;
  };
  error?: string;
}
```

---

## Server-Emitted Events

These events are emitted by the server to clients:

### Message Events

- **`chat.message.new`** - New message received
  ```typescript
  {
    message: Message;
  }
  ```

- **`chat.message.updated`** - Message was edited
  ```typescript
  {
    messageId: string;
    content: string;
    updatedAt: number;
  }
  ```

- **`chat.message.deleted`** - Message was deleted
  ```typescript
  {
    messageId: string;
    roomId: string;
  }
  ```

- **`chat.message.reaction.added`** - Reaction added to message
  ```typescript
  {
    messageId: string;
    userId: string;
    reaction: string;
  }
  ```

### Global Chat Events

- **`chat.global.message.new`** - New global message
  ```typescript
  {
    message: Message;
  }
  ```

- **`chat.global.typing`** - User typing in global chat
  ```typescript
  {
    userId: string;
    userName: string;
    isTyping: boolean;
  }
  ```

### Direct Message Events

- **`chat.direct.message.new`** - New direct message
  ```typescript
  {
    message: Message;
    conversationId: string;
  }
  ```

### Room Events

- **`chat.room.member.joined`** - User joined room
  ```typescript
  {
    roomId: string;
    user: User;
  }
  ```

- **`chat.room.member.left`** - User left room
  ```typescript
  {
    roomId: string;
    userId: string;
  }
  ```

### Bot Events

- **`bot.response.ready`** - Bot response ready
  ```typescript
  {
    responseId: string;
    response: any;
  }
  ```

- **`bot.command.result`** - Command execution result
  ```typescript
  {
    command: string;
    result: any;
    success: boolean;
  }
  ```

---

## Legacy Events (Deprecated)

The following events are deprecated but maintained for backwards compatibility:

- `sendMessage` → Use `chat.message.send`
- `chat:sendGlobalMessage` → Use `chat.global.message.send`
- `chat:getGlobalHistory` → Use `chat.global.history.get`
- `chat:globalTyping` → Use `chat.global.typing`
- `addFriend` → Use appropriate friend management events
- `getFriends` → Use appropriate friend management events
- `removeFriend` → Use appropriate friend management events
- `getUserInfo` → Use appropriate user management events

---

## Best Practices

1. **Always handle acknowledgments**: Most events expect an acknowledgment callback
2. **Error handling**: Always check the `ok` field in responses
3. **Type safety**: Use TypeScript interfaces for payloads and responses
4. **Event naming**: Follow the `<domain>.<entity>.<action>[.<qualifier>]` convention
5. **Backwards compatibility**: Support legacy events during migration period

---

## Migration Guide

When migrating from legacy events to the new naming convention:

1. Update client-side event emitters to use new event names
2. Update server-side event listeners
3. Update any event name constants or enums
4. Test both old and new events during transition
5. Deprecate old events after full migration
6. Remove legacy event handlers in next major version

---

## Example Usage

### Client-side (TypeScript)

```typescript
// Send a message
socket.emit('chat.message.send', {
  roomId: 'room-123',
  content: 'Hello, world!',
  type: 'text'
}, (response) => {
  if (response.ok) {
    console.log('Message sent:', response.data.messageId);
  } else {
    console.error('Error:', response.error);
  }
});

// Listen for new messages
socket.on('chat.message.new', (data) => {
  console.log('New message:', data.message);
});

// Execute bot command
socket.emit('bot.command.execute', {
  command: 'weather',
  args: ['New York']
}, (response) => {
  if (response.ok) {
    console.log('Weather:', response.data.result);
  }
});
```

### Server-side (TypeScript)

```typescript
@On('chat.message.send')
async handleMessageSend(
  @ConnectedSocket() socket: AuthenticatedSocket,
  @MessageBody() payload: { roomId: string; content: string; type?: string },
  @Ack() ack: SocketEventCallback<any>
): Promise<void> {
  // Implementation
  ack({ ok: true, data: { messageId: '...' } });
}
```

