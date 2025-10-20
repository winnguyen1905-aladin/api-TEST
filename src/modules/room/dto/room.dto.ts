import * as mediasoup from "mediasoup";

export interface RoomDto {
  roomName: string;
  clientCount: number;
  activeSpeakers: string[];
}

export interface ClientDto {
  userName: string;
  socketId: string;
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface ActiveSpeakersUpdateDto {
  activeSpeakerList: string[];
  audioPidsToCreate: string[];
  videoPidsToCreate: (string | null)[];
  associatedUserNames: string[];
  routerRtpCapabilities?: mediasoup.types.RtpCapabilities;
}
