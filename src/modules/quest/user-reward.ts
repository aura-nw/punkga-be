class NftInfo {
  name: string
  image: string
  tokenId: string
}

class RewardInfo {
  xp = 0
  nft: NftInfo[] = []
}

export class UserCampaignXp {
  userCampaignId: number
  xp: number
}

export class UserRewardInfo {
  reward: RewardInfo;
  userQuestIds: number[] = []
  userCampaignRewardIds: number[] = []
  requestIds: number[] = []
  userXp = 0;
  userLevel = 0;
  userCampaignXp: UserCampaignXp[] = []

  constructor(public userId: string) {
    this.reward = new RewardInfo();
  }
}