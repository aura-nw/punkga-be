import axios from 'axios';
import { Contract, JsonRpcProvider } from 'ethers';

import {
  JsonRpcProvider as KlaytnJsonRpcProvider,
  Wallet as KlaytnWallet,
} from '@kaiachain/ethers-ext';
import { formatKaiaUnits, TxType } from '@kaiachain/js-ext-core';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { abi as levelingAbi } from '../abi/PunkgaReward.json';
import { SysKeyService } from '../modules/keys/syskey.service';
import { SystemCustodialWalletService } from '../modules/system-custodial-wallet/system-custodial-wallet.service';
import { MasterWalletService } from '../modules/user-wallet/master-wallet.service';
import { UserWalletService } from '../modules/user-wallet/user-wallet.service';
import { ChainGatewayGraphql } from './chain-gateway.graphql';
import {
  IAccountBalance,
  ICustodialWalletAsset,
  ICw721Token,
} from './interfaces/account-onchain.interface';

@Injectable()
export class KlaytnClientService {
  private readonly logger = new Logger(KlaytnClientService.name);
  private provider: JsonRpcProvider;
  private klaytnProvider: KlaytnJsonRpcProvider;
  private levelingContractAddress: string;
  private klaytnGranterWallet: KlaytnWallet = null;
  private klaytnMasterWallet: KlaytnWallet = null;

  constructor(
    private configSvc: ConfigService,
    private masterWalletService: MasterWalletService,
    private chainGatewayGraphql: ChainGatewayGraphql,
    private sysKeyService: SysKeyService,
    private userWalletService: UserWalletService,
    private systemWalletSvc: SystemCustodialWalletService
  ) {}

  // async onModuleInit() {
  //   await this.initKlaytnGranterWallet();
  // }

  // async initKlaytnGranterWallet() {
  //   // get from db
  //   const granterWalletData = await this.chainGatewayGraphql.getGranterWallet({
  //     chain: 'klaytn',
  //   });
  //   if (granterWalletData) {
  //     const privateKey = this.sysKeyService.decrypt(
  //       granterWalletData.cipher_prv_key
  //     );
  //     const wallet = new Wallet(privateKey, this.provider);

  //     this.granterWallet = wallet;

  //     if (!granterWalletData.cipher_prv_key) {
  //       const updateResult = this.chainGatewayGraphql.updateGranterWallet({
  //         id: granterWalletData.id,
  //         data: {
  //           cipher_prv_key: this.sysKeyService.cipher(
  //             this.granterWallet.privateKey
  //           ),
  //           public_key: wallet.publicKey,
  //         },
  //       });

  //       this.logger.debug(
  //         `Update granter wallet result: ${JSON.stringify(updateResult)}`
  //       );
  //     }
  //   } else {
  //     const wallet = Wallet.createRandom(this.provider);
  //     // const { wallet, address, cipherPhrase, cipherPrvKey } =
  //     //   await this.sysKeyService.randomWallet();

  //     this.granterWallet = wallet;

  //     // store db
  //     const result = await this.chainGatewayGraphql.insertGranterWallet({
  //       objects: [
  //         {
  //           address: wallet.address,
  //           cipher_prv_key: this.sysKeyService.cipher(wallet.privateKey),
  //           public_key: wallet.publicKey,
  //           data: this.sysKeyService.cipher(wallet.mnemonic.phrase),
  //           type: 'GRANTER',
  //           chain: 'klaytn',
  //         },
  //       ],
  //     });

  //     this.logger.debug(`Insert granter wallet: ${JSON.stringify(result)}`);
  //   }

  //   this.logger.debug(`private: ${this.granterWallet.privateKey}`);
  //   this.logger.debug(`public ${this.granterWallet.publicKey}`);
  // }

  configuration(rpc: string, levelingContractAddress: string) {
    this.provider = new JsonRpcProvider(rpc);
    this.klaytnProvider = new KlaytnJsonRpcProvider(rpc);
    this.levelingContractAddress = levelingContractAddress;

    this.loadKlaytnWallet();
  }

  loadKlaytnWallet() {
    if (!this.klaytnGranterWallet) {
      this.klaytnGranterWallet = new KlaytnWallet(
        this.systemWalletSvc.granterWallet.privateKey,
        this.klaytnProvider
      );
    }

    if (!this.klaytnMasterWallet) {
      this.klaytnMasterWallet = new KlaytnWallet(
        this.masterWalletService.getMasterWallet().wallet.privateKey,
        this.klaytnProvider
      );
    }

    // this.logger.debug(`private: ${this.granterWallet.privateKey}`);
    this.logger.debug(`public ${this.klaytnGranterWallet.publicKey}`);
  }

  async feeDelegatedUpdateUserXp(
    walletAddress: string,
    level = 0,
    xp = 0
  ): Promise<string> {
    const contract = new Contract(this.levelingContractAddress, levelingAbi);
    const data = (
      await contract.getFunction('updateUserInfo')(walletAddress, level, xp)
    ).data;

    let tx = {
      type: TxType.FeeDelegatedSmartContractExecution,
      from: this.klaytnMasterWallet.address,
      to: this.levelingContractAddress,
      value: 0,
      data,
    };

    // Sign transaction by sender
    const populatedTx = await this.klaytnMasterWallet.populateTransaction(tx);
    const senderTxHashRLP = await this.klaytnMasterWallet.signTransaction(
      populatedTx
    );
    console.log('senderTxHashRLP', senderTxHashRLP);

    // Sign and send transaction by fee payer
    const sentTx = await this.klaytnGranterWallet.sendTransactionAsFeePayer(
      senderTxHashRLP
    );
    const receipt = await sentTx.wait();

    return receipt.transactionHash;
  }

  async getWalletAsset(address: string) {
    // get native token balance
    const ethbalance = await this.provider.getBalance(address);
    const balance = {
      amount: formatKaiaUnits(ethbalance, 'ether'),
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
