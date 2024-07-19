import { Injectable } from '@nestjs/common';
import { AuraClientService } from './aura.service';
import { KlaytnClientService } from './klaytn.service';

@Injectable()
export class ChainGatewayService {
  constructor(
    private auraClient: AuraClientService,
    private klaytnClient: KlaytnClientService
  ) {}

  /**
   *
   * @param chain
   * @param rpc
   * @returns
   */
  configuaration(chain: string, rpc: string, contractAddress: string) {
    switch (chain) {
      case 'aura':
        return this.auraClient.configuration(rpc, contractAddress);
      case 'klaytn':
        return this.klaytnClient.configuration(rpc, contractAddress);
      default:
        throw new Error('chain not supported');
    }
  }

  /**
   *
   * @param chain
   * @param address
   * @returns
   */
  getWalletAsset(chain: string, address: string) {
    switch (chain) {
      case 'aura':
        return this.auraClient.getWalletAsset(address);
      case 'klaytn':
        return this.klaytnClient.getWalletAsset(address);
      default:
        throw new Error('chain not supported');
    }
  }

  /**
   *
   * @param chain
   * @param address
   * @param balance
   * @returns
   */
  faucet(chain: string, address: string, balance: number) {
    switch (chain) {
      case 'aura':
        return this.auraClient.faucet(address, balance);
      case 'klaytn':
        return this.klaytnClient.faucet(address, balance);

      default:
        throw new Error('chain not supported');
    }
  }

  /**
   *
   * @param chain
   * @param walletAddress
   * @param level
   * @param xp
   * @returns
   */
  updateUserXp(chain: string, walletAddress: string, level = 0, xp = 0) {
    switch (chain) {
      case 'aura':
        return this.auraClient.updateUserXp(walletAddress, level, xp);
      case 'klaytn':
        return this.klaytnClient.updateUserXp(walletAddress, level, xp);

      default:
        throw new Error('chain not supported');
    }
  }

  /**
   * send native token  from custodial wallet to user wallet
   * @param chain
   * @param custodialWalletAsset
   * @param availableBalance
   * @param wallet
   * @param to
   * @returns
   */
  sendNativeToken(
    chain: string,
    custodialWalletAsset: any,
    availableBalance: number,
    wallet: any,
    to: string
  ) {
    switch (chain) {
      case 'aura':
        return this.auraClient.sendNativeToken(
          custodialWalletAsset,
          availableBalance,
          wallet,
          to
        );

      default:
        throw new Error('chain not supported');
    }
  }

  /**
   *
   * @param chain
   * @param custodialWalletAsset
   * @param wallet
   * @param from
   * @param to
   * @returns
   */
  sendNft(
    chain: string,
    custodialWalletAsset: any,
    wallet: any,
    from: string,
    to: string
  ) {
    switch (chain) {
      case 'aura':
        return this.auraClient.sendNft(custodialWalletAsset, wallet, from, to);

      default:
        throw new Error('chain not supported');
    }
  }
}
