export interface IAccountBalance {
  denom: string
  amount: string
}

export interface ICw721Token {
  tokenId: string
  contractAddress: string
}

export interface ICustodialWalletAsset {
  balance: IAccountBalance
  cw721Tokens: ICw721Token[]
}