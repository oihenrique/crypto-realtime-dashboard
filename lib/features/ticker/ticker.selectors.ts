import { createSelector } from "@reduxjs/toolkit"

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
