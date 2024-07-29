import { Injectable } from '@nestjs/common';
import { GraphqlService } from '../modules/graphql/graphql.service';
import { IChainClient } from './interfaces/chain-client.interface';
import { ConfigService } from '@nestjs/config';
import {
  IAccountBalance,
  ICustodialWalletAsset,
  ICw721Token,
} from './interfaces/account-onchain.interface';
import { SystemCustodialWalletService } from '../modules/system-custodial-wallet/system-custodial-wallet.service';
import { MasterWalletService } from '../modules/user-wallet/master-wallet.service';
import { UserWalletService } from '../modules/user-wallet/user-wallet.service';
import { JsonRpcProvider } from 'ethers';

@Injectable()
export class AuraClientService implements IChainClient {
  private provider: JsonRpcProvider;
  private levelingContractAddress: string;

  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService,
    private systemWalletSvc: SystemCustodialWalletService,
    private masterWalletService: MasterWalletService,
    private userWalletService: UserWalletService
  ) {}

  configuration(rpc: string, levelingContractAddress: string) {
    this.provider = new JsonRpcProvider(rpc);
    this.levelingContractAddress = levelingContractAddress;
  }

  async getWalletAsset(address: string) {
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
      result.data[network].account_balance.length === 0
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

  async faucet(address: string, balance: number): Promise<number> {
    // faucet if wallet balance < fee required
    // transfer token from granter wallet to user custodial wallet
    // check wallet balance
    const fee = 0.01 * 10 ** 6;
    const availableBalance = balance - fee;

    if (availableBalance < 0)
      await this.systemWalletSvc.faucet(address, this.provider);

    return availableBalance;
  }

  async updateUserXp(
    walletAddress: string,
    level = 0,
    xp = 0
  ): Promise<string> {
    const contractWithMasterWallet =
      this.masterWalletService.getLevelingContract(
        this.levelingContractAddress,
        this.provider
      );
    const updateXpTx = await contractWithMasterWallet.updateUserInfo(
      walletAddress,
      level,
      xp
    );
    const tx = await updateXpTx.wait();
    return tx.hash;
  }

  /**
   * send native token  from custodial wallet to user wallet
   * @param custodialWalletAsset
   * @param availableBalance
   * @param wallet
   * @param to
   * @returns
   */
  async sendNativeToken(
    custodialWalletAsset: any,
    availableBalance: number,
    wallet: any,
    to: string
  ): Promise<string> {
    if (
      !!custodialWalletAsset.balance &&
      Number(custodialWalletAsset.balance.amount) > 0 &&
      availableBalance > 0
    ) {
      const evmAvailableBalance = (availableBalance * 10 ** 12).toString();
      const nonce = await wallet.getNonce();
      const tx = await wallet.sendTransaction({
        nonce,
        to,
        value: evmAvailableBalance,
      });

      const txResult = tx.wait();
      return txResult.hash;
    }
  }

  async sendNft(
    custodialWalletAsset: any,
    wallet: any,
    from: string,
    to: string
  ): Promise<string[]> {
    const transferNftHash: string[] = [];
    if (custodialWalletAsset.cw721Tokens.length > 0) {
      const contract = this.userWalletService.getLevelingContract(
        wallet,
        this.levelingContractAddress,
        this.provider
      );

      const validTokens = custodialWalletAsset.cw721Tokens.filter(
        (token) =>
          token.contractAddress.toLocaleLowerCase() ===
          this.levelingContractAddress.toLocaleLowerCase()
      );
      for (let i = 0; i < validTokens.length; i++) {
        const tx = await contract.safeTransferFrom(
          from,
          to,
          validTokens[i].tokenId
        );
        const result = await tx.wait();
        transferNftHash.push(result.hash);
      }
    }

    return transferNftHash;
  }
}
