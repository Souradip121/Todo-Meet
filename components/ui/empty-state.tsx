// Empty state — icon + heading + subtext + optional CTA
// Usage: <EmptyState icon={Flame} title="No commitments yet" description="..." />

import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#111118] border border-[#1E1E2E] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <h3 className="text-sm font-medium text-slate-50 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

