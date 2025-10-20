# Socket Events Architecture Diagram

## Event Naming Convention

```
┌─────────────────────────────────────────────────────────┐
│        <domain>.<entity>.<action>[.<qualifier>]         │
│                                                          │
│  domain    → chat, bot                                  │
│  entity    → message, room, direct, global, command     │
│  action    → send, get, delete, edit, execute           │
│  qualifier → history, list, settings (optional)         │
└─────────────────────────────────────────────────────────┘
```

## Event Hierarchy

```
Socket Events
│
├── chat (domain)
│   ├── message (entity)
│   │   ├── send
│   │   ├── edit
│   │   ├── delete
│   │   ├── react
│   │   ├── typing
│   │   ├── read
│   │   ├── pin
│   │   ├── unpin
│   │   ├── forward
│   │   ├── reply
│   │   ├── search
│   │   └── history
│   │       └── get
│   │
│   ├── direct (entity)
│   │   ├── message
│   │   │   └── send
│   │   ├── typing
│   │   ├── read
│   │   └── history
│   │       └── get
│   │
│   ├── room (entity)
│   │   ├── create
│   │   ├── join
│   │   ├── leave
│   │   ├── list
│   │   ├── delete
│   │   ├── invite
│   │   ├── members
│   │   │   └── get
│   │   ├── settings
│   │   │   └── update
│   │   └── member
│   │       ├── kick
│   │       ├── ban
│   │       └── role
│   │           └── update
│   │
│   └── global (entity)
│       ├── message
│       │   └── send
│       ├── typing
│       └── history
│           └── get
│
└── bot (domain)
    ├── command (entity)
    │   ├── execute
    │   ├── list
    │   ├── help
    │   └── suggest
    │
    ├── response (entity)
    │   └── get
    │
    ├── interaction (entity)
    │   ├── button
    │   └── menu
    │
    └── settings (entity)
        ├── get
        └── update
```

## Event Flow Diagrams

### Message Sending Flow

```
┌─────────┐                      ┌─────────┐                      ┌─────────┐
│         │  chat.message.send   │         │  Validate & Queue    │ Message │
│ Client  │─────────────────────>│ Server  │─────────────────────>│  Queue  │
│         │                      │         │                      │ (Redis) │
└─────────┘                      └─────────┘                      └─────────┘
     │                                │                                 │
     │         ACK {ok: true}         │                                 │
     │<───────────────────────────────┤                                 │
     │                                │                                 │
     │      chat.message.new          │     External Consumer           │
     │<───────────────────────────────┤<────────────────────────────────┘
     │    (broadcast to room)         │      (process & save)
```

### Bot Command Flow

```
┌─────────┐                      ┌─────────┐                      ┌─────────┐
│         │  bot.command.execute │         │  Process Command     │   Bot   │
│ Client  │─────────────────────>│ Server  │─────────────────────>│ Service │
│         │                      │         │                      │         │
└─────────┘                      └─────────┘                      └─────────┘
     │                                │                                 │
     │                                │<────────────────────────────────┤
     │                                │         Response                 │
     │         ACK {ok: true}         │                                 │
     │<───────────────────────────────┤                                 │
     │                                │                                 │
     │    bot.response.ready          │                                 │
     │<───────────────────────────────┤                                 │
```

### Room Join Flow

```
┌─────────┐                      ┌─────────┐                      ┌──────────┐
│         │   chat.room.join     │         │  Validate & Add      │   Room   │
│ Client  │─────────────────────>│ Server  │─────────────────────>│  Store   │
│         │                      │         │                      │ (Memory) │
└─────────┘                      └─────────┘                      └──────────┘
     │                                │                                 │
     │         ACK {ok: true}         │                                 │
     │<───────────────────────────────┤                                 │
     │     (room + members data)      │                                 │
     │                                │                                 │
     │ chat.room.member.joined        │                                 │
     │<───────────────────────────────┤                                 │
     │   (broadcast to room)          │                                 │
```

### Direct Message Flow

```
┌───────────┐               ┌─────────┐               ┌───────────┐
│           │ chat.direct   │         │ chat.direct   │           │
│ Client A  │ .message.send │ Server  │ .message.new  │ Client B  │
│ (Sender)  │──────────────>│         │──────────────>│(Recipient)│
│           │               │         │               │           │
└───────────┘               └─────────┘               └───────────┘
     │                           │
     │    ACK {ok: true}         │
     │<──────────────────────────┤
```

## Event Categories by Use Case

```
┌─────────────────────────────────────────────────────────────┐
│                    REAL-TIME MESSAGING                      │
├─────────────────────────────────────────────────────────────┤
│ • chat.message.send          → Send message                 │
│ • chat.message.new           → Receive message (emitted)    │
│ • chat.message.typing        → Typing indicator             │
│ • chat.direct.message.send   → Send DM                      │
│ • chat.global.message.send   → Send to global chat          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   MESSAGE MANAGEMENT                         │
├─────────────────────────────────────────────────────────────┤
│ • chat.message.edit          → Edit message                 │
│ • chat.message.delete        → Delete message               │
│ • chat.message.pin           → Pin important message        │
│ • chat.message.search        → Search messages              │
│ • chat.message.history.get   → Load message history         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ROOM MANAGEMENT                           │
├─────────────────────────────────────────────────────────────┤
│ • chat.room.create           → Create new room              │
│ • chat.room.join             → Join room                    │
│ • chat.room.leave            → Leave room                   │
│ • chat.room.list             → Browse rooms                 │
│ • chat.room.members.get      → Get room members             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    BOT INTEGRATION                           │
├─────────────────────────────────────────────────────────────┤
│ • bot.command.execute        → Run bot command              │
│ • bot.command.list           → See available commands       │
│ • bot.interaction.button     → Click bot button             │
│ • bot.interaction.menu       → Select bot menu option       │
└─────────────────────────────────────────────────────────────┘
```

