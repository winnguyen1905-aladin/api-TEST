import { config } from '@/shared';
import * as mediasoup from 'mediasoup';
import { Room } from './room.domain';
import { TransportListenInfo } from 'mediasoup/node/lib/types';
import { TransportParamsDto } from '@/modules/transport';
import { AuthenticatedSocket } from '@/modules/socket';
import { StreamKind } from '@/modules/media/dto/media.dto';

export interface DownstreamTransport {
  transport: mediasoup.types.WebRtcTransport;

  // Legacy fields (keep for backward compatibility)
  associatedVideoPid: string | null;
  associatedAudioPid: string | null;

  // New flexible association
  associatedProducers?: Map<StreamKind, string>;  
  consumers?: Map<StreamKind, mediasoup.types.Consumer>; 

  // Dynamic access for consumers by stream type
  [key: string]: any;
}

export interface Producer {
  audio?: mediasoup.types.Producer;
  video?: mediasoup.types.Producer;
  screen?: mediasoup.types.Producer;      
  ar?: mediasoup.types.Producer;         
  drawing?: mediasoup.types.Producer;   
  detection?: mediasoup.types.Producer;   
  [key: string]: mediasoup.types.Producer | undefined;
}

export class Client {
  public userName: string;
  public socket: AuthenticatedSocket;
  public downstreamTransports: DownstreamTransport[] = [];
  public upstreamTransport: mediasoup.types.WebRtcTransport | null = null;
  public producer: Producer = {};
  public room: Room | null = null;

  constructor(userName: string, socket: AuthenticatedSocket) {
    this.userName = userName;
    this.socket = socket;
  }

  async addTransport(
    type: string,
    streamKind?: StreamKind,
    associatedProducerId?: string,
    // Keep legacy params for backward compatibility
    audioPid: string | null = null,
    videoPid: string | null = null): Promise<TransportParamsDto> {
    const { listenIps, initialAvailableOutgoingBitrate, maxIncomingBitrate } = config.webRtcTransport;
    const transport = await this.room?.router?.createWebRtcTransport({
      enableUdp: true,
      enableTcp: true, //always use UDP unless we can't
      preferUdp: true,
      listenInfos: listenIps as TransportListenInfo[],
      initialAvailableOutgoingBitrate,
    });

    if (maxIncomingBitrate) {
      try {
        await transport?.setMaxIncomingBitrate(maxIncomingBitrate);
      } catch (err) {
        console.log("Error setting bitrate", err);
      }
    }

    const clientTransportParams = {
      id: transport?.id,
      iceParameters: transport?.iceParameters,
      iceCandidates: transport?.iceCandidates,
      dtlsParameters: transport?.dtlsParameters,
    } as TransportParamsDto;

    if (type === "producer") {
      this.upstreamTransport = transport as mediasoup.types.WebRtcTransport;
    } else if (type === "consumer") {
      console.log(`[Client.addTransport] Creating consumer transport for ${this.userName} - audioPid: ${audioPid}, videoPid: ${videoPid}, streamKind: ${streamKind}`);
      
      const downstreamTransport: DownstreamTransport = {
        transport: transport as mediasoup.types.WebRtcTransport,

        // Legacy support
        associatedVideoPid: videoPid,
        associatedAudioPid: audioPid,

        // New flexible association
        associatedProducers: new Map(),
        consumers: new Map(),
      };

      // Set associations based on parameters
      if (associatedProducerId && streamKind) {
        downstreamTransport.associatedProducers?.set(streamKind, associatedProducerId);
      }

      this.downstreamTransports.push(downstreamTransport);
      
      console.log(`[Client.addTransport] Consumer transport created. Total transports: ${this.downstreamTransports.length}`);
    }

    return clientTransportParams;
  }

  addProducer(kind: string, newProducer: mediasoup.types.Producer): void {
    this.producer[kind] = newProducer;
    if (kind === "audio" && this.room && this.room.activeSpeakerObserver) {
      this.room.activeSpeakerObserver.addProducer({
        producerId: newProducer.id
      });
    }
  }

  addConsumer(kind: string, newConsumer: mediasoup.types.Consumer, downstreamTransport: DownstreamTransport): void {
    downstreamTransport[kind] = newConsumer;
  }

  hasActiveProducers(): boolean {
    return Object.keys(this.producer).length > 0;
  }

  cleanup(): void {
    // Close all transports and producers/consumers
    if (this.upstreamTransport) {
      this.upstreamTransport.close();
    }

    this.downstreamTransports.forEach(dt => {
      dt.transport.close();
    });

    Object.values(this.producer).forEach((producer: mediasoup.types.Producer | undefined) => {
      if (producer) {
        producer.close();
      }
    });

    this.downstreamTransports = [];
    this.producer = {};
    this.upstreamTransport = null;
  }
}
