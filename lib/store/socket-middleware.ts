import type { Middleware } from "@reduxjs/toolkit"

import {
  socketConnected,
  socketConnecting,
  socketDisconnected,
  socketError,
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

interface RootStateLike {
  ticker: TickerState
}

export const socketMiddleware: Middleware = (storeApi) => {
  let socket: WebSocket | null = null
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let bufferedTickers = new Map<string, TickerEntry>()

  function cleanupSocket() {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }

    bufferedTickers.clear()

    if (socket) {
      socket.close()
      socket = null
    }
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

      cleanupSocket()
      storeApi.dispatch(socketConnecting())

      const symbols = action.payload.symbols.map((symbol) =>
        symbol.toUpperCase()
      )
      socket = new window.WebSocket(buildBinanceStreamUrl(symbols))

      socket.onopen = () => {
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
          socketError("Nao foi possivel estabelecer conexao com a Binance.")
        )
      }

      socket.onclose = () => {
        storeApi.dispatch(socketDisconnected())
        socket = null
      }
    }

    if (disconnectSocket.match(action)) {
      cleanupSocket()
      storeApi.dispatch(socketDisconnected())
    }

    return next(action)
  }
}
