// Page header — title + optional subtitle + optional right action
// Usage: <PageHeader title="Dashboard" subtitle="Your commitment history" />

import { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

