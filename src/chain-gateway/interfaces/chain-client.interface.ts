import { JsonRpcProvider } from 'ethers';
import { ICustodialWalletAsset } from './account-onchain.interface';

export interface IChainClient {
  // get wallet asset
  getWalletAsset(address: string): Promise<ICustodialWalletAsset>;

  // faucet
  faucet(address: string, balance: number): Promise<number>;

  // update user xp
  updateUserXp(
    walletAddress: string,
    level: number,
    xp: number
  ): Promise<string>;

  // send native token
  sendNativeToken(
    custodialWalletAsset: any,
    availableBalance: number,
    wallet: any,
    to: string
  ): Promise<string>;

  // send nft
  sendNft(
    custodialWalletAsset: any,
    wallet: any,
    from: string,
    to: string
  ): Promise<string[]>;
}