## Client-Server Event Matrix

```
┌──────────────────────────┬─────────────┬─────────────┬─────────────┐
│      Event Type          │   Client    │   Server    │   Pattern   │
│                          │  → Server   │  → Client   │             │
├──────────────────────────┼─────────────┼─────────────┼─────────────┤
│ Send Message             │     ✓       │             │   Request   │
│ Receive Message          │             │      ✓      │   Emitted   │
│ Edit Message             │     ✓       │             │   Request   │
│ Message Updated          │             │      ✓      │   Emitted   │
│ Delete Message           │     ✓       │             │   Request   │
│ Message Deleted          │             │      ✓      │   Emitted   │
│ Typing Indicator         │     ✓       │      ✓      │   Broadcast │
│ Read Receipt             │     ✓       │             │   Request   │
│ Join Room                │     ✓       │             │   Request   │
│ Member Joined            │             │      ✓      │   Emitted   │
│ Execute Bot Command      │     ✓       │             │   Request   │
│ Bot Response             │             │      ✓      │   Emitted   │
└──────────────────────────┴─────────────┴─────────────┴─────────────┘
```

## Domain Boundaries

```
┌───────────────────────────────────────────────────────────────┐
│                        CHAT DOMAIN                            │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Messages   │  │    Rooms     │  │    Direct    │       │
│  │              │  │              │  │              │       │
│  │ • send       │  │ • create     │  │ • send       │       │
│  │ • edit       │  │ • join       │  │ • typing     │       │
│  │ • delete     │  │ • leave      │  │ • read       │       │
│  │ • react      │  │ • members    │  │ • history    │       │
│  │ • typing     │  │ • settings   │  │              │       │
│  │ • history    │  │ • invite     │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐                                            │
│  │    Global    │                                            │
│  │              │                                            │
│  │ • send       │                                            │
│  │ • typing     │                                            │
│  │ • history    │                                            │
│  └──────────────┘                                            │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                         BOT DOMAIN                            │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Commands   │  │ Interactions │  │   Settings   │       │
│  │              │  │              │  │              │       │
│  │ • execute    │  │ • button     │  │ • get        │       │
│  │ • list       │  │ • menu       │  │ • update     │       │
│  │ • help       │  │              │  │              │       │
│  │ • suggest    │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐                                            │
│  │  Responses   │                                            │
│  │              │                                            │
│  │ • get        │                                            │
│  └──────────────┘                                            │
└───────────────────────────────────────────────────────────────┘
```

## Message Lifecycle

```
┌────────────┐
│   Create   │  chat.message.send
└─────┬──────┘
      │
      ▼
┌────────────┐
│   Queued   │  → Redis Queue
└─────┬──────┘
      │
      ▼
┌────────────┐
│ Broadcast  │  → chat.message.new (to room)
└─────┬──────┘
      │
      ▼
┌────────────┐
│  Persist   │  → Database (async consumer)
└─────┬──────┘
      │
      ├──────────────┐
      │              │
      ▼              ▼
┌────────────┐  ┌────────────┐
│    Edit    │  │   Delete   │  chat.message.edit/delete
└────────────┘  └────────────┘
      │              │
      ▼              ▼
┌────────────┐  ┌────────────┐
│  Updated   │  │  Removed   │  chat.message.updated/deleted
└────────────┘  └────────────┘
```

## Authentication & Authorization Flow

```
┌─────────┐                      ┌─────────┐
│         │   connect (+ JWT)    │         │
│ Client  │─────────────────────>│ Server  │
│         │                      │         │
└─────────┘                      └─────────┘
     │                                │
     │                                │ Validate JWT
     │                                │
     │     Connection Ready           │
     │<───────────────────────────────┤
     │                                │
     │   chat.message.send            │
     │───────────────────────────────>│
     │                                │ Check permissions
     │                                │ Validate room access
     │                                │
     │         ACK {ok: true}         │
     │<───────────────────────────────┤
```

## Error Handling Pattern

```
┌─────────┐                      ┌─────────┐
│         │   Event + Payload    │         │
│ Client  │─────────────────────>│ Server  │
│         │                      │         │
└─────────┘                      └─────────┘
     │                                │
     │                                ├─ Validation Error
     │         ┌──────────────────────┤
     │         │                      ├─ Auth Error
     │         │      ┌───────────────┤
     │         │      │               ├─ Business Logic Error
     │         │      │     ┌─────────┤
     │         │      │     │         │
     │         ▼      ▼     ▼         │
     │   ┌──────────────────────┐    │
     │   │  ACK {ok: false}     │    │
     │<──┤  error: "message"    │────┘
     │   └──────────────────────┘
     │
     │   Handle Error
     └─> Display to User
```

## Scalability Considerations

```
┌──────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
└────────────┬──────────────┬──────────────┬──────────────┘
             │              │              │
    ┌────────▼───────┐ ┌───▼──────────┐ ┌─▼──────────────┐
    │  Server Node 1 │ │ Server Node 2│ │ Server Node N  │
    │                │ │              │ │                │
    │ Socket.IO      │ │ Socket.IO    │ │ Socket.IO      │
    └────────┬───────┘ └───┬──────────┘ └─┬──────────────┘
             │              │              │
             └──────────────┴──────────────┘
                           │
                    ┌──────▼───────┐
                    │ Redis Adapter│ → Event synchronization
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Message Queue│ → Persistent storage
                    └──────────────┘
```

---

This diagram provides a comprehensive visual overview of the socket events architecture, showing hierarchy, flow, and relationships between different event types.

