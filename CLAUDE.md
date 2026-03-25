# showup.day — Claude Code Master Context

Read this entire file before touching any code.
This is the single source of truth for all UI, architecture, and naming decisions.

---

## What This App Is

showup.day is a daily commitment and accountability app for student developers
and early-career builders who keep switching tech stacks before getting good at anything.

Core loop: Morning declaration → Focused work (timer) → EOD debrief → Accountability sessions

The user we are building for is someone who wants to stay consistent with one thing
long enough to actually get good at it. Every UI decision should serve that goal.

---

## Tech Stack

- **Framework**: Next.js 15 App Router (RSC + Client Components)
- **Styling**: Tailwind CSS (utility classes only — no custom CSS files)
- **Components**: shadcn/ui (already installed — use these primitives always)
- **Icons**: lucide-react only — never use other icon libraries
- **Fonts**: Geist (default in Next.js 15) for text, Geist Mono for timers/numbers
- **State**: Zustand (client/ephemeral) + TanStack Query (server state)
- **API**: REST — base URL from NEXT_PUBLIC_API_URL env var
- **WebSocket**: wss:// — base URL from NEXT_PUBLIC_WS_URL env var

---

## Color System

Always use these exact values. Never deviate.

```
Background (page):   #0A0A0F   → use bg-[#0A0A0F]
Surface (cards):     #111118   → use bg-[#111118]
Surface hover:       #16161F   → use hover:bg-[#16161F]
Border:              #1E1E2E   → use border-[#1E1E2E]
Border subtle:       #1A1A28   → use border-[#1A1A28]

Accent (indigo):     #6366F1   → use bg-indigo-500 / text-indigo-400
Accent muted:        #6366F120 → use bg-indigo-500/10
Accent hover:        #4F46E5   → use hover:bg-indigo-600

Text primary:        #F8FAFC   → use text-slate-50
Text secondary:      #CBD5E1   → use text-slate-300
Text muted:          #94A3B8   → use text-slate-400
Text faint:          #475569   → use text-slate-600

Success (green):     #22C55E   → use text-green-500 / bg-green-500
Success muted:       #22C55E15 → use bg-green-500/10

Gold (perfect day):  #F59E0B   → use text-amber-400 / bg-amber-400
Gold muted:          #F59E0B15 → use bg-amber-400/10

Destructive:         #EF4444   → use text-red-500

Grid score colours:
  0 = bg-zinc-900      (no activity)
  1 = bg-green-950     (showed up)
  2 = bg-green-800     (solid)
  3 = bg-green-600     (strong)
  4 = bg-green-500     (great)
  5 = bg-amber-400     (perfect day — ALWAYS amber, not green)
```

---

## Typography

```
Page headings:    text-2xl font-semibold text-slate-50
Section headings: text-lg font-medium text-slate-50
Card headings:    text-sm font-medium text-slate-50
Labels:           text-xs font-medium text-slate-400 uppercase tracking-wider
Body text:        text-sm text-slate-300
Muted text:       text-sm text-slate-400
Captions:         text-xs text-slate-600

Timer/numbers:    font-mono (Geist Mono) — for all countdowns and scores
Large stats:      text-5xl font-semibold font-mono text-slate-50
```

---

## Spacing & Layout

```
Page padding:        px-6 py-8 (desktop), px-4 py-6 (mobile)
Card padding:        p-6 (always — never less)
Card gap:            gap-4 between cards
Section gap:         gap-8 between page sections
Input spacing:       space-y-4 inside forms
Border radius:       rounded-xl (cards), rounded-lg (buttons/inputs), rounded-full (badges/pills)
Max content width:   max-w-7xl for dashboard, max-w-lg for focused forms
```

---

## Component Rules

### Cards
```tsx
// Always use this pattern for cards
<div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6">
  {children}
</div>
```

### Buttons — Primary
```tsx
<Button className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium h-10 rounded-lg transition-colors">
  Label
</Button>
```

### Buttons — Ghost
```tsx
<Button variant="ghost" className="text-slate-400 hover:text-slate-50 hover:bg-[#16161F] rounded-lg transition-colors">
  Label
</Button>
```

### Buttons — Destructive
```tsx
<Button className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors">
  Label
</Button>
```

### Inputs
```tsx
<Input className="bg-[#0A0A0F] border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-0 rounded-lg h-10" />
```

### Badges / Intensity Pills
```tsx
// Soft
<span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-slate-400 border border-zinc-700">Soft</span>
// Firm
<span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Firm</span>
// Non-Negotiable
<span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500 text-white">Non-Negotiable</span>
```

### Section Labels
```tsx
<p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Section Title</p>
```

