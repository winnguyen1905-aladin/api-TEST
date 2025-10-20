import * as mediasoup from "mediasoup";

export type StreamKind = "audio" | "video" | "screen" | "screenAudio" | "screenVideo" | "ar" | "drawing" | "detection";

export type AudioChangeType = "mute" | "unmute";

export interface StreamMetadata {
  source?: 'camera' | 'screen' | 'processed';
  processing?: 'ar' | 'detection' | 'drawing';
  quality?: 'low' | 'medium' | 'high';
  realTime?: boolean;
}

export interface StartProducingDto {
  kind: StreamKind;
  rtpParameters: mediasoup.types.RtpParameters;
  metadata?: StreamMetadata;
}

export interface ConsumeMediaDto {
  rtpCapabilities: mediasoup.types.RtpCapabilities;
  pid: string;
  kind: StreamKind;
}

export interface ConsumeResponseDto {
  producerId: string;
  id: string;
  kind: string;
  rtpParameters: mediasoup.types.RtpParameters;
}

export interface UnpauseConsumerDto {
  pid: string;
  kind: StreamKind;
}

export interface AudioChangeDto {
  typeOfChange: AudioChangeType;
}

export interface NewProducersToConsumeDto {
  routerRtpCapabilities: mediasoup.types.RtpCapabilities;
  audioPidsToCreate: string[];
  videoPidsToCreate: (string | null)[];
  associatedUserNames: string[];
  activeSpeakerList: string[];
}
