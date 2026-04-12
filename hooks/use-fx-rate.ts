"use client"

import { useEffect, useState } from "react"

interface FxState {
  usdBrl: number | null
  updatedAt: number | null
  loading: boolean
  error: string | null
}

export function useFxRate() {
  const [state, setState] = useState<FxState>({
    usdBrl: null,
    updatedAt: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/proxy/fx")
        if (!res.ok) {
          throw new Error("Não foi possível obter câmbio.")
        }
        const data = (await res.json()) as { usdBrl: number; updatedAt: number }
        if (!cancelled) {
          setState({
            usdBrl: data.usdBrl,
            updatedAt: data.updatedAt,
            loading: false,
            error: null,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            usdBrl: null,
            updatedAt: null,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Falha ao carregar câmbio.",
          })
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
