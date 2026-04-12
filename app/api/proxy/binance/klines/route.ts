import { NextResponse } from "next/server"

const BINANCE_BASE_URLS = [
  "https://api.binance.com",
  "https://data.binance.com",
  "https://api-gcp.binance.com",
]
const MAX_LIMIT = 1000

type RangeOption = "7d" | "30d" | "90d" | "1y" | "max"

interface NormalizedCandle {
  time: number
  close: number
  high: number
  low: number
  volume: number
}

function resolveParams(range: RangeOption) {
  if (range === "7d") return { interval: "15m", limit: 7 * 24 * 4, maxDays: 7 }
  if (range === "30d") return { interval: "1h", limit: 30 * 24, maxDays: 30 }
  if (range === "90d") return { interval: "4h", limit: 90 * 6, maxDays: 90 }
  if (range === "1y") return { interval: "1d", limit: 370, maxDays: 370 }
  // max: diário, limitado a 3 anos
  return { interval: "1d", limit: MAX_LIMIT, maxDays: 365 * 3 }
}

const COINGECKO_IDS: Record<string, string> = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  SOLUSDT: "solana",
  BNBUSDT: "binancecoin",
}

async function fetchKlinesPage(
  baseUrl: string,
  params: URLSearchParams,
  revalidateSeconds: number
) {
  const url = `${baseUrl}/api/v3/klines?${params.toString()}`
  const res = await fetch(url, {
    next: { revalidate: revalidateSeconds },
    headers: {
      "User-Agent": "crypto-realtime-dashboard/1.0",
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return (await res.json()) as Array<
    [
      number,
      string,
      string,
      string,
      string,
      string,
      number,
      string,
      number,
      string,
      string,
      string
    ]
  >
}

async function fetchCoingeckoFallback(symbol: string, range: RangeOption) {
  const id = COINGECKO_IDS[symbol]
  if (!id) {
    throw new Error("Sem fallback para este símbolo.")
  }

  const days =
    range === "7d"
      ? "7"
      : range === "30d"
        ? "30"
        : range === "90d"
          ? "90"
          : range === "1y"
            ? "365"
            : "max"

  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=hourly`

  const res = await fetch(url, {
    next: { revalidate: 600 },
    headers: { "User-Agent": "crypto-realtime-dashboard/1.0" },
  })

  if (!res.ok) {
    throw new Error(`Coingecko HTTP ${res.status}`)
  }

  const data = (await res.json()) as {
    prices: [number, number][]
    total_volumes: [number, number][]
  }

  const volumes = new Map<number, number>(data.total_volumes ?? [])

  return data.prices.map(([time, price]) => ({
    time,
    close: price,
    high: price,
    low: price,
    volume: volumes.get(time) ?? 0,
  }))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.toUpperCase()
  const range = (searchParams.get("range") as RangeOption) ?? "7d"

  if (!symbol) {
    return NextResponse.json({ message: "symbol é obrigatório" }, { status: 400 })
  }

  const { interval, limit, maxDays } = resolveParams(range)

  try {
    const now = Date.now()
    const maxWindowMs = maxDays * 24 * 60 * 60 * 1000
    const earliestAllowed = now - maxWindowMs

    let endTime = now
    const candles: NormalizedCandle[] = []
    let attempts = 0

    while (endTime > earliestAllowed && candles.length < MAX_LIMIT * 5) {
      const params = new URLSearchParams()
      params.set("symbol", symbol)
      params.set("interval", interval)
      params.set("limit", Math.min(limit, MAX_LIMIT).toString())
      params.set("endTime", endTime.toString())

      let klines: Awaited<ReturnType<typeof fetchKlinesPage>> | null = null
      let lastError: Error | null = null

      for (const base of BINANCE_BASE_URLS) {
        try {
          klines = await fetchKlinesPage(base, params, 120)
          break
        } catch (error) {
          lastError =
            error instanceof Error
              ? error
              : new Error("Falha ao buscar klines")
          continue
        }
      }

      if (!klines) {
        throw lastError ?? new Error("Falha ao buscar klines na Binance")
      }

      if (klines.length === 0) {
        break
      }

      for (const entry of klines) {
        const [openTime, _open, high, low, close, volume, closeTime] = entry
        if (closeTime < earliestAllowed) continue
        candles.unshift({
          time: Number(closeTime),
          close: Number(close),
          high: Number(high),
          low: Number(low),
          volume: Number(volume),
        })
      }

      const oldest = klines[0]?.[6]
      if (!oldest || oldest <= earliestAllowed) break
      endTime = oldest - 1

      attempts += 1
      if (attempts > 5 || klines.length < Math.min(limit, MAX_LIMIT)) break
    }

    return NextResponse.json({ candles })
  } catch (binanceError) {
    try {
      const candles = await fetchCoingeckoFallback(symbol, range)
      return NextResponse.json({ candles, source: "coingecko" })
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : binanceError instanceof Error
                ? binanceError.message
                : "Erro inesperado ao buscar klines.",
        },
        { status: 502 }
      )
    }
  }
}
