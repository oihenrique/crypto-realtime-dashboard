import type { TickerEntry } from "@/lib/features/ticker/ticker.types"
import {
  type BinanceCombinedTickerMessage,
  type BinanceTickerPayload,
} from "@/lib/integrations/binance/binance.types"

const BINANCE_BASE_URL = "wss://stream.binance.com:9443/stream?streams="

export function buildBinanceStreamUrl(symbols: string[]) {
  const streams = symbols
    .map((symbol) => `${symbol.toLowerCase()}@ticker`)
    .join("/")

  return `${BINANCE_BASE_URL}${streams}`
}

export function parseBinanceTickerMessage(rawMessage: string) {
  const parsedMessage = JSON.parse(rawMessage) as
    | BinanceCombinedTickerMessage
    | BinanceTickerPayload

  return "data" in parsedMessage ? parsedMessage.data : parsedMessage
}

export function normalizeBinanceTicker(
  payload: BinanceTickerPayload
): TickerEntry {
  return {
    symbol: payload.s,
    price: Number.parseFloat(payload.c),
    previousPrice: null,
    priceChange: Number.parseFloat(payload.p),
    changePercent: Number.parseFloat(payload.P),
    high: Number.parseFloat(payload.h),
    low: Number.parseFloat(payload.l),
    volume: Number.parseFloat(payload.v),
    quoteVolume: Number.parseFloat(payload.q),
    eventTime: payload.E,
    updatedAt: Date.now(),
    priceDirection: "flat",
    priceFlashAt: null,
  }
}

export function hasMeaningfulPriceChange(
  previousTicker: TickerEntry | undefined,
  nextTicker: TickerEntry,
  thresholdPercent: number
) {
  if (!previousTicker || previousTicker.price === 0) {
    return true
  }

  const priceDelta =
    Math.abs(nextTicker.price - previousTicker.price) / previousTicker.price

  return priceDelta * 100 >= thresholdPercent
}
