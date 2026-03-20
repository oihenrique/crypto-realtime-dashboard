"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { useAppDispatch, useAppSelector } from "@/hooks/use-redux"
import {
  selectConnectionStatus,
  selectLastMessageAt,
  selectNextReconnectAt,
  selectReconnectAttempt,
  selectTickerCards,
  selectTopGainers,
  selectTopVolume,
  selectTrackedSymbols,
} from "@/lib/features/ticker/ticker.selectors"
import { disconnectSocket, connectSocket } from "@/lib/store/socket-actions"

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 2 : 4,
  }).format(value)
}

export function DashboardShell() {
  const dispatch = useAppDispatch()
  const trackedSymbols = useAppSelector(selectTrackedSymbols)
  const connectionStatus = useAppSelector(selectConnectionStatus)
  const lastMessageAt = useAppSelector(selectLastMessageAt)
  const reconnectAttempt = useAppSelector(selectReconnectAttempt)
  const nextReconnectAt = useAppSelector(selectNextReconnectAt)
  const tickerCards = useAppSelector(selectTickerCards)
  const topGainers = useAppSelector(selectTopGainers)
  const topVolume = useAppSelector(selectTopVolume)

  useEffect(() => {
    dispatch(connectSocket({ symbols: trackedSymbols }))

    return () => {
      dispatch(disconnectSocket())
    }
  }, [dispatch, trackedSymbols])

  return (
    <main className="min-h-svh bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm tracking-[0.3em] text-muted-foreground uppercase">
                Crypto Dashboard
              </p>
              <h1 className="text-3xl font-semibold">
                Motor de dados em tempo real
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground capitalize">
                status: {connectionStatus}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  dispatch(connectSocket({ symbols: trackedSymbols }))
                }
              >
                Reconectar
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Streams monitorados: {trackedSymbols.join(", ")}</p>
            <p>
              Última atualização:{" "}
              {lastMessageAt
                ? new Date(lastMessageAt).toLocaleTimeString("pt-BR")
                : "aguardando dados"}
            </p>
            {nextReconnectAt ? (
              <p>
                Reconexão tentativa {reconnectAttempt}:{" "}
                {new Date(nextReconnectAt).toLocaleTimeString("pt-BR")}
              </p>
            ) : null}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">
              Top Gainers
            </p>
            <div className="mt-4 space-y-3">
              {topGainers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aguardando volume mínimo de dados para ranquear.
                </p>
              ) : (
                topGainers.map((ticker) => (
                  <div
                    key={ticker.symbol}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{ticker.symbol}</span>
                    <span className="text-emerald-400">
                      {ticker.changePercent.toFixed(2)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">
              Maior Volume
            </p>
            <div className="mt-4">
              {topVolume ? (
                <>
                  <p className="text-2xl font-semibold">{topVolume.symbol}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Volume cotado: {formatPrice(topVolume.quoteVolume)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Preço: {formatPrice(topVolume.price)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aguardando os primeiros tickers para calcular o ranking.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tickerCards.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
              A conexão foi iniciada. Os primeiros tickers da Binance aparecerão
              aqui assim que chegarem.
            </div>
          ) : (
            tickerCards.map((ticker) => {
              return (
                <article
                  key={ticker.symbol}
                  className="rounded-3xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Ativo</p>
                      <h2 className="text-xl font-semibold">{ticker.symbol}</h2>
                    </div>
                    <span
                      className={
                        ticker.changePercent >= 0
                          ? "rounded-full bg-emerald-500/12 px-2.5 py-1 text-sm text-emerald-400"
                          : "rounded-full bg-red-500/12 px-2.5 py-1 text-sm text-red-400"
                      }
                    >
                      {ticker.changePercent.toFixed(2)}%
                    </span>
                  </div>

                  <div className="mt-5 space-y-2">
                    <p className="text-2xl font-semibold">
                      {formatPrice(ticker.price)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      High 24h: {formatPrice(ticker.high)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Low 24h: {formatPrice(ticker.low)}
                    </p>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
