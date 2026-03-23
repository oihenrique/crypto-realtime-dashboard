"use client"

import type { ErrorInfo, ReactNode } from "react"
import { Component } from "react"

import { Button } from "@/components/ui/button"
import { useAppDispatch, useAppSelector } from "@/hooks/use-redux"
import { selectTrackedSymbols } from "@/lib/features/ticker/ticker.selectors"
import { fetchCoinMetadata } from "@/lib/features/meta/meta-slice"
import { resetSocket } from "@/lib/store/socket-actions"

interface BoundaryProps {
  children: ReactNode
}

interface BoundaryState {
  hasError: boolean
}

class DashboardErrorBoundaryInner extends Component<
  BoundaryProps & { renderFallback: (onRetry: () => void) => ReactNode },
  BoundaryState
> {
  public state: BoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dashboard rendering error", error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return this.props.renderFallback(this.handleRetry)
    }

    return this.props.children
  }
}

function DashboardErrorFallback({ onRetry }: { onRetry: () => void }) {
  const dispatch = useAppDispatch()
  const trackedSymbols = useAppSelector(selectTrackedSymbols)

  function handleReset() {
    dispatch(resetSocket())
    dispatch(fetchCoinMetadata(trackedSymbols))
    onRetry()
  }

  return (
    <div className="rounded-[2rem] border border-red-500/20 bg-red-500/8 p-6 text-white shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <p className="text-xs tracking-[0.24em] text-red-200/80 uppercase">
        Error Boundary
      </p>
      <h2 className="mt-3 text-2xl font-semibold">
        O dashboard encontrou um erro de renderização
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-red-100/80">
        O estado da interface foi isolado. Você pode tentar restaurar a conexão
        e renderizar novamente sem recarregar a página inteira.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={handleReset}>Tentar novamente</Button>
      </div>
    </div>
  )
}

export function DashboardErrorBoundary({ children }: BoundaryProps) {
  return (
    <DashboardErrorBoundaryInner
      renderFallback={(onRetry) => <DashboardErrorFallback onRetry={onRetry} />}
    >
      {children}
    </DashboardErrorBoundaryInner>
  )
}
