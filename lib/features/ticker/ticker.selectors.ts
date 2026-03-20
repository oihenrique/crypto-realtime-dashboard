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

export const selectTickerCards = createSelector([selectTickerState], (ticker) =>
  ticker.symbols.map((symbol) => ticker.bySymbol[symbol]).filter(Boolean)
)
