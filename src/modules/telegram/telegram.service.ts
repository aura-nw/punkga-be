import { readFile } from 'fs/promises';
import * as path from 'path';

import { Authorizer } from '@authorizerdev/authorizer-js';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { ContextProvider } from '../../providers/contex.provider';
import { SaveDonateTxDto } from './dto/save-donate-tx.dto';
import { TelegramGraphql } from './telegram.graphql';
import { Role } from '../../auth/role.enum';
import { v4 as uuidv4 } from 'uuid';
var CryptoJS = require("crypto-js");
const AES = require("crypto-js/aes");

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    private telegramGraphql: TelegramGraphql,
    private jwtService: JwtService
  ) { }

  async readChapter(manga_slug: string, chapter_number: number) {
    try {
      const result = await this.telegramGraphql.getChapterDetail({
        manga_slug,
        chapter_number,
      });

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async connect() {
    const { telegramUserId } = ContextProvider.getAuthUser();
    const result = await this.telegramGraphql.getTelegramUser({
      id: telegramUserId,
    });

    if (result.data?.telegram_user?.authorizer_user !== null) {
      const payload = {
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': [Role.User],
          'x-hasura-default-role': Role.User,
          'x-hasura-user-email':
            result.data.telegram_user.authorizer_user.email,
          'x-hasura-user-id': result.data.telegram_user.authorizer_user.id,
        },
      };
      const privateKey = await readFile(
        path.resolve(__dirname, '../../../private.pem')
      );
      const access_token = await this.jwtService.signAsync(payload, {
        algorithm: 'RS256',
        privateKey,
      });
      result.data.telegram_user.authorizer_user.token = access_token;
    }
    return result;
  }

  async link(email: string, password: string) {
    const { telegramUserId } = ContextProvider.getAuthUser();

    const query = `
    mutation userLogin($email: String!, $password: String!) {
      login(params: {email: $email, password: $password}) {
        user {
          id
          email
          given_name
          family_name
          picture
          roles
        }
        access_token
        expires_in
        message
      }
    }
    `;

    const variables = {
      email,
      password,
    };

    const authRef = new Authorizer({
      redirectURL: this.configService.get<string>('authorizer.redirectUrl'), // window.location.origin
      authorizerURL: this.configService.get<string>('authorizer.authorizerUrl'),
      clientID: this.configService.get<string>('authorizer.clientId'), // obtain your client id from authorizer dashboard
    });

    try {
      const result = await authRef.graphqlQuery({
        query,
        variables,
      });

      if (result.errors) return result;

      const userId = result.login.user.id;
      const updateResult = await this.telegramGraphql.updateTelegramUser({
        id: telegramUserId,
        user_id: userId,
      });
      if (updateResult.errors) return updateResult;

      const payload = {
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': [Role.User],
          'x-hasura-default-role': Role.User,
          'x-hasura-user-email':
            updateResult.data.telegram_user.authorizer_user.email,
          'x-hasura-user-id':
            updateResult.data.telegram_user.authorizer_user.id,
        },
      };
      const privateKey = await readFile(
        path.resolve(__dirname, '../../../private.pem')
      );
      const access_token = await this.jwtService.signAsync(payload, {
        algorithm: 'RS256',
        privateKey,
      });
      updateResult.data.telegram_user.authorizer_user.token = access_token;

      return updateResult;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
  async createAndLink() {
    const { telegramId, telegramUserId } = ContextProvider.getAuthUser();
    const email = `tele_${telegramId}_${(new Date()).getTime()}@punkga.me`;
    const username = `tele_${telegramId}_${(new Date()).getTime()}`;
    const uuidTemp = uuidv4();
    const insertedUser = await this.telegramGraphql.insertTempAuthorizedUser({
      id: uuidTemp,
      key: uuidTemp,
      email: email,
      nickname: username,
      email_verified_at: (new Date()).getTime(),
      signup_methods: 'telegram'
    })
    if (insertedUser.errors) return insertedUser;
    try {
      const userId = insertedUser.data?.insert_authorizer_users?.returning[0].id;
      const updateResult = await this.telegramGraphql.updateTelegramUser({
        id: telegramUserId,
        user_id: userId,
      });
      if (updateResult.errors) return insertedUser;
      const payload = {
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': [Role.User],
          'x-hasura-default-role': Role.User,
          'x-hasura-user-email':
            updateResult.data.telegram_user.authorizer_user.email,
          'x-hasura-user-id':
            updateResult.data.telegram_user.authorizer_user.id,
        },
      };
      const privateKey = await readFile(
        path.resolve(__dirname, '../../../private.pem')
      );
      const access_token = await this.jwtService.signAsync(payload, {
        algorithm: 'RS256',
        privateKey,
      });
      updateResult.data.telegram_user.authorizer_user.token = access_token;

      return updateResult;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  async saveTx(data: SaveDonateTxDto) {
    const { telegramId, telegramUserId } = ContextProvider.getAuthUser();
    const { creator_id, txn, value } = data;
    var saveDonate = this.telegramGraphql.saveDonateHistory({
      object: {
        telegram_id: telegramId,
        creator_id,
        txn,
        value: Number(value),
      },
    });
    if (saveDonate) {
      const user = await this.telegramGraphql.getTelegramUser({
        id: telegramUserId,
      });
      const chip = data.value * 20000 + user?.data?.telegram_user.chip;
      var res = await this.telegramGraphql.updateTelegramUserChip({
        telegram_user_id: telegramUserId,
        chip: chip,
      });
    }
  }

  async getQuest() {
    try {
      const { telegramUserId } = ContextProvider.getAuthUser();
      const quests = await this.telegramGraphql.getTelegramQuest({
        telegram_user_id: telegramUserId,
      });
      if (quests?.data) {
        quests?.data?.telegram_quests?.map((q, i) => {
          if (q.type == "Daily" && q.telegram_quest_histories) {
            q.telegram_quest_histories = q.telegram_quest_histories.map((h, j) => {
              const fullToday = new Date();
              const today = new Date(Date.UTC(fullToday.getUTCFullYear(), fullToday.getUTCMonth(),
                fullToday.getUTCDate(), 0, 0, 0))
              if (Date.parse(today.toISOString()) - Date.parse(h.created_date + 'Z') > 0) {
                return null;
              }
              return h;
            })
          }
          q.telegram_quest_histories = q.telegram_quest_histories.filter(x => x != null);
        })
      }
      return quests;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async getQuestById(id) {
    try {
      const { telegramUserId } = ContextProvider.getAuthUser();
      const quests = await this.telegramGraphql.getTelegramQuestById({
        id: id,
        telegram_user_id: telegramUserId,
      });
      if (quests?.data) {
        quests?.data?.telegram_quests?.map((q, i) => {
          if (q.type == "Daily" && q.telegram_quest_histories) {
            q.telegram_quest_histories = q.telegram_quest_histories.map((h, j) => {
              const fullToday = new Date();
              const today = new Date(Date.UTC(fullToday.getUTCFullYear(), fullToday.getUTCMonth(),
                fullToday.getUTCDate(), 0, 0, 0))
              if (Date.parse(today.toISOString()) - Date.parse(h.created_date + 'Z') > 0) {
                return null;
              }
              return h;
            })
          }
          q.telegram_quest_histories = q.telegram_quest_histories.filter(x => x != null);
        })
      }
      return quests;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async saveQuest(id) {
    try {
      const { telegramUserId } = ContextProvider.getAuthUser();
      let quest;
      const quests = await this.getQuestById(id);

      if (quests?.data?.telegram_quests.length > 0) {
        quest = quests?.data?.telegram_quests[0];
        if (!quest) {
          return {
            errors: {
              message: JSON.stringify('Quest not found.'),
            },
          };
        }
        if (quest) {
          var history = quest.telegram_quest_histories;
          if (!history || history.length <= 0) {
            var r = await this.telegramGraphql.insertTelegramQuestHistory({
              quest_id: id,
              telegram_user_id: telegramUserId,
              is_claim: false,
            });
          } else {
            var h = history[0];
            if (h.is_claim) {
              return {
                errors: {
                  message: JSON.stringify('Quest already claimed.'),
                },
              };
            } else {
              if (
                quest.claim_after <= 0 ||
                (Date.parse(new Date().toISOString()) -
                  Date.parse(h.created_date + 'Z')) /
                1000 >=
                quest.claim_after * 60
              ) {
                var r = await this.telegramGraphql.updateTelegramQuestHistory({
                  quest_id: id,
                  telegram_user_id: telegramUserId,
                });
                const user = await this.telegramGraphql.getTelegramUser({
                  id: telegramUserId,
                });
                const chip = quest?.reward + user?.data?.telegram_user.chip;
                var res = await this.telegramGraphql.updateTelegramUserChip({
                  telegram_user_id: telegramUserId,
                  chip: chip,
                });
              }
            }
          }
        }
      } else {
        return {
          errors: {
            message: JSON.stringify('Quest not found.'),
          },
        };
      }
      var lastResponse = await this.getQuestById(id);
      return lastResponse?.data?.telegram_quests[0];
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async getTopDonate() {
    try {
      const topDonate = await this.telegramGraphql.getTopDonate();

      return topDonate;
    } catch (errors) {
      return {
        errors,
      };
    }
  }
  async getTopCreatorDonate() {
    try {
      const topDonate = await this.telegramGraphql.getTopCreatorDonate();

      return topDonate;
    } catch (errors) {
      return {
        errors,
      };
    }
  }
  async genTelegramQr() {
    try {
      const TELEGRAM_QR_SECRET =
        this.configService.get<string>('telgram.qr_secret');
      let { userId } = ContextProvider.getAuthUser();
      if (userId) {
        var message = `${userId}|${Date.parse((new Date()).toISOString())}`;
        var encrypted = AES.encrypt(message, TELEGRAM_QR_SECRET);
        return {
          data: encrypted.toString()
        }        
      } else {
        return {
          errors: [
            {
              message: 'Unauthorized'
            }
          ]
        }
      }
    } catch (errors) {
      return {
        errors,
      };
    }
  }
  async linkFromScan(data: any) {
    const { telegramUserId } = ContextProvider.getAuthUser();
    try {
      const TELEGRAM_QR_SECRET =
        this.configService.get<string>('telgram.qr_secret');
      var decrypted = AES.decrypt(data?.data, TELEGRAM_QR_SECRET)?.toString(CryptoJS.enc.Utf8);
      if (decrypted && decrypted.indexOf('|') != -1) {
        let arr = decrypted.split('|');
        const time = new Date(arr[1]);
        var seconds = (new Date().getTime() - time.getTime()) / 1000;
        if (seconds <= 300) {
          const userId = arr[0];
          if (userId) {
            const updateResult = await this.telegramGraphql.updateTelegramUser({
              id: telegramUserId,
              user_id: userId,
            });
            if (updateResult.errors) return updateResult;
            const payload = {
              'https://hasura.io/jwt/claims': {
                'x-hasura-allowed-roles': [Role.User],
                'x-hasura-default-role': Role.User,
                'x-hasura-user-email':
                  updateResult.data.telegram_user.authorizer_user.email,
                'x-hasura-user-id':
                  updateResult.data.telegram_user.authorizer_user.id,
              },
            };
            const privateKey = await readFile(
              path.resolve(__dirname, '../../../private.pem')
            );
            const access_token = await this.jwtService.signAsync(payload, {
              algorithm: 'RS256',
              privateKey,
            });
            updateResult.data.telegram_user.authorizer_user.token = access_token;
            return updateResult;
          } else {
            return {
              errors: [
                {
                  message: 'User Id is not valid'
                }
              ]
            }
          }
        } else {
          return {
            errors: [
              {
                message: 'Expired'
              }
            ]
          }
        }
      }
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
