import type { Middleware } from "@reduxjs/toolkit"

import {
  socketConnected,
  socketConnecting,
  socketDisconnected,
  socketError,
  socketReconnectScheduled,
  type TickerState,
  upsertTickers,
} from "@/lib/features/ticker/ticker-slice"
import type { TickerEntry } from "@/lib/features/ticker/ticker.types"
import {
  buildBinanceStreamUrl,
  hasMeaningfulPriceChange,
  normalizeBinanceTicker,
  parseBinanceTickerMessage,
} from "@/lib/integrations/binance/binance.utils"
import { connectSocket, disconnectSocket } from "@/lib/store/socket-actions"

const FLUSH_INTERVAL_MS = 500
const PRICE_CHANGE_THRESHOLD_PERCENT = 0.05
const INITIAL_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 15000

interface RootStateLike {
  ticker: TickerState
}

export const socketMiddleware: Middleware = (storeApi) => {
  let socket: WebSocket | null = null
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let bufferedTickers = new Map<string, TickerEntry>()
  let reconnectAttempt = 0
  let activeSymbols: string[] = []

  function clearReconnectTimer() {
    if (!reconnectTimer) {
      return
    }

    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  function cleanupSocket() {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }

    bufferedTickers.clear()

    if (socket) {
      socket.onopen = null
      socket.onmessage = null
      socket.onerror = null
      socket.onclose = null
      socket.close()
      socket = null
    }
  }

  function scheduleReconnect() {
    if (activeSymbols.length === 0 || reconnectTimer) {
      return
    }

    reconnectAttempt += 1

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * 2 ** (reconnectAttempt - 1),
      MAX_RECONNECT_DELAY_MS
    )
    const reconnectAt = Date.now() + delay

    storeApi.dispatch(
      socketReconnectScheduled({
        attempt: reconnectAttempt,
        reconnectAt,
      })
    )

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      storeApi.dispatch(connectSocket({ symbols: activeSymbols }))
    }, delay)
  }

  function flushBufferedTickers() {
    if (bufferedTickers.size === 0) {
      return
    }

    storeApi.dispatch(upsertTickers([...bufferedTickers.values()]))
    bufferedTickers = new Map()
    flushTimer = null
  }

  function scheduleFlush() {
    if (flushTimer) {
      return
    }

    flushTimer = setTimeout(flushBufferedTickers, FLUSH_INTERVAL_MS)
  }

  return (next) => (action) => {
    if (connectSocket.match(action)) {
      if (typeof window === "undefined") {
        return next(action)
      }

      activeSymbols = action.payload.symbols.map((symbol) => symbol.toUpperCase())
      clearReconnectTimer()
      cleanupSocket()
      storeApi.dispatch(socketConnecting())

      socket = new window.WebSocket(buildBinanceStreamUrl(activeSymbols))

      socket.onopen = () => {
        reconnectAttempt = 0
        storeApi.dispatch(socketConnected())
      }

      socket.onmessage = (event) => {
        const payload = parseBinanceTickerMessage(event.data)
        const nextTicker = normalizeBinanceTicker(payload)
        const state = storeApi.getState() as RootStateLike
        const previousTicker =
          bufferedTickers.get(nextTicker.symbol) ??
          state.ticker.bySymbol[nextTicker.symbol]

        if (
          !hasMeaningfulPriceChange(
            previousTicker,
            nextTicker,
            PRICE_CHANGE_THRESHOLD_PERCENT
          )
        ) {
          return
        }

        bufferedTickers.set(nextTicker.symbol, nextTicker)
        scheduleFlush()
      }

      socket.onerror = () => {
        storeApi.dispatch(
          socketError("Não foi possível estabelecer conexão com a Binance.")
        )
      }

      socket.onclose = () => {
        storeApi.dispatch(socketDisconnected())
        socket = null
        scheduleReconnect()
      }
    }

    if (disconnectSocket.match(action)) {
      activeSymbols = []
      reconnectAttempt = 0
      clearReconnectTimer()
      cleanupSocket()
      storeApi.dispatch(socketDisconnected())
    }

    return next(action)
  }
}
