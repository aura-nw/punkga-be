import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ContextProvider } from '../../providers/contex.provider';
import { ChainGraphql } from './chain.graphql';
import { CreateChainDto } from './dto/create-chain.dto';

@Injectable()
export class ChainService {
  private readonly logger = new Logger(ChainService.name);

  constructor(
    private configService: ConfigService,
    private chainGraphql: ChainGraphql
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

    return insertResult;
  }
}
