# Socket Events Quick Reference

## Event Naming Convention
`<domain>.<entity>.<action>[.<qualifier>]`

---

## Chat Domain Events

### Messages (`chat.message.*`)
```
chat.message.send              → Send message to room
chat.message.edit              → Edit message
chat.message.delete            → Delete message
chat.message.react             → Add reaction
chat.message.typing            → Typing indicator
chat.message.read              → Mark as read
chat.message.history.get       → Get history
chat.message.search            → Search messages
chat.message.pin               → Pin message
chat.message.unpin             → Unpin message
chat.message.forward           → Forward message
chat.message.reply             → Reply to message
```

### Direct Messages (`chat.direct.*`)
```
chat.direct.message.send       → Send DM
chat.direct.typing             → DM typing
chat.direct.read               → Mark DM as read
chat.direct.history.get        → Get DM history
```

### Rooms (`chat.room.*`)
```
chat.room.create               → Create room
chat.room.join                 → Join room
chat.room.leave                → Leave room
chat.room.list                 → List rooms
chat.room.members.get          → Get members
chat.room.invite               → Invite user
chat.room.settings.update      → Update settings
chat.room.delete               → Delete room
chat.room.member.kick          → Kick member
chat.room.member.ban           → Ban member
chat.room.member.role.update   → Update role
```

### Global Chat (`chat.global.*`)
```
chat.global.message.send       → Send global message
chat.global.history.get        → Get global history
chat.global.typing             → Global typing
```

---

## Bot Domain Events

### Commands (`bot.command.*`)
```
bot.command.execute            → Execute command
bot.command.list               → List commands
bot.command.help               → Get command help
bot.command.suggest            → Get suggestions
```

### Responses (`bot.response.*`)
```
bot.response.get               → Get bot response
```

### Interactions (`bot.interaction.*`)
```
bot.interaction.button         → Button click
bot.interaction.menu           → Menu selection
```

### Settings (`bot.settings.*`)
```
bot.settings.get               → Get settings
bot.settings.update            → Update settings
```

---

## Server → Client Events (Emitted)

### Message Events
```
chat.message.new               → New message received
chat.message.updated           → Message edited
chat.message.deleted           → Message deleted
chat.message.reaction.added    → Reaction added
```

### Global Chat Events
```
chat.global.message.new        → New global message
chat.global.typing             → User typing globally
```

### Direct Message Events
```
chat.direct.message.new        → New DM received
```

### Room Events
```
chat.room.member.joined        → User joined room
chat.room.member.left          → User left room
```

### Bot Events
```
bot.response.ready             → Bot response ready
bot.command.result             → Command result
```

---

## Standard Response Format

All events with acknowledgment follow this format:

```typescript
{
  ok: boolean;
  data?: any;      // Success data
  error?: string;  // Error message if ok is false
}
```

---

## Event Categories by Use Case

### Real-time Messaging
- `chat.message.send`
- `chat.message.new` (emitted)
- `chat.message.typing`

### Message Management
- `chat.message.edit`
- `chat.message.delete`
- `chat.message.pin`
- `chat.message.search`

### Room Management
- `chat.room.create`
- `chat.room.join`
- `chat.room.leave`
- `chat.room.members.get`

### Bot Integration
- `bot.command.execute`
- `bot.command.list`
- `bot.interaction.button`
- `bot.interaction.menu`

### Direct Communication
- `chat.direct.message.send`
- `chat.direct.typing`
- `chat.direct.history.get`

---

## Migration from Legacy Events

| Legacy Event | New Event |
|-------------|-----------|
| `sendMessage` | `chat.message.send` |
| `chat:sendGlobalMessage` | `chat.global.message.send` |
| `chat:getGlobalHistory` | `chat.global.history.get` |
| `chat:globalTyping` | `chat.global.typing` |
| `chat:globalNewMessage` | `chat.global.message.new` |

---

## Event Flow Examples

### Sending a Message
```
Client                          Server                          Other Clients
  |                               |                                    |
  |--chat.message.send----------->|                                    |
  |                               |--Validate & Queue                  |
  |<-----ACK {ok: true}-----------|                                    |
  |                               |--chat.message.new----------------->|
  |                               |                                    |
```

### Executing a Bot Command
```
Client                          Server                          Bot Service
  |                               |                                    |
  |--bot.command.execute--------->|                                    |
  |                               |--Process command------------------>|
  |                               |<--Response-------------------------|
  |<-----ACK {ok: true}-----------|                                    |
  |<--bot.response.ready----------|                                    |
  |                               |                                    |
```

### Joining a Room
```
Client                          Server                          Room Members
  |                               |                                    |
  |--chat.room.join-------------->|                                    |
  |                               |--Add to room                       |
  |<-----ACK {ok: true}-----------|                                    |
  |                               |--chat.room.member.joined---------->|
  |                               |                                    |
```

---

## Error Codes

Common error scenarios:

- **Authentication**: `Not authenticated`
- **Validation**: `Message cannot be empty`, `Message too long`
- **Authorization**: `Permission denied`, `Not room member`
- **Not Found**: `Room not found`, `User not found`
- **Rate Limiting**: `Too many requests`

---

## Best Practices

✅ **DO:**
- Use typed payloads and responses
- Handle acknowledgment callbacks
- Check `ok` field in responses
- Follow naming conventions

❌ **DON'T:**
- Mix legacy and new event names
- Emit events without proper validation
- Ignore error responses
- Skip acknowledgment callbacks

---

## Quick Start

```typescript
// Import socket client
import io from 'socket.io-client';

// Connect to namespace
const socket = io('http://localhost:3000/chat', {
  auth: { token: 'your-jwt-token' }
});

// Send a message
socket.emit('chat.message.send', {
  roomId: 'general',
  content: 'Hello!'
}, (response) => {
  console.log(response.ok ? 'Sent!' : response.error);
});

// Listen for new messages
socket.on('chat.message.new', (data) => {
  console.log('New message:', data.message);
});

// Execute bot command
socket.emit('bot.command.execute', {
  command: 'help'
}, (response) => {
  console.log('Bot response:', response.data);
});
```

