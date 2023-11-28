import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QuestGraphql } from './quest.graphql';
import { UserRewardGraphql } from '../user-reward/user-reward.graphql';
import { UserLevelGraphql } from '../user-level/user-level.graphql';
import { LevelingService } from '../leveling/leveling.service';
import { UserGraphql } from '../user/user.graphql';
import { MasterWalletService } from '../user-wallet/master-wallet.service';

@Injectable()
export class QuestRewardService {
  private readonly logger = new Logger(QuestRewardService.name);

  constructor(
    private questGraphql: QuestGraphql,
    private userRewardGraphql: UserRewardGraphql,
    private userLevelGraphql: UserLevelGraphql,
    private levelingService: LevelingService,
    private userGraphql: UserGraphql,
    private masterWalletSerivce: MasterWalletService
  ) {}

  async mintNft(userId: string, quest: any, userToken: string) {
    const tokenUri = quest.reward.nft.ipfs;

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
        name: quest.reward.nft.nft_name || '',
      }
    );

    const insertUserRewardResult = await this.saveRewardHistory(
      quest,
      userId,
      tx.transactionHash
    );

    this.logger.debug('Increase user xp result: ');
    this.logger.debug(JSON.stringify(insertUserRewardResult));
    return insertUserRewardResult;
  }

  async increaseUserXp(
    userId: string,
    quest: any,
    xp: number,
    userToken: string
  ) {
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
    const insertUserRewardResult = await this.saveRewardHistory(
      quest,
      userId,
      tx.transactionHash
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

  async saveRewardHistory(quest: any, userId: string, txHash: string) {
    let quest_id, repeat_quest_id;
    if (quest.repeat === 'Once') {
      quest_id = quest.id;
    } else {
      // get latest repeat quest by quest id
      const repeatQuest = await this.questGraphql.queryRepeatQuest({
        quest_id: quest.id,
      });

      if (!repeatQuest) throw new NotFoundException();
      repeat_quest_id = repeatQuest.id;
      quest_id = quest.id;
    }

    const insertUserRewardResult =
      await this.userRewardGraphql.insertUserReward({
        objects: {
          quest_id,
          repeat_quest_id,
          status: 'Claimed',
          user_id: userId,
          user_quest_rewards: {
            data: {
              tx_hash: txHash,
            },
            on_conflict: {
              constraint: 'user_quest_reward_pkey',
              update_columns: 'updated_at',
            },
          },
        },
      });
    return insertUserRewardResult;
  }
}
