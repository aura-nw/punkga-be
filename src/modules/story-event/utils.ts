import { decodeEventLog, defineChain, TransactionReceipt } from 'viem';
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
