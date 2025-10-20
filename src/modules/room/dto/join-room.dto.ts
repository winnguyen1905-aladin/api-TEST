export interface JoinRoomDto {
  userName: string;
  roomName: string;
}

export interface JoinRoomResponseDto {
  routerRtpCapabilities: any;
  newRoom: boolean;
  audioPidsToCreate: string[];
  videoPidsToCreate: (string | null)[];
  associatedUserNames: string[];
}