### Dividers
```tsx
<div className="h-px bg-[#1E1E2E] my-6" />
```

---

## Design Rules — Never Break These

1. **No gradients** — flat dark backgrounds only, everywhere
2. **No illustrations or decorative SVGs** — data is the visual
3. **No shadows** — use borders instead: `border border-[#1E1E2E]`
4. **One accent colour** — indigo for actions, green for success/completion, amber for perfect day ONLY
5. **Every interactive element needs all 4 states** — default, hover, focus, disabled
6. **Minimum p-6 on all cards** — never cramped
7. **No inline styles** — Tailwind classes only
8. **Dark backgrounds only** — never white or light surfaces

---

## File & Folder Conventions

```
app/(auth)/           → login, register — no shell
app/(app)/            → all protected routes — has shell layout
app/book/             → public booking pages — no auth

components/ui/        → shadcn primitives + shared atoms
components/layout/    → shell, nav, sidebar
components/features/  → feature-specific components
  grid/               → integrity grid and related
  timer/              → focus timer components
  declaration/        → morning declaration components
  debrief/            → EOD debrief components
  groups/             → group commitment components
  sessions/           → accountability session components

store/                → Zustand stores (one file per domain)
hooks/                → custom hooks (data fetching, WS, utils)
lib/                  → api client, utils, constants
```

---

## Zustand Store Pattern

Always follow this exact pattern for stores:

```typescript
// store/example.ts
import { create } from 'zustand'

interface ExampleState {
  // state fields
  value: string
  // actions grouped under 'actions'
  actions: {
    setValue: (v: string) => void
    reset: () => void
  }
}

const initialState = {
  value: '',
}

export const useExampleStore = create<ExampleState>()((set) => ({
  ...initialState,
  actions: {
    setValue: (value) => set({ value }),
    reset: () => set(initialState),
  },
}))

// Export actions separately so components don't re-render on action change
export const useExampleActions = () => useExampleStore((s) => s.actions)
```

---

## TanStack Query Pattern

```typescript
// hooks/use-grid.ts
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useGrid() {
  return useQuery({
    queryKey: ['grid'],
    queryFn: () => apiClient.get('/scores/grid'),
    staleTime: 1000 * 60 * 60 * 24, // 24h — grid only changes at midnight
  })
}
```

---

## API Client Pattern

```typescript
// lib/api-client.ts
// All API calls go through this client
// Base URL from NEXT_PUBLIC_API_URL
// Automatically attaches auth token from Better Auth session
```

---

## RSC vs Client Component — Decision Rule

| Question | Answer |
|----------|--------|
| Does it fetch data and just display it? | RSC |
| Does it have any onClick / onChange? | Client Component |
| Does it use useState or useEffect? | Client Component |
| Does it connect to WebSocket? | Client Component |
| Does it use Zustand? | Client Component |
| Is it a page that's mostly reading? | RSC |
| Is it a form or interactive flow? | Client Component |

Mark Client Components with `'use client'` at the top.
RSC is the default — no directive needed.

---

## Existing Patterns

### Stat Card
See: `components/ui/stat-card.tsx`
Use for: any single metric with a label.

### Page Header
See: `components/ui/page-header.tsx`
Use for: page title + optional subtitle + optional right-side action.

### Empty State
See: `components/ui/empty-state.tsx`
Use for: empty lists, no data states.

### Loading Skeleton
See: `components/ui/skeleton-card.tsx`
Use for: all loading states — never use spinners.

---

## Commitment Intensity → Visual Mapping

| Intensity | Badge style | Meaning |
|-----------|-------------|---------|
| soft | zinc background, muted text | "I'll try" |
| firm | indigo tint, indigo text | "I plan to" |
| non_negotiable | solid indigo, white text | "This gets done" |

---

## Score → Grid Cell Colour

| Score | Class | Label |
|-------|-------|-------|
| 0 | bg-zinc-900 | No activity |
| 1 | bg-green-950 | Showed up |
| 2 | bg-green-800 | Solid day |
| 3 | bg-green-600 | Strong day |
| 4 | bg-green-500 | Great day |
| 5 | bg-amber-400 | Perfect day |

Score 5 is ALWAYS amber — never just a darker green.
This makes perfect days visually distinct and rare-feeling.

---

## The Vibe (Read This When Unsure)

"showup.day looks like Linear or Vercel's dashboard had a focused, minimal child.
Dark, intentional, data-forward. The streak grid IS the hero element.
The timer IS the experience. No decoration competes with the data.
A terminal that grew up but kept its discipline."

When in doubt: remove decoration, increase spacing, let the data breathe.
