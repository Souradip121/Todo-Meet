"use client"

import { useState } from "react"

interface Member {
  user_id: string
  display_name: string
  avatar_url: string | null
  last_heartbeat: number
  update: string | null
}

interface SessionEndCardsProps {
  members: Member[]
  currentUserId: string
  onSubmit: (update: string) => void
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function SessionEndCards({ members, currentUserId, onSubmit }: SessionEndCardsProps) {
  const [text, setText] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(text)
    setSubmitted(true)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Session wrap-up</p>

      {/* Current user's input */}
      {!submitted ? (
        <form onSubmit={handleSubmit} className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-4 space-y-3">
          <p className="text-sm text-slate-50">What did you get done?</p>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="One line — what moved?"
            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-10 px-3 text-sm"
          />
          <button
            type="submit"
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors"
          >
            Submit
          </button>
        </form>
      ) : (
        <div className="bg-[#111118] border border-green-500/20 rounded-xl p-4">
          <p className="text-sm text-green-500">✓ Update submitted</p>
          {text && <p className="text-sm text-slate-400 mt-1">{text}</p>}
        </div>
      )}

      {/* Other members' updates */}
      <div className="space-y-2">
        {members
          .filter((m) => m.user_id !== currentUserId)
          .map((member) => (
            <div key={member.user_id} className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-4 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#16161F] border border-[#1E1E2E] flex items-center justify-center shrink-0">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.display_name} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">{getInitials(member.display_name)}</span>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400">{member.display_name}</p>
                {member.update ? (
                  <p className="text-sm text-slate-300 mt-0.5">{member.update}</p>
                ) : (
                  <p className="text-xs text-slate-600 mt-0.5 italic">Typing…</p>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
