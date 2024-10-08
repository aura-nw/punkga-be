import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { errorOrEmpty } from '../graphql/utils';
import { generateSlug } from '../manga/util';
import { CheckConditionService } from '../quest/check-condition.service';
import { CheckRewardService } from '../quest/check-reward.service';
import { IRewardInfo } from '../quest/interface/ireward-info';
import { QuestGraphql } from '../quest/quest.graphql';
import { RedisService } from '../redis/redis.service';
import { UserGraphql } from '../user/user.graphql';
import { CampaignGraphql } from './campaign.graphql';
import {
  CampaignLanguagesDto as CreateCampaignLanguagesDto,
  CreateCampaignDto,
} from './dto/create-campaign.dto';
import {
  CampaignLanguagesDto as UpdateCampaignLanguagesDto,
  UpdateCampaignDto,
} from './dto/update-campaign.dto';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private configService: ConfigService,
    private campaignGraphql: CampaignGraphql,
    private checkConditionService: CheckConditionService,
    private checkRewardService: CheckRewardService,
    private userGraphql: UserGraphql,
    private questGraphql: QuestGraphql,
    private fileService: FilesService,
    private redisClientService: RedisService
  ) {}

  async create(data: CreateCampaignDto, files: Array<Express.Multer.File>) {
    const { token } = ContextProvider.getAuthUser();

    // TODO: get vn language id from db/ default 2
    // const languages = await this.campaignGraphql.getLanguages();
    // const defaultlLanguage = languages.find((item) => item.is_main === true);

    const campaignLanguages = JSON.parse(
      data.i18n
    ) as CreateCampaignLanguagesDto;
    if (campaignLanguages.campaign_languages.length === 0)
      throw new BadRequestException('campaign_languages invalid');

    let defaultLanguageData = campaignLanguages.campaign_languages.find(
      (item) => item.language_id === 2
    );

    if (!defaultLanguageData)
      defaultLanguageData = campaignLanguages.campaign_languages[0];

    const slug = generateSlug(defaultLanguageData.name);

    const campaignLanguagesData = campaignLanguages.campaign_languages.map(
      (item) => ({
        language_id: item.language_id,
        data: {
          name: item.name,
          description: item.description,
          seo: {
            title: item.name,
            description: this.getSEODescription(item.description),
          },
        },
      })
    );

    const insertData = {
      objects: [
        {
          status: data.status,
          chain_id: data.chain_id,
          start_date: data.start_date,
          end_date: data.end_date,
          reward: JSON.parse(data.reward),
          slug,
          campaign_i18n: {
            data: campaignLanguagesData,
          },
        },
      ],
    };
    const result = await this.campaignGraphql.createCampaign(insertData, token);
    if (result.errors) return result;

    // upload thumbnail
    const campaignId = result.data.insert_campaign.returning[0].id;

    const vnCampaignInfo = campaignLanguagesData.find(
      (item) => item.language_id === 2
    );
    if (vnCampaignInfo) {
      const vndata: any = vnCampaignInfo.data;

      const vnthumbnail = files.filter(
        (f) => f.fieldname === 'vn_thumbnail'
      )[0];
      if (vnthumbnail) {
        const vnthumbnailUrl = await this.fileService.uploadImageToS3(
          `campaign-${campaignId}/vn`,
          vnthumbnail
        );
        vndata.thumbnail_url = vnthumbnailUrl;
        vndata.seo.thumbnail_url = vnthumbnailUrl;
      }

      const result = await this.campaignGraphql.insertI18n(
        {
          campaign_id: campaignId,
          language_id: 2,
          data: vndata,
        },
        token
      );
      this.logger.debug(
        `Update campaign thumbnail result: ${JSON.stringify(result)}`
      );
    }

    // update en info
    const enCampaignInfo = campaignLanguagesData.find(
      (item) => item.language_id === 1
    );
    if (enCampaignInfo) {
      const endata: any = enCampaignInfo.data;

      const enthumbnail = files.filter(
        (f) => f.fieldname === 'en_thumbnail'
      )[0];
      if (enthumbnail) {
        const enthumbnailUrl = await this.fileService.uploadImageToS3(
          `campaign-${campaignId}/en`,
          enthumbnail
        );
        endata.thumbnail_url = enthumbnailUrl;
        endata.seo.thumbnail_url = enthumbnailUrl;
      }

      const result = await this.campaignGraphql.insertI18n(
        {
          campaign_id: campaignId,
          language_id: 1,
          data: endata,
        },
        token
      );
      this.logger.debug(
        `Update campaign thumbnail result: ${JSON.stringify(result)}`
      );
    }

    return result;
  }

  async update(
    campaignId: number,
    data: UpdateCampaignDto,
    files: Array<Express.Multer.File>
  ) {
    const { token } = ContextProvider.getAuthUser();

    // get i18n campaign
    const i18nData: any[] = await this.campaignGraphql.getI18n(
      {
        campaign_id: campaignId,
      },
      token
    );

    const campaignLanguages = JSON.parse(
      data.i18n
    ) as UpdateCampaignLanguagesDto;
    const campaignLanguagesData = campaignLanguages.campaign_languages.map(
      (item) => ({
        language_id: item.language_id,
        data: {
          name: item.name,
          description: item.description,
          thumbnail_url: item.thumbnail_url,
          seo: {
            title: item.name,
            description: this.getSEODescription(item.description),
          },
        },
      })
    );

    const updateData = {
      chain_id: data.chain_id,
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date,
      reward: JSON.parse(data.reward),
    };
    const result = await this.campaignGraphql.updateCampaign(
      {
        id: campaignId,
        data: updateData,
      },
      token
    );

    // update vn info
    const vnCampaignInfo = campaignLanguagesData.find(
      (item) => item.language_id === 2
    );
    if (vnCampaignInfo) {
      const oldVnSEOData = i18nData.find((item) => item.language_id === 2)?.data
        ?.seo;

      const vndata = vnCampaignInfo.data;

      const vnthumbnail = files.filter(
        (f) => f.fieldname === 'vn_thumbnail'
      )[0];
      if (vnthumbnail) {
        const vnthumbnailUrl = await this.fileService.uploadImageToS3(
          `campaign-${campaignId}/vn`,
          vnthumbnail
        );
        vndata.thumbnail_url = vnthumbnailUrl;
      }

      const result = await this.campaignGraphql.insertI18n(
        {
          campaign_id: campaignId,
          language_id: 2,
          data: {
            ...vndata,
            seo: {
              ...oldVnSEOData,
              ...vndata.seo,
            },
          },
        },
        token
      );
      this.logger.debug(
        `Update campaign thumbnail result: ${JSON.stringify(result)}`
      );
    }

    // update en info
    const enCampaignInfo = campaignLanguagesData.find(
      (item) => item.language_id === 1
    );
    if (enCampaignInfo) {
      const endata = enCampaignInfo.data;

      const oldEnSEOData = i18nData.find((item) => item.language_id === 1)?.data
        ?.seo;

      const enthumbnail = files.filter(
        (f) => f.fieldname === 'en_thumbnail'
      )[0];
      if (enthumbnail) {
        const enthumbnailUrl = await this.fileService.uploadImageToS3(
          `campaign-${campaignId}/en`,
          enthumbnail
        );
        endata.thumbnail_url = enthumbnailUrl;
      }

      const result = await this.campaignGraphql.insertI18n(
        {
          campaign_id: campaignId,
          language_id: 1,
          data: {
            ...endata,
            seo: {
              ...oldEnSEOData,
              ...endata.seo,
            },
          },
        },
        token
      );
      this.logger.debug(
        `Update campaign thumbnail result: ${JSON.stringify(result)}`
      );
    }

    return result;
  }

  async getAll(userId: string) {
    return this.campaignGraphql.getAllPublishedCampaign(userId);
  }

  async getPublicCampaignDetail(slug: string) {
    return this.campaignGraphql.getCampaignPublicDetail(slug);
  }

  async getAuthorizedCampaignDetail(slug: string) {
    try {
      const { userId } = ContextProvider.getAuthUser();

      const publicCampaignDetail = await this.getPublicCampaignDetail(slug);
      const campaignId = publicCampaignDetail.data.campaign[0].id;

      // check enroll
      const userCampaign = await this.campaignGraphql.getUserCampaign(
        campaignId,
        userId
      );
      if (errorOrEmpty(userCampaign, 'user_campaign'))
        return publicCampaignDetail;

      // get auth-ed campaign info
      const result = await this.campaignGraphql.getCampaignAuthDetail(
        campaignId,
        userId
      );

      if (errorOrEmpty(result, 'campaign')) return result;
      const campaign = result.data.campaign[0];

      const user = await this.userGraphql.queryUserLevel({
        id: userId,
      });

      const checkConditionPromises = [];
      const checkRewardPromises = [];

      campaign.campaign_quests.forEach((quest) => {
        // check condition

        checkConditionPromises.push(
          this.checkConditionService.verify(quest.condition, user)
        );

        // check reward status
        checkRewardPromises.push(
          this.checkRewardService.getClaimRewardStatus(quest, userId)
        );
      });

      const checkConditionResult = await Promise.all(checkConditionPromises);
      checkConditionResult.forEach((result, index) => {
        campaign.campaign_quests[index].unlock = result;
      });

      const checkRequirementResult = await Promise.all(checkRewardPromises);
      checkRequirementResult.forEach((result, index) => {
        campaign.campaign_quests[index].reward_status = result;
      });

      result.data.campaign[0] = campaign;

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async enroll(campaignId: number) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();

      const [campaign] = await this.campaignGraphql.getPublishedOngoingCampaign(
        campaignId
      );

      const result = await this.campaignGraphql.enrollCampaign(
        userId,
        campaign.id,
        token
      );

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async claimReward(campaignId: number) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();

      // if (!user.authorizer_users_user_wallet?.address) {
      //   throw new BadRequestException('User wallet address not found');
      // }

      // check top 1 user of campaign
      const top1UserCampaign = await this.campaignGraphql.getTop1UserCampaign(
        campaignId,
        token
      );

      if (userId !== top1UserCampaign.user_id)
        throw new ForbiddenException('user is not satisfied');

      // check claim status
      if (top1UserCampaign.user_campaign_user_campaign_rewards.length > 0)
        throw new ForbiddenException('reward already claimed');

      // add unique key to db (duplicate item protection)
      const uniqueKey = `c-${userId}-${campaignId}`;

      // insert new request
      const result = await this.questGraphql.insertRequestLog({
        data: {
          userId,
          campaignId,
        },
        unique_key: uniqueKey,
      });

      if (errorOrEmpty(result, 'insert_request_log_one')) return result;
      this.logger.debug(`insert request success ${JSON.stringify(result)}`);

      const requestId = result.data.insert_request_log_one.id;

      const rewardInfo: IRewardInfo = {
        requestId,
        userId,
        campaignId,
        chainId: top1UserCampaign.user_campaign_campaign.chain_id,
      };

      const env = this.configService.get<string>('app.env') || 'prod';
      this.redisClientService.client.rPush(
        `punkga-${env}:reward-users`,
        JSON.stringify(rewardInfo)
      );

      return {
        requestId,
      };
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async getUserRank(campaignId: number) {
    const { userId } = ContextProvider.getAuthUser();
    return this.campaignGraphql.getUserCampaignRank(campaignId, userId);
  }

  private getSEODescription(richTextDescription: string): string {
    try {
      return richTextDescription.split('</p>')[0].split('<p>').pop();
    } catch (err) {
      console.log(err);
      return richTextDescription;
    }
  }
}
