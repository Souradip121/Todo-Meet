"use client"
// Tag filter tabs above the integrity grid
// All | Work | Learning | Health | Relationships | Other

// TODO (Claude Code prompt):
// "Complete components/features/grid/grid-tag-filter.tsx
//
//  Uses useGridStore for active_tag state
//  Renders horizontal tab row using shadcn Tabs
//  Tab options: all, work, learning, health, relationships, other
//  Active tab: bg-[#111118] border border-[#1E1E2E] text-slate-50
//  Inactive: text-slate-500 hover:text-slate-300
//  On tab change: call useGridActions().setTag(tag)
//  Also triggers re-fetch via useGrid(tag) query key change"

