import { toUtf8 } from "@cosmjs/encoding";
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import {
  SystemCustodialWalletService
} from '../system-custodial-wallet/system-custodial-wallet.service';
import { UserWalletService } from '../user-wallet/user-wallet.service';
import { ICustodialWalletAsset } from './interfaces/account-onchain.interface';
import { UserGraphql } from './user.graphql';
import { coin } from '@cosmjs/amino';
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";

interface IMigrateWalletRequest {
  requestId: number,
  userId: string
}

@Processor('userWallet')
export class UserWalletProcessor {
  private readonly logger = new Logger(UserWalletProcessor.name);

  constructor(
    private configService: ConfigService,
    private redisClientService: RedisService,
    private userWalletService: UserWalletService,
    private userGraphql: UserGraphql,
    private systemWalletSvc: SystemCustodialWalletService
  ) { }

  @Process({ name: 'migrate-wallet', concurrency: 1 })
  async migrateWallet() {
    const env = this.configService.get<string>('app.env') || 'prod';
    const redisData = await this.redisClientService.popListRedis(`punkga-${env}:migrate-user-wallet`, 1);
    if (redisData.length === 0) return true;

    const { userId, requestId } = redisData.map((dataStr) => JSON.parse(dataStr) as IMigrateWalletRequest)[0]

    try {
      // get user wallet
      const user = await this.userGraphql.adminGetUserAddress({
        id: userId
      })

      if (!user.wallet_address || user.wallet_address === '') throw new Error('User address is empty')

      // check asset in custodial wallet
      const custodialWalletAsset = await this.userGraphql.queryCustodialWaleltAsset(user.wallet_address);
      if (!this.isEmptyWallet(custodialWalletAsset)) {
        // fee grant
        const msgs = this.systemWalletSvc.generateGrantFeeMsg(user.wallet_address);
        const tx = await this.systemWalletSvc.broadcastTx(msgs);
        this.logger.debug(`Feegrant success ${tx.transactionHash}`)

        // transfer asset
        // generate msg
        const { wallet, address } = await this.userWalletService.deserialize(userId);
        const transferMsgs = this.generateTransferMsgs(wallet, user.wallet_address, custodialWalletAsset);

        const gasPrice = GasPrice.fromString(
          this.configService.get<string>('network.gasPrice')
        );
        const rpcEndpoint = this.configService.get<string>('network.rpcEndpoint');
        const client = await SigningCosmWasmClient.connectWithSigner(
          rpcEndpoint,
          wallet,
          {
            gasPrice,
          }
        );

        const transferTx = await client.signAndBroadcast(
          address,
          transferMsgs,
          'auto',
          'punkga'
        )

        // update request
        await this.userGraphql.updateRequestLogs({
          ids: [requestId],
          log: transferTx.transactionHash,
          status: 'SUCCEEDED'
        })



        this.logger.debug(`Migrate wallet success!!!`)
      }
    } catch (error) {
      this.logger.error(JSON.stringify(error));
      await this.userGraphql.updateRequestLogs({
        ids: [requestId],
        log: error.toString(),
        status: 'FAILED'
      })
    }

  }

  generateTransferMsgs(custodialWalletAddr, personalWalletAddr, walletAsset: ICustodialWalletAsset) {
    const msgs = [];
    if (Number(walletAsset.balance.amount) > 0) {
      msgs.push({
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: MsgSend.fromPartial({
          fromAddress: custodialWalletAddr,
          toAddress: personalWalletAddr,
          amount: [coin(walletAsset.balance.amount, walletAsset.balance.denom)],
        })
      });
    }

    if (walletAsset.cw721Tokens.length > 0) {
      msgs.push(...walletAsset.cw721Tokens.map((cw721Token) => {
        const msg = {
          transfer_nft: {
            recipient: personalWalletAddr,
            token_id: cw721Token.tokenId
          }
        }
        return {
          typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
          value: {
            msg: toUtf8(JSON.stringify(msg)),
            sender: custodialWalletAddr,
            contract: cw721Token.contractAddress,
            funds: []
          },
        };
      }));
    }

    return msgs;
  }

  isEmptyWallet(walletAsset: ICustodialWalletAsset) {

    if (Number(walletAsset.balance.amount) > 0) return false;

    if (walletAsset.cw721Tokens.length > 0) return false;

    return true;
  }
}


