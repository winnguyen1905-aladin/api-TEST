import { Client } from "@/modules/room/domain/client.domain";
import * as mediasoup from "mediasoup";
import { injectable } from "inversify";

@injectable()
export class ScreenSharingService {
  async startScreenShare(client: Client, rtpParameters: mediasoup.types.RtpParameters): Promise<string> {
    // Screen sharing specific logic
    const producerId = await client.upstreamTransport!.produce({
      kind: "video",
      rtpParameters,
    });

    client.addProducer("screen", producerId);
    return producerId.id;
  }
}

// Singleton export removed - use DI container instead
