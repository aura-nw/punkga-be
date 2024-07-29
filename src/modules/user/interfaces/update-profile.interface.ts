export interface IUpdateProfile {
  id: string;
  _set: {
    bio: string;
    gender: string;
    birthdate: string;
    nickname: string;
    picture?: string;
  };
}
