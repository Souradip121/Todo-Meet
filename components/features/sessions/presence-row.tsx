"use client"

interface Member {
  user_id: string
  display_name: string
  avatar_url: string | null
  last_heartbeat: number
  update: string | null
}

interface PresenceRowProps {
  members: Member[]
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function isActive(last_heartbeat: number) {
  return Date.now() - last_heartbeat < 10_000
}

export function PresenceRow({ members }: PresenceRowProps) {
  if (!members || members.length === 0) return null

  return (
    <div className="flex items-end gap-4">
      {members.map((member) => {
        const active = isActive(member.last_heartbeat)
        return (
          <div key={member.user_id} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-10 h-10 rounded-full bg-[#16161F] flex items-center justify-center transition-all duration-300 ${
                active
                  ? "ring-2 ring-indigo-500 scale-100"
                  : "ring-1 ring-zinc-700 opacity-50 scale-95"
              }`}
            >
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.display_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-medium text-slate-400">
                  {getInitials(member.display_name)}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 max-w-[56px] truncate">
              {member.display_name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
