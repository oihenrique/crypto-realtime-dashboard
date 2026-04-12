import { createSelector } from "@reduxjs/toolkit"

import { selectMetaBySymbol } from "@/lib/features/meta/meta.selectors"
import type { TickerEntry } from "@/lib/features/ticker/ticker.types"
import type { RootState } from "@/lib/store/store"

export const selectTickerState = (state: RootState) => state.ticker

export const selectTrackedSymbols = createSelector(
  [selectTickerState],
  (ticker) => ticker.trackedSymbols
)

export const selectConnectionStatus = createSelector(
  [selectTickerState],
  (ticker) => ticker.connectionStatus
)

export const selectLastMessageAt = createSelector(
  [selectTickerState],
  (ticker) => ticker.lastMessageAt
)

export const selectReconnectAttempt = createSelector(
  [selectTickerState],
  (ticker) => ticker.reconnectAttempt
)

export const selectNextReconnectAt = createSelector(
  [selectTickerState],
  (ticker) => ticker.nextReconnectAt
)

export const selectTickerCards = createSelector([selectTickerState], (ticker) =>
  ticker.symbols.map((symbol) => ticker.bySymbol[symbol]).filter(Boolean)
)

export const selectTopGainers = createSelector([selectTickerCards], (tickers) =>
  [...tickers]
    .sort((left, right) => right.changePercent - left.changePercent)
    .slice(0, 3)
)

export const selectTopVolume = createSelector([selectTickerCards], (tickers) =>
  [...tickers].sort((left, right) => right.quoteVolume - left.quoteVolume)[0] ??
  null
)

export const selectFeaturedTickers = createSelector(
  [selectTickerCards],
  (tickers) => {
    const featuredSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
    const featuredTickers: TickerEntry[] = []

    for (const symbol of featuredSymbols) {
      const ticker = tickers.find((entry) => entry.symbol === symbol)

      if (ticker) {
        featuredTickers.push(ticker)
      }
    }

    return featuredTickers
  }
)

export const selectTickerRows = createSelector(
  [selectTickerCards, selectMetaBySymbol],
  (tickers, metaBySymbol) =>
    [...tickers]
      .sort((left, right) => right.quoteVolume - left.quoteVolume)
      .map((ticker) => ({
        ...ticker,
        displayName: metaBySymbol[ticker.symbol]?.name ?? ticker.symbol,
        imageUrl: metaBySymbol[ticker.symbol]?.imageUrl ?? null,
        description: metaBySymbol[ticker.symbol]?.description ?? null,
      }))
)

export const selectDominanceByVolume = createSelector([selectTickerCards], (tickers) => {
  const totalVolume = tickers.reduce((sum, t) => sum + t.quoteVolume, 0)
  const btc = tickers.find((t) => t.symbol === "BTCUSDT")?.quoteVolume ?? 0
  const eth = tickers.find((t) => t.symbol === "ETHUSDT")?.quoteVolume ?? 0
  if (totalVolume === 0) {
    return { btcPercent: 0, ethPercent: 0, totalVolume: 0 }
  }
  return {
    btcPercent: (btc / totalVolume) * 100,
    ethPercent: (eth / totalVolume) * 100,
    totalVolume,
  }
})
