import { NextResponse } from "next/server"

interface FearGreedApiResponse {
  data: Array<{
    value: string
    value_classification: string
    timestamp: string
    time_until_update: string
  }>
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 365)

  try {
    const response = await fetch(`https://api.alternative.me/fng/?limit=${limit}`, {
      next: { revalidate: 1800 }, // 30 minutos
    })

    if (!response.ok) {
      return NextResponse.json(
        { message: "Não foi possível carregar o índice de sentimento." },
        { status: response.status }
      )
    }

    const payload = (await response.json()) as FearGreedApiResponse
    const first = payload.data?.[0]

    if (!first) {
      return NextResponse.json(
        { message: "Resposta inesperada do provedor de sentimento." },
        { status: 502 }
      )
    }

    const points = payload.data.map((entry) => ({
      value: Number(entry.value),
      label: entry.value_classification,
      updatedAt: Number(entry.timestamp) * 1000,
    }))

    return NextResponse.json({
      value: Number(first.value),
      label: first.value_classification,
      updatedAt: Number(first.timestamp) * 1000,
      history: points,
    })
  } catch (error) {
    return NextResponse.json(
      { message: "Erro inesperado ao buscar sentimento de mercado." },
      { status: 500 }
    )
  }
}
