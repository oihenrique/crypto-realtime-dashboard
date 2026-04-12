"use client"

import { useEffect, useState } from "react"

interface FearGreedState {
  value: number | null
  label: string | null
  updatedAt: number | null
  history: Array<{ value: number; updatedAt: number }> | null
  loading: boolean
  error: string | null
}

export function useFearGreed() {
  const [state, setState] = useState<FearGreedState>({
    value: null,
    label: null,
    updatedAt: null,
    history: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/proxy/fear-greed?limit=90")
        if (!res.ok) {
          throw new Error("Não foi possível carregar o índice.")
        }
        const data = (await res.json()) as {
          value: number
          label: string
          updatedAt: number
          history: Array<{ value: number; label: string; updatedAt: number }>
        }
        if (!cancelled) {
          setState({
            value: data.value,
            label: data.label,
            updatedAt: data.updatedAt,
            history: data.history.map((p) => ({ value: p.value, updatedAt: p.updatedAt })),
            loading: false,
            error: null,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : "Falha ao carregar índice.",
          }))
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
