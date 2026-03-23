export interface CoinMeta {
  symbol: string
  name: string
  imageUrl: string | null
  description: string | null
}

export interface CoinMetadataResponse {
  coins: CoinMeta[]
}
