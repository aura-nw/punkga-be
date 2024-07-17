import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';
import { errorOrEmpty } from '../graphql/utils';
import {
  IAccountBalance,
  ICustodialWalletAsset,
  ICw721Token,
} from './interfaces/account-onchain.interface';

@Injectable()
export class UserGraphql {
  private readonly logger = new Logger(UserGraphql.name);
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async queryUserByWalletAddress(walletAddress: string) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query authorizer_users($wallet_address: String!) {
        authorizer_users(where: {wallet_address: {_eq: $wallet_address}}) {
          id
        }
      }
      `,
      'authorizer_users',
      {
        wallet_address: walletAddress,
      }
    );
  }

  async queryCustodialWalletAsset(address: string) {
    const variables = {
      owner_address: address.toLowerCase(),
    };
    const network = this.configSvc.get<string>('horosope.network');
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('horosope.endpoint'),
      '',
      `query queryAsset($owner_address: String!) {
        ${network} {
          account_balance(where: {account: {evm_address: {_eq: $owner_address}}}) {
            amount
            denom
          }
          erc721_token(
            where: {owner: {_eq: $owner_address}}
            order_by: {created_at: desc}
          ) {
            id
            token_id
            created_at
            erc721_contract {
              address
            }
          }
        }
      }`,
      'queryAsset',
      variables
    );

    const nativeDenom = this.configSvc.get<string>('network.denom');
    const balance =
      result.data[network].account.length === 0
        ? undefined
        : (result.data[network].account_balance.filter(
            (balance) => balance.denom === nativeDenom
          )[0] as IAccountBalance);
    const cw721Tokens: ICw721Token[] = result.data[network].erc721_token.map(
      (token) => {
        return {
          tokenId: token.token_id,
          contractAddress: token.erc721_contract.address,
        } as ICw721Token;
      }
    );

    return {
      balance,
      cw721Tokens,
    } as ICustodialWalletAsset;
  }

  async updateRequestLogs(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_request_log($ids: [Int!], $log: String, $status: String) {
        update_request_log(where: {id: {_in: $ids}}, _set: {log: $log, status: $status}) {
          affected_rows
        }
      }
      `,
      'update_request_log',
      variables,
      headers
    );

    return result;
  }

  async adminGetUserAddress(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query authorizer_users_by_pk($id: bpchar!) {
        authorizer_users_by_pk(id: $id) {
          wallet_address
          levels {
            xp
            level
          }
          authorizer_users_user_wallet {
            address
          }
        }
      }
      `,
      'authorizer_users_by_pk',
      variables,
      headers
    );

    if (result.data?.authorizer_users_by_pk) {
      return result.data.authorizer_users_by_pk;
    }

    throw new NotFoundException();
  }

  async insertRequestLog(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_request_log_one($data: jsonb = null, $unique_key: String!) {
        insert_request_log_one(object: {status: "CREATED", data: $data, unique_key: $unique_key}) {
          id
          data
          created_at
        }
      }`,
      'insert_request_log_one',
      variables,
      headers
    );

    return result;
  }

  async setPersonalAddress(variables: any, token: string) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation SetUserWalletAddress ($wallet_address: String!) {
        update_authorizer_users(where: {wallet_address:{_is_null:true}}, _set: {wallet_address:$wallet_address}) {
          returning {
            id
            wallet_address
          }
          affected_rows
        }
      }`,
      'SetUserWalletAddress',
      variables
    );
  }

  async getChapterDetail(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query chapters($id: Int!) {
        chapters(where: {id: {_eq: $id}}) {
          chapter_type
          manga_id
        }
      }`,
      'chapters',
      variables
    );

    if (errorOrEmpty(result, 'chapters')) throw new NotFoundException();

    return result.data.chapters[0];
  }

  async getAllPublishedQuest(userId: string) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query queryAvailableQuests($user_id: bpchar!, $now: timestamptz!) {
        user_campaign(where: {user_id: {_eq: $user_id}, user_campaign_campaign: {status: {_eq: "Published"}, start_date: {_lte: $now}, end_date: {_gte: $now}}}, order_by: {created_at: desc}) {
          user_campaign_campaign {
            start_date
            end_date
            campaign_quests(where: {status: {_eq: "Published"}}, order_by: {created_at: desc}) {
              id
              name
              repeat
              quest_reward_claimed
              description
              condition
              requirement
              reward
              status
              type
              repeat_quests(limit: 1, order_by: {created_at: desc}) {
                id
                repeat_quest_reward_claimed
                quest_id
                created_at
              }
              created_at
              updated_at
            }
          }
        }
      }`,
      'queryAvailableQuests',
      {
        now: new Date(),
        user_id: userId,
      }
    );

    if (errorOrEmpty(result, 'user_campaign')) {
      this.logger.error(JSON.stringify(result));
      return [];
    }

    const quests = [];
    result.data.user_campaign.forEach((userCampaign) => {
      quests.push(...userCampaign.user_campaign_campaign.campaign_quests);
    });

    return quests;
  }

  async queryUserLevel(variables) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query authorizer_users($id: bpchar!) {
        authorizer_users(where: {id: {_eq: $id}}) {
          id
          levels {
            xp
            level
          }
        }
      }`,
      'authorizer_users',
      variables
    );

    return result.data.authorizer_users[0];
  }

  updateUserProfile(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateUserProfile($id: bpchar = "", $_set: authorizer_users_set_input = {bio: "", nickname: ""}) {
        update_authorizer_users(where: {id: {_eq: $id}}, _set: $_set) {
          affected_rows
          returning {
            email
            bio
            picture
            birthdate
          }
        }
      }
      `,
      'UpdateUserProfile',
      variables
    );
  }

  userReadChapter(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation insert_user_read_chapter($chapter_id: Int!) {
        insert_user_read_chapter(objects: {chapter_id: $chapter_id}, on_conflict: {constraint: user_read_chapter_pkey, update_columns: updated_at}) {
          returning {
            user_id
            chapter_id
            updated_at
          }
        }
      }
      `,
      'insert_user_read_chapter',
      variables
    );
  }
}
