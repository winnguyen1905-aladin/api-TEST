import 'reflect-metadata';
import { ServerContext } from '..';
import { container, TYPES } from './container';

// Import all services to register them
import { DetectionService } from '@/modules/interaction/service/detection.service';
import { ARService } from '@/modules/interaction/service/ar.service';
import { DrawingService } from '@/modules/interaction/service/drawing.service';
import { ScreenSharingService } from '@/modules/interaction/service/screen-sharing.service';
import { InteractionService } from '@/modules/interaction/service/interaction.service';
import { MediaService } from '@/modules/media/service/media.service';
import { ChatService } from '@/modules/socket/service/chat.service';
import { CallService } from '@/modules/socket/service/call.service';
import { RoomService } from '@/modules/room/service/room.service';
import { TransportService } from '@/modules/transport/service/transport.service';
import { FriendService } from '@/modules/friend/service/friend.service';
import { MessageQueueService } from '@/modules/cache/service/message-queue.service';

export async function initializeServices(context: ServerContext) {
  // Bind ServerContext as a constant value
  container.bind<ServerContext>(TYPES.ServerContext).toConstantValue(context);

  // Bind all services
  container.bind<DetectionService>(TYPES.DetectionService).to(DetectionService).inSingletonScope();
  container.bind<ARService>(TYPES.ARService).to(ARService).inSingletonScope();
  container.bind<DrawingService>(TYPES.DrawingService).to(DrawingService).inSingletonScope();
  container.bind<ScreenSharingService>(TYPES.ScreenSharingService).to(ScreenSharingService).inSingletonScope();
  container.bind<InteractionService>(TYPES.InteractionService).to(InteractionService).inSingletonScope();
  container.bind<MediaService>(TYPES.MediaService).to(MediaService).inSingletonScope();
  container.bind<ChatService>(TYPES.ChatService).to(ChatService).inSingletonScope();
  container.bind<CallService>(TYPES.CallService).to(CallService).inSingletonScope();
  container.bind<RoomService>(TYPES.RoomService).to(RoomService).inSingletonScope();
  container.bind<TransportService>(TYPES.TransportService).to(TransportService).inSingletonScope();
  container.bind<FriendService>(TYPES.FriendService).to(FriendService).inSingletonScope();
  container.bind<MessageQueueService>(TYPES.MessageQueueService).to(MessageQueueService).inSingletonScope();

  // Initialize MessageQueueService
  const messageQueueService = container.get<MessageQueueService>(TYPES.MessageQueueService);
  await messageQueueService.initialize();

  // Return services using InversifyJS container
  return {
    detectionService: container.get<DetectionService>(TYPES.DetectionService),
    arService: container.get<ARService>(TYPES.ARService),
    drawingService: container.get<DrawingService>(TYPES.DrawingService),
    screenSharingService: container.get<ScreenSharingService>(TYPES.ScreenSharingService),
    interactionService: container.get<InteractionService>(TYPES.InteractionService),
    mediaService: container.get<MediaService>(TYPES.MediaService),
    chatService: container.get<ChatService>(TYPES.ChatService),
    callService: container.get<CallService>(TYPES.CallService),
    roomService: container.get<RoomService>(TYPES.RoomService),
    transportService: container.get<TransportService>(TYPES.TransportService),
    friendService: container.get<FriendService>(TYPES.FriendService),
    messageQueueService,
    workerManager: context.workerManager
  };
}
