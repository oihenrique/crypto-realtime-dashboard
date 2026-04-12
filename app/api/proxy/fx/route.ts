import { NextResponse } from "next/server"

interface FxResponse {
  success: boolean
  rates: {
    BRL: number
  }
  date: string
}

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 1800 }, // 30 minutos de cache
    })

    if (!res.ok) {
      throw new Error("Falha na API primária")
    }

    const data = (await res.json()) as {
      result: string
      rates?: { BRL?: number }
      time_last_update_unix?: number
    }

    if (data.result !== "success" || !data.rates?.BRL) {
      throw new Error("Resposta inválida da API primária")
    }

    return NextResponse.json({
      usdBrl: data.rates.BRL,
      updatedAt: (data.time_last_update_unix ?? Date.now() / 1000) * 1000,
      fallback: false,
    })
  } catch (error) {
    // fallback estático para não quebrar a UI
    const fallbackRate = 5.01
    return NextResponse.json({
      usdBrl: fallbackRate,
      updatedAt: Date.now(),
      fallback: true,
    })
  }
}
