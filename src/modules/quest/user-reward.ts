class NftInfo {
  name: string
  image: string
  tokenId: string
}

class RewardInfo {
  xp = 0
  nft: NftInfo[] = []
}

export class UserRewardInfo {
  reward: RewardInfo;
  userQuestIds: number[] = []
  requestIds: number[] = []
  userXp = 0;
  userLevel = 0;

  constructor(public userId: string) {
    this.reward = new RewardInfo();
  }
}