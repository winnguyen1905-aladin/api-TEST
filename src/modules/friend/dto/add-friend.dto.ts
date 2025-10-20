export interface AddFriendDto {
  userName: string;
  friendName: string;
}

export interface FriendResponse {
  success: boolean;
  message?: string;
  friends?: string[];
}


