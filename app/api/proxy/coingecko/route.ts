import { NextResponse } from "next/server"

import type { CoinMeta } from "@/lib/features/meta/meta.types"

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  SOLUSDT: "solana",
  BNBUSDT: "binancecoin",
}

interface CoinGeckoMarketCoin {
  id: string
  image: string
  name: string
  symbol: string
}

interface CoinGeckoDetailsCoin {
  description?: {
    en?: string
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function buildHeaders() {
  const headers = new Headers()
  const apiKey = process.env.COINGECKO_API_KEY

  if (apiKey) {
    headers.set("x-cg-pro-api-key", apiKey)
  }

  return headers
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedSymbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)

  const symbols = requestedSymbols.length > 0
    ? requestedSymbols
    : ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"]

  const ids = symbols
    .map((symbol) => SYMBOL_TO_COINGECKO_ID[symbol])
    .filter(Boolean)

  if (ids.length === 0) {
    return NextResponse.json(
      { coins: [] },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=86400",
        },
      }
    )
  }

  try {
    const marketUrl = new URL(`${COINGECKO_BASE_URL}/coins/markets`)
    marketUrl.searchParams.set("vs_currency", "usd")
    marketUrl.searchParams.set("ids", ids.join(","))
    marketUrl.searchParams.set("sparkline", "false")
    marketUrl.searchParams.set("price_change_percentage", "24h")

    const headers = buildHeaders()

    const marketsResponse = await fetch(marketUrl.toString(), {
      headers,
      next: {
        revalidate: 300,
      },
    })

    if (!marketsResponse.ok) {
      throw new Error("Falha ao carregar dados de mercado da CoinGecko.")
    }

    const markets = (await marketsResponse.json()) as CoinGeckoMarketCoin[]

    const descriptionEntries = await Promise.all(
      markets.map(async (coin) => {
        const detailsResponse = await fetch(
          `${COINGECKO_BASE_URL}/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
          {
            headers,
            next: {
              revalidate: 3600,
            },
          }
        )

        if (!detailsResponse.ok) {
          return [coin.id, null] as const
        }

        const details = (await detailsResponse.json()) as CoinGeckoDetailsCoin
        const description = details.description?.en
          ? stripHtml(details.description.en).slice(0, 220)
          : null

        return [coin.id, description] as const
      })
    )

    const descriptionsById = Object.fromEntries(descriptionEntries)

    const coins: CoinMeta[] = []

    for (const symbol of symbols) {
      const id = SYMBOL_TO_COINGECKO_ID[symbol]
      const marketCoin = markets.find((coin) => coin.id === id)

      if (!marketCoin) {
        continue
      }

      coins.push({
        symbol,
        name: marketCoin.name,
        imageUrl: marketCoin.image ?? null,
        description: descriptionsById[marketCoin.id] ?? null,
      })
    }

    return NextResponse.json(
      { coins },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=86400",
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao buscar metadados.",
      },
      { status: 500 }
    )
  }
}
