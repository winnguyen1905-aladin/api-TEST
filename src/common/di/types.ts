export const TYPES = {
  // Core Services
  MediaService: Symbol.for('MediaService'),
  RoomService: Symbol.for('RoomService'),
  TransportService: Symbol.for('TransportService'),
  CallService: Symbol.for('CallService'),
  ChatService: Symbol.for('ChatService'),
  FriendService: Symbol.for('FriendService'),
  MessageQueueService: Symbol.for('MessageQueueService'),

  // Interaction Services
  DetectionService: Symbol.for('DetectionService'),
  ARService: Symbol.for('ARService'),
  DrawingService: Symbol.for('DrawingService'),
  ScreenSharingService: Symbol.for('ScreenSharingService'),
  InteractionService: Symbol.for('InteractionService'),

  // Context
  ServerContext: Symbol.for('ServerContext'),
} as const;

export type ServiceTypes = typeof TYPES[keyof typeof TYPES];
