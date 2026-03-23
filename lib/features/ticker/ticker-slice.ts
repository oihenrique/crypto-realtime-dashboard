import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type {
  ConnectionStatus,
  TickerEntry,
} from "@/lib/features/ticker/ticker.types"

export interface TickerState {
  bySymbol: Record<string, TickerEntry>
  symbols: string[]
  trackedSymbols: string[]
  connectionStatus: ConnectionStatus
  lastMessageAt: number | null
  reconnectAttempt: number
  nextReconnectAt: number | null
  error: string | null
}

const initialState: TickerState = {
  bySymbol: {},
  symbols: [],
  trackedSymbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"],
  connectionStatus: "idle",
  lastMessageAt: null,
  reconnectAttempt: 0,
  nextReconnectAt: null,
  error: null,
}

const tickerSlice = createSlice({
  name: "ticker",
  initialState,
  reducers: {
    setTrackedSymbols(state, action: PayloadAction<string[]>) {
      state.trackedSymbols = action.payload
    },
    socketConnecting(state) {
      state.connectionStatus = "connecting"
      state.nextReconnectAt = null
      state.error = null
    },
    socketConnected(state) {
      state.connectionStatus = "connected"
      state.reconnectAttempt = 0
      state.nextReconnectAt = null
      state.error = null
    },
    socketDisconnected(state) {
      state.connectionStatus = "disconnected"
      state.nextReconnectAt = null
    },
    socketReconnectScheduled(
      state,
      action: PayloadAction<{ attempt: number; reconnectAt: number }>
    ) {
      state.connectionStatus = "reconnecting"
      state.reconnectAttempt = action.payload.attempt
      state.nextReconnectAt = action.payload.reconnectAt
    },
    socketError(state, action: PayloadAction<string>) {
      state.connectionStatus = "error"
      state.error = action.payload
    },
    resetTickerRuntimeState(state) {
      return {
        ...initialState,
        trackedSymbols: state.trackedSymbols,
      }
    },
    upsertTickers(state, action: PayloadAction<TickerEntry[]>) {
      for (const ticker of action.payload) {
        const previousTicker = state.bySymbol[ticker.symbol]
        const previousPrice = previousTicker?.price ?? null
        const priceDirection =
          previousPrice === null
            ? "flat"
            : ticker.price > previousPrice
              ? "up"
              : ticker.price < previousPrice
                ? "down"
                : "flat"

        state.bySymbol[ticker.symbol] = {
          ...ticker,
          previousPrice,
          priceDirection,
          priceFlashAt: priceDirection === "flat" ? null : Date.now(),
        }

        if (!state.symbols.includes(ticker.symbol)) {
          state.symbols.push(ticker.symbol)
          state.symbols.sort()
        }
      }

      state.lastMessageAt = Date.now()
    },
  },
})

export const {
  setTrackedSymbols,
  socketConnecting,
  socketConnected,
  socketDisconnected,
  socketReconnectScheduled,
  socketError,
  resetTickerRuntimeState,
  upsertTickers,
} = tickerSlice.actions

export const tickerReducer = tickerSlice.reducer
