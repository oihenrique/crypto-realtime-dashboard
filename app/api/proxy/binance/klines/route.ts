import { NextResponse } from "next/server"

const BINANCE_BASE_URL = "https://api.binance.com"
const MAX_LIMIT = 1000

type RangeOption = "7d" | "30d"

interface NormalizedCandle {
  time: number
  close: number
  high: number
  low: number
  volume: number
}

function resolveParams(range: RangeOption) {
  // 7d: 15m (672 candles, dentro do limite 1000). 30d: 1h (720 candles).
  const interval = range === "7d" ? "15m" : "1h"
  const limit = range === "7d" ? 7 * 24 * 4 : 30 * 24
  return { interval, limit }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.toUpperCase()
  const range = (searchParams.get("range") as RangeOption) ?? "7d"

  if (!symbol) {
    return NextResponse.json({ message: "symbol é obrigatório" }, { status: 400 })
  }

  const { interval, limit } = resolveParams(range)

  const limitSafe = Math.min(limit, MAX_LIMIT)

  const url = new URL("/api/v3/klines", BINANCE_BASE_URL)
  url.searchParams.set("symbol", symbol)
  url.searchParams.set("interval", interval)
  url.searchParams.set("limit", limitSafe.toString())

  try {
    const response = await fetch(url.toString(), {
      next: { revalidate: 120 }, // 2 minutos de cache
    })

    if (!response.ok) {
      return NextResponse.json(
        { message: "Falha ao buscar klines na Binance." },
        { status: response.status }
      )
    }

    const klines = (await response.json()) as Array<
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

    const candles: NormalizedCandle[] = klines.map((entry) => {
      const [
        openTime,
        _open,
        high,
        low,
        close,
        volume,
        closeTime,
      ] = entry

      return {
        time: Number(closeTime), // usar fechamento como referência
        close: Number(close),
        high: Number(high),
        low: Number(low),
        volume: Number(volume),
      }
    })

    return NextResponse.json({ candles })
  } catch (error) {
    return NextResponse.json(
      { message: "Erro inesperado ao consultar Binance." },
      { status: 500 }
    )
  }
}
