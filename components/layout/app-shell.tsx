// App shell — wraps all (app) routes
// Top nav + page content

import { TopNav } from "./top-nav"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <TopNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}

