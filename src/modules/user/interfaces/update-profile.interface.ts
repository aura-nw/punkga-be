export interface IUpdateProfile {
  id: string;
  _set: {
    bio: string;
    gender: string;
    birthdate: string;
    nickname: string;
    ton_wallet_address: string;
    picture?: string;
  };
}
