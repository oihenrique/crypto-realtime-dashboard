"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppDispatch, useAppSelector } from "@/hooks/use-redux"
import { fetchCoinMetadata } from "@/lib/features/meta/meta-slice"
import { selectTickerState } from "@/lib/features/ticker/ticker.selectors"
import { connectSocket } from "@/lib/store/socket-actions"

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

export default function AssetPage() {
  const params = useParams<{ symbol: string }>()
  const symbol = params.symbol?.toUpperCase() ?? ""
  const dispatch = useAppDispatch()
  const tickerState = useAppSelector(selectTickerState)
  const ticker = tickerState.bySymbol[symbol]

  const isLoading = !ticker

  // Garantir que estamos assinando esse ativo (sem modificar lista fixa)
  if (typeof window !== "undefined" && symbol && tickerState.trackedSymbols.includes(symbol) === false) {
    dispatch(connectSocket({ symbols: [symbol, ...tickerState.trackedSymbols] }))
    dispatch(fetchCoinMetadata([symbol]))
  }

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
          {isLoading ? (
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
                <span className="rounded-full border border-white/10 px-3 py-1">Preço anterior: {ticker.previousPrice ? formatCurrency(ticker.previousPrice) : "—"}</span>
                <span className="rounded-full border border-white/10 px-3 py-1">Último tick: {new Date(ticker.eventTime).toLocaleTimeString("pt-BR")}</span>
              </div>
            </>
          )}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-slate-300">
          <p className="text-sm">Em breve: gráfico e mais detalhes históricos diretamente da Binance.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/">Voltar para o painel</Link>
          </Button>
        </section>
      </div>
    </main>
  )
}
