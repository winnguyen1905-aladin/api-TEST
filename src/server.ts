// Server imports
import 'reflect-metadata';
import * as http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import * as mediasoup from 'mediasoup';

// Module imports
import { config } from './shared';
import { CallGateway, ChatGateway } from './modules/socket';
import { InteractionGateway } from './modules/interaction';
import { ServerInitUtil, serverInitUtil } from './utils';
import { ServerContext } from './common';
import { initializeServices } from './common/di/ioc';

// Decorators binder
import { registerGateway } from '@/common/decorators/ws-decorators';

async function bootstrap() {
  // 1) Express + HTTP
  const app = express();
  app.use(express.static('public'));
  const httpServer = http.createServer(app);

  // 2) Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        'https://localhost:5173',
        'http://localhost:5173',
        'https://192.168.1.44',
      ],
      methods: ['GET', 'POST'],
    },
  });

  // 3) Init MediaSoup workers with modern WorkerManager (blocking before bind gateways)
  const init = await serverInitUtil.initializeMediaSoup();

  if (!init.success || !init.workers?.length || !init.workerManager) {
    console.error('Failed to initialize MediaSoup workers:', init.error);
    process.exit(1);
  }
  const workers: mediasoup.types.Worker[] = init.workers;
  const workerManager = init.workerManager;

  // 4) Prepare ServerContext provider for gateways with WorkerManager
  const ctx: ServerContext = { io, workerManager, workers };

  // 5) Initialize singleton services
  const services = await initializeServices(ctx);

  // 6) Register gateways with context and services
  registerGateway(io, ChatGateway, ctx, services.chatService);
  registerGateway(io, CallGateway, ctx, services.callService);
  registerGateway(io, InteractionGateway, ctx, services.interactionService);

  // (Optional) log basic connection for every namespace
  io.of(/^\/.*$/).on('connection', (socket) => {
    console.log(`[socket] connected ns=${socket.nsp.name} id=${socket.id}`);
    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected ns=${socket.nsp.name} id=${socket.id} reason=${reason}`);
    });
  });

  // 7) Start server
  const port = Number(process.env.PORT) || config.port;
  httpServer.listen(port, () => {
    console.log(`MediaSoup server listening on port ${port}`);
  });

  const shutdown = async (sig: string) => {
    console.log(`\nReceived ${sig}. Shutting down gracefully...`);
    try {
      io.close();
      httpServer.close();
      await services.messageQueueService.shutdown();
      await serverInitUtil.shutdown();
      console.log('Server shutdown completed successfully');
    } catch (error) {
      console.error('Error during shutdown:', error);
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
