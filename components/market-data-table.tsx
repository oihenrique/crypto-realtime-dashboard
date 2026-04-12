"use client"

import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"

export type SortKey = "asset" | "price" | "change" | "volume"
export type SortDirection = "asc" | "desc"
export type DisplayCurrency = "USD" | "BRL"

interface MarketRow {
  symbol: string
  displayName: string
  imageUrl: string | null
  description: string | null
  price: number
  changePercent: number
  quoteVolume: number
  priceDirection: "up" | "down" | "flat"
  priceFlashAt: number | null
}

interface MarketDataTableProps {
  rows: MarketRow[]
  isLoading: boolean
  sortKey: SortKey
  sortDirection: SortDirection
  onSortChange: (key: SortKey) => void
  currency: DisplayCurrency
}

function formatCurrency(value: number, currency: DisplayCurrency) {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: currency === "BRL" ? "BRL" : "USD",
    maximumFractionDigits: value >= 1000 ? 2 : 4,
  }).format(value)
}

function formatCompactCurrency(value: number, currency: DisplayCurrency) {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: currency === "BRL" ? "BRL" : "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)
}

function flashClass(direction: "up" | "down" | "flat", flashAt: number | null) {
  if (!flashAt || Date.now() - flashAt > 1200) {
    return ""
  }

  if (direction === "up") {
    return "bg-emerald-500/12"
  }

  if (direction === "down") {
    return "bg-red-500/12"
  }

  return ""
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: SortDirection
}) {
  if (!active) {
    return <ArrowUpDown className="size-3.5" />
  }

  return direction === "asc" ? (
    <ArrowUp className="size-3.5" />
  ) : (
    <ArrowDown className="size-3.5" />
  )
}

function HeaderButton({
  label,
  sortKey,
  activeKey,
  direction,
  onSortChange,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  direction: SortDirection
  onSortChange: (key: SortKey) => void
}) {
  const active = sortKey === activeKey

  return (
    <button
      type="button"
      onClick={() => onSortChange(sortKey)}
      className="inline-flex items-center gap-2 text-left transition hover:text-slate-300"
    >
      <span>{label}</span>
      <SortIcon active={active} direction={direction} />
    </button>
  )
}

function MarketTableSkeleton() {
  return (
    <div className="space-y-2 px-5 py-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid gap-4 rounded-2xl px-3 py-3 md:grid-cols-[1.6fr_1fr_1fr_1fr]"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full max-w-sm" />
            </div>
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export function MarketDataTable({
  rows,
  isLoading,
  sortKey,
  sortDirection,
  onSortChange,
  currency,
}: MarketDataTableProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">
            Lista em Tempo Real
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Dados combinados de streaming + metadata
          </p>
        </div>
        <p className="text-sm text-slate-400">{rows.length} ativos visíveis</p>
      </div>

      <div className="hidden min-w-full grid-cols-[1.6fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-xs tracking-[0.24em] text-slate-500 uppercase md:grid">
        <HeaderButton
          label="Ativo"
          sortKey="asset"
          activeKey={sortKey}
          direction={sortDirection}
          onSortChange={onSortChange}
        />
        <HeaderButton
          label="Preço"
          sortKey="price"
          activeKey={sortKey}
          direction={sortDirection}
          onSortChange={onSortChange}
        />
        <HeaderButton
          label="Variação 24h"
          sortKey="change"
          activeKey={sortKey}
          direction={sortDirection}
          onSortChange={onSortChange}
        />
        <HeaderButton
          label="Volume"
          sortKey="volume"
          activeKey={sortKey}
          direction={sortDirection}
          onSortChange={onSortChange}
        />
      </div>

      {isLoading ? (
        <MarketTableSkeleton />
      ) : (
        <div className="divide-y divide-white/10">
          {rows.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-400">
              Nenhum ativo encontrado para essa busca.
            </div>
          ) : (
            rows.map((ticker) => (
              <Link
                href={`/asset/${ticker.symbol}`}
                key={ticker.symbol}
                className={`grid gap-4 px-5 py-4 transition-colors hover:bg-white/5 md:grid-cols-[1.6fr_1fr_1fr_1fr] ${flashClass(
                  ticker.priceDirection,
                  ticker.priceFlashAt
                )}`}
              >
                <div className="flex items-start gap-3">
                  {ticker.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ticker.imageUrl}
                      alt={ticker.displayName}
                      className="mt-0.5 size-10 rounded-full bg-white/10 object-cover"
                    />
                  ) : (
                    <div className="mt-0.5 flex size-10 items-center justify-center rounded-full bg-white/10 text-xs text-slate-300">
                      {ticker.symbol.slice(0, 3)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">
                        {ticker.displayName}
                      </p>
                      <span className="text-xs text-slate-500">
                        {ticker.symbol}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                      {ticker.description ?? "Carregando detalhes da moeda..."}
                    </p>
                  </div>
                </div>

                <div className="text-sm">
                  <p className="text-slate-500 md:hidden">Preço</p>
                  <p className="font-medium">
                    {formatCurrency(ticker.price, currency)}
                  </p>
                </div>

                <div className="text-sm">
                  <p className="text-slate-500 md:hidden">Variação 24h</p>
                  <p
                    className={
                      ticker.changePercent >= 0
                        ? "text-emerald-300"
                        : "text-red-300"
                    }
                  >
                    {ticker.changePercent.toFixed(2)}%
                  </p>
                </div>

                <div className="text-sm">
                  <p className="text-slate-500 md:hidden">Volume</p>
                  <p>{formatCompactCurrency(ticker.quoteVolume, currency)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </section>
  )
}
