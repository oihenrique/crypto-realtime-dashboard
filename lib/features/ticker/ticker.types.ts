export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error"

export interface TickerEntry {
  symbol: string
  price: number
  previousPrice: number | null
  priceChange: number
  changePercent: number
  high: number
  low: number
  volume: number
  quoteVolume: number
  eventTime: number
  updatedAt: number
  priceDirection: "up" | "down" | "flat"
  priceFlashAt: number | null
}
