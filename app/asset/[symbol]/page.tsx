"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppDispatch, useAppSelector } from "@/hooks/use-redux"
import { fetchCoinMetadata } from "@/lib/features/meta/meta-slice"
import { selectTickerState } from "@/lib/features/ticker/ticker.selectors"
import { connectSocket } from "@/lib/store/socket-actions"

type RangeOption = "7d" | "30d"

interface CandlePoint {
  time: number
  close: number
  high: number
  low: number
  volume: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 2 : 4,
  }).format(value)
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)
}

const formatTime = (time: number) =>
  new Date(time).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

type TooltipPayload = { payload: CandlePoint }[]

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload }) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload as CandlePoint
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-1">
        <span className="text-slate-400">{formatTime(point.time)}</span>
        <span>Fech.: {formatCurrency(point.close)}</span>
        <span>Máx: {formatCurrency(point.high)}</span>
        <span>Mín: {formatCurrency(point.low)}</span>
        <span>Vol: {formatCompactCurrency(point.volume)}</span>
      </div>
    </div>
  )
}

export default function AssetPage() {
  const params = useParams<{ symbol: string }>()
  const symbol = params.symbol?.toUpperCase() ?? ""
  const dispatch = useAppDispatch()
  const tickerState = useAppSelector(selectTickerState)
  const ticker = tickerState.bySymbol[symbol]

  const [range, setRange] = useState<RangeOption>("7d")
  const [candles, setCandles] = useState<CandlePoint[]>([])
  const [loadingCandles, setLoadingCandles] = useState(false)
  const [errorCandles, setErrorCandles] = useState<string | null>(null)

  const isLoadingTicker = !ticker

  useEffect(() => {
    if (!symbol) return
    if (!tickerState.trackedSymbols.includes(symbol)) {
      dispatch(connectSocket({ symbols: [symbol, ...tickerState.trackedSymbols] }))
      dispatch(fetchCoinMetadata([symbol]))
    }
  }, [dispatch, symbol, tickerState.trackedSymbols])

  useEffect(() => {
    async function load() {
      if (!symbol) return
      setLoadingCandles(true)
      setErrorCandles(null)
      try {
        const res = await fetch(`/api/proxy/binance/klines?symbol=${symbol}&range=${range}`)
        if (!res.ok) {
          throw new Error("Não foi possível carregar o histórico.")
        }
        const data = (await res.json()) as { candles: CandlePoint[] }
        setCandles(data.candles)
      } catch (error) {
        setErrorCandles(error instanceof Error ? error.message : "Falha ao carregar dados.")
      } finally {
        setLoadingCandles(false)
      }
    }
    load()
  }, [symbol, range])

  useEffect(() => {
    if (!ticker || candles.length === 0) return
    setCandles((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      const nextLast = {
        ...last,
        close: ticker.price,
        high: Math.max(last.high, ticker.price),
        low: Math.min(last.low, ticker.price),
      }
      return [...prev.slice(0, -1), nextLast]
    })
  }, [ticker?.price, ticker?.high, ticker?.low, candles.length])

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(180deg,_rgba(6,11,25,1)_0%,_rgba(7,12,20,1)_42%,_rgba(3,6,14,1)_100%)] px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Link href="/" className="text-cyan-200 hover:underline">
            Voltar
          </Link>
          <span className="text-slate-500">/</span>
          <span className="uppercase tracking-widest">{symbol || "Ativo"}</span>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
          {isLoadingTicker ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-6 w-56" />
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-24 rounded-2xl" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs tracking-[0.3em] text-cyan-200/80 uppercase">
                    {symbol}
                  </p>
                  <h1 className="text-4xl font-semibold tracking-tight text-white">
                    {ticker.displayName ?? ticker.symbol}
                  </h1>
                  <p className="text-sm text-slate-300">
                    Última atualização: {new Date(ticker.updatedAt).toLocaleTimeString("pt-BR")}
                  </p>
                </div>

                <div className="space-y-1 text-right">
                  <p className="text-3xl font-semibold text-white">{formatCurrency(ticker.price)}</p>
                  <p className={ticker.changePercent >= 0 ? "text-emerald-300" : "text-red-300"}>
                    {ticker.changePercent.toFixed(2)}% (24h)
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-950/40 p-4">
                  <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">Máxima 24h</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(ticker.high)}</p>
                </div>
                <div className="rounded-2xl bg-slate-950/40 p-4">
                  <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">Mínima 24h</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(ticker.low)}</p>
                </div>
                <div className="rounded-2xl bg-slate-950/40 p-4">
                  <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">Volume</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatCompactCurrency(ticker.quoteVolume)}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 px-3 py-1">
                  Preço anterior: {ticker.previousPrice ? formatCurrency(ticker.previousPrice) : "—"}
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1">
                  Último tick: {new Date(ticker.eventTime).toLocaleTimeString("pt-BR")}
                </span>
              </div>
            </>
          )}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">Histórico</p>
              <p className="text-sm text-slate-300">Preço de fechamento agregado por hora</p>
            </div>
            <div className="flex gap-2 text-sm">
              {(["7d", "30d"] as RangeOption[]).map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={range === option ? "default" : "outline"}
                  onClick={() => setRange(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-6 h-72 w-full">
            {loadingCandles ? (
              <Skeleton className="h-full w-full" />
            ) : errorCandles ? (
              <p className="text-sm text-red-300">{errorCandles}</p>
            ) : candles.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Sem dados suficientes ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={candles}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                    }
                    tickLine={false}
                    axisLine={false}
                    stroke="rgba(148,163,184,0.6)"
                    fontSize={10}
                  />
                  <YAxis
                    orientation="right"
                    tickFormatter={(v) => formatCurrency(v)}
                    width={72}
                    axisLine={false}
                    tickLine={false}
                    stroke="rgba(148,163,184,0.6)"
                    fontSize={10}
                  />
                  <YAxis
                    yAxisId="volume"
                    hide
                    orientation="left"
                    tickCount={2}
                    domain={[0, "dataMax"]}
                  />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Bar
                    yAxisId="volume"
                    dataKey="volume"
                    fill="rgba(148,163,184,0.35)"
                    barSize={4}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fill="url(#priceFill)"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <div className="flex flex-wrap gap-3 text-sm text-slate-300">
          <Button asChild variant="outline">
            <Link href="/">Voltar para o painel</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
