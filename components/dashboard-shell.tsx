"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"

import {
  MarketDataTable,
  type SortDirection,
  type SortKey,
} from "@/components/market-data-table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppDispatch, useAppSelector } from "@/hooks/use-redux"
import {
  selectMetaError,
  selectMetaStatus,
} from "@/lib/features/meta/meta.selectors"
import { fetchCoinMetadata } from "@/lib/features/meta/meta-slice"
import {
  selectConnectionStatus,
  selectFeaturedTickers,
  selectLastMessageAt,
  selectNextReconnectAt,
  selectReconnectAttempt,
  selectTickerRows,
  selectTopGainers,
  selectTopVolume,
  selectTrackedSymbols,
} from "@/lib/features/ticker/ticker.selectors"
import { disconnectSocket, connectSocket } from "@/lib/store/socket-actions"
import { resetSocket } from "@/lib/store/socket-actions"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 2 : 4,
  }).format(value)
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)
}

function ConnectionBadge({
  status,
}: {
  status:
    | "idle"
    | "connecting"
    | "connected"
    | "disconnected"
    | "reconnecting"
    | "error"
}) {
  const badgeClass =
    status === "connected"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "reconnecting" || status === "connecting"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : "border-red-500/30 bg-red-500/10 text-red-300"

  return (
    <span
      className={`rounded-full border px-3 py-1 text-sm capitalize ${badgeClass}`}
    >
      {status}
    </span>
  )
}

export function DashboardShell() {
  const dispatch = useAppDispatch()
  const trackedSymbols = useAppSelector(selectTrackedSymbols)
  const connectionStatus = useAppSelector(selectConnectionStatus)
  const lastMessageAt = useAppSelector(selectLastMessageAt)
  const reconnectAttempt = useAppSelector(selectReconnectAttempt)
  const nextReconnectAt = useAppSelector(selectNextReconnectAt)
  const topGainers = useAppSelector(selectTopGainers)
  const topVolume = useAppSelector(selectTopVolume)
  const featuredTickers = useAppSelector(selectFeaturedTickers)
  const tickerRows = useAppSelector(selectTickerRows)
  const metaStatus = useAppSelector(selectMetaStatus)
  const metaError = useAppSelector(selectMetaError)

  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("volume")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    dispatch(connectSocket({ symbols: trackedSymbols }))
    dispatch(fetchCoinMetadata(trackedSymbols))

    return () => {
      dispatch(disconnectSocket())
    }
  }, [dispatch, trackedSymbols])

  const filteredRows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()

    if (!query) {
      return tickerRows
    }

    return tickerRows.filter((ticker) => {
      return (
        ticker.symbol.toLowerCase().includes(query) ||
        ticker.displayName.toLowerCase().includes(query)
      )
    })
  }, [deferredSearch, tickerRows])

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows]

    sorted.sort((left, right) => {
      const directionFactor = sortDirection === "asc" ? 1 : -1

      if (sortKey === "asset") {
        return (
          left.displayName.localeCompare(right.displayName) * directionFactor
        )
      }

      if (sortKey === "price") {
        return (left.price - right.price) * directionFactor
      }

      if (sortKey === "change") {
        return (left.changePercent - right.changePercent) * directionFactor
      }

      return (left.quoteVolume - right.quoteVolume) * directionFactor
    })

    return sorted
  }, [filteredRows, sortDirection, sortKey])

  function handleSortChange(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === "asset" ? "asc" : "desc")
  }

  const isInitialLoading =
    (connectionStatus === "connecting" || connectionStatus === "idle") &&
    tickerRows.length === 0

  function handleControlledReset() {
    dispatch(resetSocket())
    dispatch(fetchCoinMetadata(trackedSymbols))
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(180deg,_rgba(6,11,25,1)_0%,_rgba(7,12,20,1)_42%,_rgba(3,6,14,1)_100%)] px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-medium tracking-[0.35em] text-cyan-200/70 uppercase">
                Crypto Dashboard
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Acompanhe as principais criptos em tempo real
              </h1>
              <p className="max-w-xl text-sm leading-6 text-slate-300">
                Preços, volume e variação num painel único, com alertas visuais
                e reconexão automática.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">
                Busca
              </p>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou símbolo"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition outline-none focus:border-cyan-300/40"
              />
            </div>
          </div>

          {nextReconnectAt ? (
            <p className="mt-4 text-sm text-amber-200">
              Tentando reconectar (tentativa {reconnectAttempt}) às{" "}
              {new Date(nextReconnectAt).toLocaleTimeString("pt-BR")}.
            </p>
          ) : null}

          {metaError ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-red-300">{metaError}</p>
              <Button variant="outline" onClick={handleControlledReset}>
                Resetar conexão
              </Button>
            </div>
          ) : null}
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
          <div className="grid gap-4 md:grid-cols-3">
            {isInitialLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <article
                    key={index}
                    className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.24)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                      <Skeleton className="h-8 w-16 rounded-full" />
                    </div>
                    <Skeleton className="mt-6 h-10 w-32" />
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <Skeleton className="h-20 rounded-2xl" />
                      <Skeleton className="h-20 rounded-2xl" />
                    </div>
                  </article>
                ))
              : featuredTickers.map((ticker) => (
                  <article
                    key={ticker.symbol}
                    className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.24)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-[0.25em] text-slate-400 uppercase">
                          Big Player
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold">
                          {ticker.symbol}
                        </h2>
                      </div>
                      <span
                        className={
                          ticker.changePercent >= 0
                            ? "rounded-full bg-emerald-500/12 px-2.5 py-1 text-sm text-emerald-300"
                            : "rounded-full bg-red-500/12 px-2.5 py-1 text-sm text-red-300"
                        }
                      >
                        {ticker.changePercent.toFixed(2)}%
                      </span>
                    </div>

                    <p className="mt-6 text-3xl font-semibold">
                      {formatCurrency(ticker.price)}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-300">
                      <div className="rounded-2xl bg-slate-950/40 p-3">
                        <p className="text-xs tracking-[0.18em] text-slate-500 uppercase">
                          Máxima 24h
                        </p>
                        <p className="mt-2">{formatCurrency(ticker.high)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-950/40 p-3">
                        <p className="text-xs tracking-[0.18em] text-slate-500 uppercase">
                          Volume
                        </p>
                        <p className="mt-2">
                          {formatCompactCurrency(ticker.quoteVolume)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
          </div>

          <div className="grid gap-4">
            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">
                Top Gainers
              </p>
              <div className="mt-4 space-y-3">
                {topGainers.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Aguardando volume mínimo de dados para ranquear.
                  </p>
                ) : (
                  topGainers.map((ticker) => (
                    <div
                      key={ticker.symbol}
                      className="flex items-center justify-between rounded-2xl bg-slate-950/40 px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{ticker.symbol}</span>
                      <span className="text-emerald-300">
                        {ticker.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">
                Maior Volume
              </p>
              <div className="mt-4">
                {topVolume ? (
                  <>
                    <p className="text-3xl font-semibold">{topVolume.symbol}</p>
                    <p className="mt-3 text-sm text-slate-300">
                      Volume cotado:{" "}
                      {formatCompactCurrency(topVolume.quoteVolume)}
                    </p>
                    <p className="text-sm text-slate-300">
                      Preço: {formatCurrency(topVolume.price)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">
                    Aguardando os primeiros tickers para calcular o ranking.
                  </p>
                )}
              </div>
            </article>
          </div>
        </section>

        <MarketDataTable
          rows={sortedRows}
          isLoading={isInitialLoading}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />
      </div>
    </main>
  )
}
