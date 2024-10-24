import {
  decodeEventLog,
  defineChain,
  TransactionReceipt,
  zeroAddress,
} from 'viem';

import bs58 from 'bs58';

import { abi as ipAssetRegistryAbi } from '../../abi/IPAssetRegistry.json';

export const iliad = defineChain({
  id: 15_13,
  name: 'iliad',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://testnet.storyrpc.io'],
      webSocket: ['wss://story-network.rpc.caldera.xyz/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Explorer',
      url: 'https://testnet.storyscan.xyz',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 5882,
    },
  },
  testnet: true,
});

/**
 * parse tx receipt event IPRegistered for contract IPAssetRegistry
 */
export const parseTxIpRegisteredEvent = (
  txReceipt: TransactionReceipt
): Array<any> => {
  const targetLogs: Array<any> = [];
  for (const log of txReceipt.logs as any[]) {
    try {
      const event = decodeEventLog({
        abi: ipAssetRegistryAbi,
        eventName: 'IPRegistered',
        data: log.data,
        topics: log.topics,
      });
      if (event.eventName === 'IPRegistered') {
        targetLogs.push(event.args);
      }
    } catch (e) {
      /* empty */
    }
  }
  return targetLogs;
};

export const defaultPILTerms = {
  transferable: true,
  royaltyPolicy: zeroAddress,
  mintingFee: 0,
  expiration: 0,
  commercialUse: false,
  commercialAttribution: false,
  commercializerChecker: zeroAddress,
  commercializerCheckerData: '0x',
  commercialRevShare: 0,
  commercialRevCelling: 0,
  derivativesAllowed: true,
  derivativesAttribution: true,
  derivativesApproval: false,
  derivativesReciprocal: true,
  derivativeRevCelling: 0,
  currency: zeroAddress,
  uri: '',
  licenseTermsIds: ['1'],
  royaltyContext: '0x',
  ipMetadataHash: '0x',
};

export const getBytes32FromIpfsHash = (ipfsListing: string) => {
  return '0x' + Buffer.from(bs58.decode(ipfsListing).slice(2)).toString('hex');
};

export function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
