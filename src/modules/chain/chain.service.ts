import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ContextProvider } from '../../providers/contex.provider';
import { ChainGraphql } from './chain.graphql';
import { CreateChainDto } from './dto/create-chain.dto';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { Wallet } from 'ethers';

@Injectable()
export class ChainService {
  private readonly logger = new Logger(ChainService.name);

  constructor(
    private configService: ConfigService,
    private chainGraphql: ChainGraphql,
    private masterWalletService: MasterWalletService
  ) {}

  async create(data: CreateChainDto) {
    const { token } = ContextProvider.getAuthUser();

    const { name, rpc, chain_id, address_type, contracts, punkga_config } =
      data;
    const insertData = {
      object: {
        name,
        rpc,
        chain_id,
        address_type,
        contracts,
        punkga_config,
      },
    };
    const insertResult = await this.chainGraphql.createChain(insertData, token);
    if (insertResult.errors) return insertResult;

    /**
     * Generate custodial wallet address
     */
    // get user custodial wallet
    let count = 0;
    let offset = 0;

    do {
      const queryResult = await this.chainGraphql.getUserWallets(
        {
          limit: 20,
          offset,
        },
        token
      );
      if (queryResult.errors) return queryResult;

      count = queryResult.data.user_wallet.length;
      offset += count;

      const objects = queryResult.data.user_wallet.map((item) => {
        const phrase = this.masterWalletService.decryptPhrase(item.data);
        // generate evm address
        const wallet = Wallet.fromPhrase(phrase);
        const address = wallet.address;
        return {
          address,
          address_type,
          custodial_wallet_id: item.id,
          user_id: item.user_id,
          chain_id: insertResult.data.insert_chains_one.id,
        };
      });

      if (objects.length > 0) {
        // insert address to db
        const insertAddressResult =
          await this.chainGraphql.insertCustodialAddress(
            {
              objects,
            },
            token
          );

        if (insertAddressResult.errors) return insertAddressResult;
      }
    } while (count > 0);

    return insertResult;
  }
}
