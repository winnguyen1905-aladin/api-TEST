import {
  TransportRequestDto,
  TransportParamsDto,
  ConnectTransportDto,
} from "../dto";
import { ServerContext } from "@/common";
import { Client, DownstreamTransport } from "@/modules/room/domain/client.domain";
import { StreamKind } from "@/modules/media/dto/media.dto";
import { injectable, inject } from 'inversify';
import { TYPES } from '@/common/di/types';

@injectable()
export class TransportService {

  constructor(@inject(TYPES.ServerContext) private readonly context: ServerContext) {}

  async handleTransportRequest(
    client: Client,
    request: TransportRequestDto
  ): Promise<TransportParamsDto> {
    let clientTransportParams: TransportParamsDto | undefined;

    if (request.type === "producer") {
      clientTransportParams = await client.addTransport(request.type);
    } else if (request.type === "consumer") {
      // Enhanced logic for different stream types
      const { associatedProducerId, streamKind } = this.resolveProducerAssociation(
        client,
        request
      );

      const audioPid = request.audioPid;
      const videoPid = this.findVideoPid(client, request.audioPid);
      
      console.log(`[TransportService] Creating consumer transport for audioPid: ${audioPid}, videoPid: ${videoPid}`);

      clientTransportParams = await client.addTransport(
        request.type,
        streamKind,
        associatedProducerId,
        audioPid, // Legacy support
        videoPid // Legacy support
      );
    }

    // IMPORTANT: Increment transport count for load balancing
    if (this.context && client.room && client.room.worker) {
      const workerPid = (client.room.worker as any)._child?.pid ?? -1;
      if (workerPid !== -1) {
        this.context.workerManager.incTransports(workerPid, +1);
        console.log(`Incremented transport count for worker ${workerPid} (type: ${request.type})`);
      }
    }

    return clientTransportParams as TransportParamsDto;
  }

  async connectTransport(
    client: Client,
    connectData: ConnectTransportDto,
  ): Promise<string> {
    try {
      if (connectData.type === "producer") {
        await client.upstreamTransport!.connect({
          dtlsParameters: connectData.dtlsParameters,
        });
        return "success";
      } else if (connectData.type === "consumer") {
        const downstreamTransport = client.downstreamTransports.find(
          (t: DownstreamTransport) => {
            return t.associatedAudioPid === connectData.audioPid;
          },
        );

        if (downstreamTransport) {
          await downstreamTransport.transport.connect({
            dtlsParameters: connectData.dtlsParameters,
          });
          return "success";
        } else {
          throw new Error("Downstream transport not found");
        }
      }
      throw new Error("Invalid transport type");
    } catch (error) {
      console.log("Transport connection error:", error);
      throw error;
    }
  }

  private resolveProducerAssociation(
    client: Client,
    request: TransportRequestDto
  ): { associatedProducerId?: string; streamKind?: StreamKind } {
    if (request.associatedProducerId && request.streamKind) {
      return {
        associatedProducerId: request.associatedProducerId,
        streamKind: request.streamKind
      };
    }

    // Legacy fallback
    if (request.audioPid) {
      return {
        associatedProducerId: request.audioPid,
        streamKind: "audio"
      };
    }

    return {};
  }

  private findVideoPid(client: Client, audioPid?: string): string | null {
    if (!audioPid || !client.room) return null;

    // Find the client that has this audio producer (regular or screen share)
    const producingClient = client.room.clients.find(
      (c: any) => c.producer.audio?.id === audioPid || c.producer.screenAudio?.id === audioPid
    );

    if (!producingClient) return null;

    // Check if it's a screen share audio producer
    if (producingClient.producer.screenAudio?.id === audioPid) {
      return producingClient.producer.screenVideo?.id || null;
    }

    // Regular video producer
    return producingClient.producer.video?.id || null;
  }
}
