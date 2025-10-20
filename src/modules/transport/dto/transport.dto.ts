import { StreamKind } from "@/modules/media/dto/media.dto";
import * as mediasoup from "mediasoup";
import { DtlsParameters, IceCandidate, IceParameters, SctpParameters } from "mediasoup/node/lib/types";

export type TransportRole = "producer" | "consumer";

export interface TransportRequestDto {
  type: TransportRole;
  streamKind?: StreamKind;  
  associatedProducerId?: string;  
  audioPid?: string;  
}

export interface TransportParamsDto {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
  sctpParameters?: SctpParameters;  
}

export interface ConnectTransportDto {
  dtlsParameters: mediasoup.types.DtlsParameters;
  type: TransportRole;
  streamKind?: StreamKind;  
  associatedProducerId?: string;  
  audioPid?: string | undefined; 
}

export interface RestartIceDto {
  transportId: string;
}
