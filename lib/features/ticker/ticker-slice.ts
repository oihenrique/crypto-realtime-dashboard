import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { ConnectionStatus, TickerEntry } from "@/lib/features/ticker/ticker.types"

export interface TickerState {
  bySymbol: Record<string, TickerEntry>
  symbols: string[]
  trackedSymbols: string[]
  connectionStatus: ConnectionStatus
  lastMessageAt: number | null
  error: string | null
}

const initialState: TickerState = {
  bySymbol: {},
  symbols: [],
  trackedSymbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"],
  connectionStatus: "idle",
  lastMessageAt: null,
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
      state.error = null
    },
    socketConnected(state) {
      state.connectionStatus = "connected"
      state.error = null
    },
    socketDisconnected(state) {
      state.connectionStatus = "disconnected"
    },
    socketError(state, action: PayloadAction<string>) {
      state.connectionStatus = "error"
      state.error = action.payload
    },
    upsertTickers(state, action: PayloadAction<TickerEntry[]>) {
      for (const ticker of action.payload) {
        state.bySymbol[ticker.symbol] = ticker

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
  socketError,
  upsertTickers,
} = tickerSlice.actions

export const tickerReducer = tickerSlice.reducer
