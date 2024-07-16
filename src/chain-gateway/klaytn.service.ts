import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IAccountBalance,
  ICustodialWalletAsset,
  ICw721Token,
} from './interfaces/account-onchain.interface';
import { SystemCustodialWalletService } from '../modules/system-custodial-wallet/system-custodial-wallet.service';
import { MasterWalletService } from '../modules/user-wallet/master-wallet.service';
import { UserWalletService } from '../modules/user-wallet/user-wallet.service';
import { JsonRpcProvider, formatUnits } from 'ethers';

@Injectable()
export class KlaytnClientService {
  private provider: JsonRpcProvider;
  private levelingContractAddress: string;

  constructor(
    private configSvc: ConfigService,
    private systemWalletSvc: SystemCustodialWalletService,
    private masterWalletService: MasterWalletService,
    private userWalletService: UserWalletService
  ) {}

  configuration(rpc: string, levelingContractAddress: string) {
    this.provider = new JsonRpcProvider(rpc);
    this.levelingContractAddress = levelingContractAddress;
  }

  async getWalletAsset(address: string) {
    // get native token balance
    const ethbalance = await this.provider.getBalance(address);
    const balance = {
      amount: formatUnits(ethbalance, 'ether'),
      denom: '',
    } as IAccountBalance;

    console.log(JSON.stringify(balance));

    // get nft
    const host = this.configSvc.get<string>('klaytn.oklink.url');
    const accessToken = this.configSvc.get<string>('klaytn.oklink.accessKey');
    const result = await axios.get(
      `${host}/api/v5/explorer/address/token-balance?chainShortName=klaytn&address=${address}&protocolType=token_721`,
      {
        headers: {
          'Ok-Access-Key': accessToken,
        },
      }
    );
    const cw721Tokens: ICw721Token[] = result.data?.data[0]?.tokenList
      .filter(
        (token) => token.tokenContractAddress === this.levelingContractAddress
      )
      .map((token) => ({
        tokenId: token.tokenId,
        contractAddress: token.tokenContractAddress,
      }));

    return {
      balance,
      cw721Tokens,
    } as ICustodialWalletAsset;
  }

  async faucet(address: string, balance: number): Promise<number> {
    // faucet if wallet balance < fee required
    // transfer token from granter wallet to user custodial wallet
    // check wallet balance
    const fee = 0.01;
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
