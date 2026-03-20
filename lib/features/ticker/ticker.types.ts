export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"

export interface TickerEntry {
  symbol: string
  price: number
  priceChange: number
  changePercent: number
  high: number
  low: number
  volume: number
  quoteVolume: number
  eventTime: number
  updatedAt: number
}
