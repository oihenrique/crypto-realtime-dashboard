"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  MarketDataTable,
  type SortDirection,
  type SortKey,
} from "@/components/market-data-table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useFxRate } from "@/hooks/use-fx-rate"
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
  selectDominanceByVolume,
  selectTickerRows,
  selectTopGainers,
  selectTopVolume,
  selectTrackedSymbols,
} from "@/lib/features/ticker/ticker.selectors"
import { disconnectSocket, connectSocket } from "@/lib/store/socket-actions"
import { resetSocket } from "@/lib/store/socket-actions"
import { useFearGreed } from "@/hooks/use-fear-greed"

type DisplayCurrency = "USD" | "BRL"

function formatCurrency(value: number, currency: DisplayCurrency) {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 2 : 4,
  }).format(value)
}

function formatCompactCurrency(value: number, currency: DisplayCurrency) {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
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
  const dominance = useAppSelector(selectDominanceByVolume)
  const fearGreed = useFearGreed()

  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("volume")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [currency, setCurrency] = useState<DisplayCurrency>("USD")
  const fx = useFxRate()
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

  const conversionRate = currency === "BRL" ? (fx.usdBrl ?? 1) : 1

  const displayRows = useMemo(
    () =>
      sortedRows.map((row) => ({
        ...row,
        price: row.price * conversionRate,
        quoteVolume: row.quoteVolume * conversionRate,
        high: row.high,
      })),
    [sortedRows, conversionRate]
  )

  const displayFeatured = useMemo(
    () =>
      featuredTickers.map((t) => ({
        ...t,
        price: t.price * conversionRate,
        high: t.high * conversionRate,
        quoteVolume: t.quoteVolume * conversionRate,
      })),
    [featuredTickers, conversionRate]
  )

  const displayTopVolume = topVolume
    ? {
        ...topVolume,
        price: topVolume.price * conversionRate,
        quoteVolume: topVolume.quoteVolume * conversionRate,
      }
    : null

  const fearGreedHistory =
    fearGreed.history
      ?.slice()
      .reverse()
      .map((point) => ({
        time: point.updatedAt,
        value: point.value,
      })) ?? []

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

            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
              <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">
                Moeda
              </p>
              <div className="mt-3 flex items-center gap-2">
                {(["USD", "BRL"] as DisplayCurrency[]).map((cur) => (
                  <Button
                    key={cur}
                    size="sm"
                    variant={currency === cur ? "default" : "outline"}
                    onClick={() => setCurrency(cur)}
                  >
                    {cur}
                  </Button>
                ))}
              </div>
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
          <div className="flex flex-col gap-4">
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
                : displayFeatured.map((ticker) => (
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
                        {formatCurrency(ticker.price, currency)}
                      </p>

                      <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-300">
                        <div className="rounded-2xl bg-slate-950/40 p-3">
                          <p className="text-xs tracking-[0.18em] text-slate-500 uppercase">
                            Máxima 24h
                          </p>
                          <p className="mt-2">
                            {formatCurrency(ticker.high, currency)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-950/40 p-3">
                          <p className="text-xs tracking-[0.18em] text-slate-500 uppercase">
                            Volume
                          </p>
                          <p className="mt-2">
                            {formatCompactCurrency(
                              ticker.quoteVolume,
                              currency
                            )}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">
                  Sentimento do mercado
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-300">Fear & Greed Index</p>
                    <p className="text-3xl font-semibold text-white">
                      {fearGreed.loading
                        ? "…"
                        : fearGreed.value !== null
                          ? fearGreed.value
                          : "—"}
                    </p>
                    <p className="text-sm text-slate-400">
                      {fearGreed.loading
                        ? "carregando"
                        : fearGreed.error
                          ? "indisponível"
                          : fearGreed.label}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-xs text-slate-400">
                    Atualizado:{" "}
                    {fearGreed.updatedAt
                      ? new Date(fearGreed.updatedAt).toLocaleDateString(
                          "pt-BR"
                        )
                      : "—"}
                  </div>
                </div>
                <div className="mt-4 h-28">
                  {fearGreed.loading ? (
                    <Skeleton className="h-full w-full" />
                  ) : fearGreedHistory.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Sem histórico disponível.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={fearGreedHistory}>
                        <XAxis
                          dataKey="time"
                          hide
                          type="number"
                          domain={["dataMin", "dataMax"]}
                        />
                        <YAxis hide domain={[0, 100]} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || payload.length === 0)
                              return null
                            const p = payload[0].payload as {
                              time: number
                              value: number
                            }
                            return (
                              <div className="rounded-md border border-white/10 bg-slate-950/80 px-2 py-1 text-xs text-white">
                                <p>
                                  {new Date(p.time).toLocaleDateString("pt-BR")}
                                </p>
                                <p>Índice: {p.value}</p>
                              </div>
                            )
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#38bdf8"
                          fill="url(#fgFill)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                        <defs>
                          <linearGradient
                            id="fgFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#38bdf8"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="100%"
                              stopColor="#38bdf8"
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {fearGreed.error ? (
                  <p className="mt-2 text-xs text-red-300">{fearGreed.error}</p>
                ) : null}
              </article>

              <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">
                  Maior Volume
                </p>
                <div className="mt-4">
                  {displayTopVolume ? (
                    <>
                      <p className="text-3xl font-semibold">
                        {displayTopVolume.symbol}
                      </p>
                      <p className="mt-3 text-sm text-slate-300">
                        Volume cotado:{" "}
                        {formatCompactCurrency(
                          displayTopVolume.quoteVolume,
                          currency
                        )}
                      </p>
                      <p className="text-sm text-slate-300">
                        Preço:{" "}
                        {formatCurrency(displayTopVolume.price, currency)}
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
          </div>

          <div className="grid gap-4">
            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">
                Dominância por volume (rastreados)
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div className="rounded-2xl bg-slate-950/40 p-3">
                  <p className="text-xs tracking-[0.18em] text-slate-500 uppercase">
                    BTC
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {dominance.totalVolume === 0
                      ? "—"
                      : `${dominance.btcPercent.toFixed(1)}%`}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-950/40 p-3">
                  <p className="text-xs tracking-[0.18em] text-slate-500 uppercase">
                    ETH
                  </p>
                  <p className="text-2l mt-2 font-semibold text-white">
                    {dominance.totalVolume === 0
                      ? "—"
                      : `${dominance.ethPercent.toFixed(1)}%`}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Calculado sobre o volume cotado dos ativos que estão
                visíveis/monitorados agora.
              </p>
            </article>

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
          </div>
        </section>

        <MarketDataTable
          rows={displayRows}
          isLoading={isInitialLoading}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          currency={currency}
        />
      </div>
    </main>
  )
}
