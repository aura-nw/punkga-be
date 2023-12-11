import { Injectable, Logger } from '@nestjs/common';
import { UserGraphql } from '../user/user.graphql';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { CampaignGraphql } from './campaign.graphql';
import { LevelingService } from '../leveling/leveling.service';
import { UserLevelGraphql } from '../user-level/user-level.graphql';

@Injectable()
export class CampaignRewardService {
  private readonly logger = new Logger(CampaignRewardService.name);

  constructor(
    private campaignGraphql: CampaignGraphql,
    private userGraphql: UserGraphql,
    private levelingService: LevelingService,
    private userLevelGraphql: UserLevelGraphql,
    private masterWalletSerivce: MasterWalletService
  ) { }

  async mintNft(userId: string, top1UserCampaign: any, userToken: string) {
    const tokenUri = top1UserCampaign.user_campaign_campaign.reward.nft.ipfs;

    const user = await this.userGraphql.queryUserWalletData(
      {
        id: userId,
      },
      userToken
    );

    // execute contract
    const tx = await this.masterWalletSerivce.mintNft(
      user.authorizer_users_user_wallet.address,
      Number(new Date()).toString(),
      {
        image: tokenUri,
        name: top1UserCampaign.user_campaign_campaign.reward.nft.nft_name || '',
      }
    );

    const insertUserRewardResult =
      await this.campaignGraphql.insertUserCampaignReward(
        top1UserCampaign.campaign_id,
        tx.transactionHash,
        top1UserCampaign.id,
        userToken
      );

    this.logger.debug('Mint nft result: ');
    this.logger.debug(JSON.stringify(insertUserRewardResult));
    return insertUserRewardResult;
  }

  async increaseUserXp(
    userId: string,
    top1UserCampaign: any,
    userToken: string
  ) {
    const xp = top1UserCampaign.user_campaign_campaign.reward.xp;

    const user = await this.userGraphql.queryUserWalletData(
      {
        id: userId,
      },
      userToken
    );

    const currentXp = user.levels[0] ? user.levels[0].xp : 0;
    const totalXp = currentXp + xp;
    // calculate level from xp
    const newLevel = this.levelingService.xpToLevel(totalXp);

    // execute contract
    const tx = await this.masterWalletSerivce.updateUserLevel(
      user.authorizer_users_user_wallet.address,
      totalXp,
      newLevel
    );

    // save db
    const insertUserRewardResult =
      await this.campaignGraphql.insertUserCampaignReward(
        top1UserCampaign.campaign_id,
        tx.transactionHash,
        top1UserCampaign.id,
        userToken
      );

    const result = await this.userLevelGraphql.insertUserLevel(
      {
        user_id: userId,
        xp: totalXp,
        level: newLevel,
      },
      userToken
    );
    this.logger.debug('Increase user xp result: ');
    this.logger.debug(JSON.stringify(insertUserRewardResult));
    this.logger.debug(JSON.stringify(result));
    return result;
  }
}
