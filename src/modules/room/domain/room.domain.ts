import { Server as SocketIOServer } from 'socket.io';
import * as mediasoup from 'mediasoup';
import { config } from '@/shared';

// Forward declaration to avoid circular dependency
interface Client {
  userName: string;
  socket: any;
  upstreamTransport: mediasoup.types.WebRtcTransport | null;
  producer: {
    audio?: mediasoup.types.Producer;
    video?: mediasoup.types.Producer;
    [key: string]: mediasoup.types.Producer | undefined
  };
  downstreamTransports: any[];
  room: Room | null;
}

export class Room {
  public roomName: string;
  // public roomName: string;
  public worker: mediasoup.types.Worker;
  public router: mediasoup.types.Router | null = null;
  public clients: Client[] = [];
  public activeSpeakerList: string[] = [];
  public activeSpeakerObserver: mediasoup.types.ActiveSpeakerObserver | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private io: SocketIOServer | null = null;

  constructor(roomName: string, workerToUse: mediasoup.types.Worker, ) {
    // this.roomName = roomName;
    this.worker = workerToUse;
    this.roomName = roomName;
  }

  addClient(client: Client): void {
    this.clients.push(client);
  }

  removeClient(clientId: string): void {
    this.clients = this.clients.filter(client => client.socket.id !== clientId);
  }

  async createRouter(io: SocketIOServer): Promise<void> {
    this.io = io; // Store io reference for periodic updates

    this.router = await this.worker.createRouter({
      mediaCodecs: config.routerMediaCodecs
    });

    this.activeSpeakerObserver = await this.router.createActiveSpeakerObserver({
      interval: 100 // OPTIMIZATION: Reduced from 300ms to 100ms for faster speaker detection
    });

    // Import the dominant speaker handler - this will be updated later
    const { newDominantSpeaker } = await import('@modules/media/service/dominant-speaker.service');
    this.activeSpeakerObserver.on('dominantspeaker', (ds: any) => newDominantSpeaker(ds, this, io));

    // Start periodic refresh to automatically update active speakers
    this.startPeriodicRefresh();
  }

  getClientBySocketId(socketId: string): Client | undefined {
    return this.clients.find(client => client.socket.id === socketId);
  }

  getClientByUserName(userName: string): Client | undefined {
    return this.clients.find(client => client.userName === userName);
  }

  getActiveSpeakers(limit?: number): string[] {
    // Import config to get the max active speakers limit if no limit specified
    if (limit === undefined) {
      limit = config.roomSettings.maxActiveSpeakers;
    }
    return this.activeSpeakerList.slice(0, limit);
  }

  /**
   * Start periodic refresh to automatically send updateActiveSpeakers to all clients
   * This ensures clients always have the latest active speaker information
   */
  private startPeriodicRefresh(): void {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Send active speakers update every 10 seconds (reduced frequency for smoother video)
    this.refreshTimer = setInterval(async () => {
      if (this.clients.length > 0 && this.io && this.activeSpeakerList.length > 0) {
        try {
          console.log(`[Room:${this.roomName}] Periodic refresh: ${this.clients.length} clients, ${this.activeSpeakerList.length} speakers`);

          // Send current active speakers to all clients in room (lightweight operation)
          const activeSpeakers = this.activeSpeakerList.slice(0, config.roomSettings.maxActiveSpeakers);
          this.io.to(this.roomName).emit('updateActiveSpeakers', activeSpeakers);

          // Only do heavy operations if really needed (check for new clients needing transports)
          const { updateActiveSpeakers } = await import('@modules/media/service/active-speakers.service');
          const newTransportsByPeer = await updateActiveSpeakers(this, this.io);

          // Handle any new transports needed
          if (Object.keys(newTransportsByPeer).length > 0) {
            console.log(`[Room:${this.roomName}] Periodic refresh found ${Object.keys(newTransportsByPeer).length} clients needing new transports`);

            // Batch process new transports with minimal delay
            const emissionPromises = Object.entries(newTransportsByPeer).map(([socketId, audioPidsToCreate]) => {
              return new Promise<void>((resolve) => {
                const videoPidsToCreate = audioPidsToCreate.map((aPid: string) => {
                  const producerClient = this.clients.find((c: any) => c?.producer?.audio?.id === aPid || c?.producer?.screenAudio?.id === aPid);
                  if (producerClient?.producer?.screenAudio?.id === aPid) {
                    return producerClient?.producer?.screenVideo?.id || null;
                  }
                  return producerClient?.producer?.video?.id || null;
                });
                const associatedUserNames = audioPidsToCreate.map((aPid: string) => {
                  const producerClient = this.clients.find((c: any) => c?.producer?.audio?.id === aPid || c?.producer?.screenAudio?.id === aPid);
                  const isScreenShare = producerClient?.producer?.screenAudio?.id === aPid;
                  const userName = producerClient?.userName || 'Unknown User';
                  return isScreenShare ? `${userName} Sharing` : userName;
                });

                this.io!.to(socketId).emit('newProducersToConsume', {
                  routerRtpCapabilities: this.router!.rtpCapabilities,
                  audioPidsToCreate,
                  videoPidsToCreate,
                  associatedUserNames,
                  activeSpeakerList: this.activeSpeakerList.slice(0, config.roomSettings.maxActiveSpeakers)
                });
                resolve();
              });
            });

            await Promise.all(emissionPromises);
          }
        } catch (error) {
          console.error(`[Room:${this.roomName}] Periodic refresh error:`, error);
        }
      }
    }, 10000); // Refresh every 10 seconds (reduced from 5s for smoother video)
  }

  /**
   * Stop the periodic refresh timer
   */
  public stopPeriodicRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log(`[Room:${this.roomName}] Periodic refresh stopped`);
    }
  }

  /**
   * Clean up room resources when room is being destroyed
   */
  public cleanup(): void {
    this.stopPeriodicRefresh();
    this.io = null;
    console.log(`[Room:${this.roomName}] Room cleaned up`);
  }
}
