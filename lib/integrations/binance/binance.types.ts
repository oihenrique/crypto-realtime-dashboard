export interface BinanceTickerPayload {
  E: number
  P: string
  c: string
  h: string
  l: string
  p: string
  q: string
  s: string
  v: string
}

export interface BinanceCombinedTickerMessage {
  stream: string
  data: BinanceTickerPayload
}
