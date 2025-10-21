// TypeScript interfaces for mediasoup configuration

export interface LogTag {
  info: string;
  ice: string;
  dtls: string;
  rtp: string;
  srtp: string;
  rtcp: string;
}

export interface WorkerSettings {
  // rtcMinPort and max are just arbitrary ports for our traffic
  // useful for firewall or networking rules
  rtcMinPort: number;
  rtcMaxPort: number;
  // log levels you want to set
  logLevel: "debug" | "warn" | "error" | "none";
  logTags: string[];
}

export interface MediaCodecParameters {
  [key: string]: string | number;
}

export interface MediaCodec {
  kind: "audio" | "video";
  mimeType: string;
  clockRate: number;
  channels?: number;
  parameters?: MediaCodecParameters;
}

export interface ListenIp {
  ip: string;
  announcedIp: string | null;
}

export interface WebRtcTransport {
  listenIps: ListenIp[];
  // For a typical video stream with HD quality, you might set maxIncomingBitrate
  // around 5 Mbps (5000 kbps) to balance quality and bandwidth.
  // 4K Ultra HD: 15 Mbps to 25 Mbps
  maxIncomingBitrate: number; // 5 Mbps, default is INF
  initialAvailableOutgoingBitrate: number; // 5 Mbps, default is 600000
}

export interface Config {
  port: number;
  workerSettings: WorkerSettings;
  routerMediaCodecs: MediaCodec[];
  webRtcTransport: WebRtcTransport;
  roomSettings: {
    maxActiveSpeakers: number;
    maxRoomMembers: number;
  };
}

const config: Config = {
  port: 8090,
  workerSettings: {
    // rtcMinPort and max are just arbitrary ports for our traffic
    // useful for firewall or networking rules
    rtcMinPort: 40000,
    rtcMaxPort: 41000,
    // log levels you want to set
    logLevel: "warn",
    logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
  },
  routerMediaCodecs: [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: "video",
      mimeType: "video/H264",
      clockRate: 90000,
      parameters: {
        "packetization-mode": 1,
        "profile-level-id": "42e01f",
        "level-asymmetry-allowed": 1,
      },
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
      parameters: {},
    },
  ],
  webRtcTransport: {
    listenIps: [
      {
        ip: "127.0.0.1", // anywhere
        // announcedIp: null, // replace by public IP address
        announcedIp: '14.225.192.43',
      },
    ],
    // For a typical video stream with HD quality, you might set maxIncomingBitrate
    // around 5 Mbps (5000 kbps) to balance quality and bandwidth.
    // 4K Ultra HD: 15 Mbps to 25 Mbps
    maxIncomingBitrate: 5000000, // 5 Mbps, default is INF
    initialAvailableOutgoingBitrate: 5000000, // 5 Mbps, default is 600000
  },
  roomSettings: {
    maxActiveSpeakers: 10, // Maximum number of active speakers to show (increased from 5)
    maxRoomMembers: 50, // Maximum number of members allowed in a room
  },
};

export default config;
