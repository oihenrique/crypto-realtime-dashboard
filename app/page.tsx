import { DashboardErrorBoundary } from "@/components/dashboard-error-boundary"
import { DashboardShell } from "@/components/dashboard-shell"

export default function Page() {
  return (
    <DashboardErrorBoundary>
      <DashboardShell />
    </DashboardErrorBoundary>
  )
}
