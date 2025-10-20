import { Socket } from "socket.io";
import { Client, Room, TransportRole } from "../..";
import * as mediasoup from "mediasoup";

export interface JoinRoomData {
  userName: string;
  roomName: string;
}

export interface JoinRoomResponse {
  routerRtpCapabilities?: any;
  newRoom?: boolean;
  audioPidsToCreate?: string[];
  videoPidsToCreate?: (string | null)[];
  associatedUserNames?: string[];
  error?: string;
}

export interface TransportRequestData {
  type: string;
  audioPid?: string;
}

export interface ConnectTransportData {
  dtlsParameters: mediasoup.types.DtlsParameters;
  type: TransportRole;
  audioPid?: string;
}

export interface StartProducingData {
  kind: mediasoup.types.MediaKind;
  rtpParameters: mediasoup.types.RtpParameters;
}

export interface ConsumeMediaData {
  rtpCapabilities: mediasoup.types.RtpCapabilities;
  pid: string;
  kind: string;
}

export interface UnpauseConsumerData {
  pid: string;
  kind: string;
}

export interface NewProducersToConsumeData {
  routerRtpCapabilities: any;
  audioPidsToCreate: string[];
  videoPidsToCreate: (string | null)[];
  associatedUserNames: string[];
  activeSpeakerList: string[];
}

export interface SocketEventHandler {
  client: Client;
  socket: Socket;
}

export interface AuthenticatedSocket extends Socket {
  userInfo: {
    id: string;
    email?: string;
    name?: string;
    profilePicture?: string;
    lastActive?: Date;
  };
}

// ws-types.ts
export interface AckOk<T = unknown> { ok: true; data: T }
export interface AckErr { ok: false; error: string }
export type AckResponse<T = unknown> = AckOk<T> | AckErr;

// The callback type you'd like to use in handlers
export type SocketEventCallback<T = unknown> = (res: AckResponse<T> | any) => void;

// Optional helpers
export const ok = <T>(data: T): AckOk<T> => ({ ok: true, data });
export const err = (message: string): AckErr => ({ ok: false, error: message });
