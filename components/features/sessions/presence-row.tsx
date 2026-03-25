"use client"
// Member presence indicators for group focus session
// Shows who is active based on heartbeat

// TODO (Claude Code prompt):
// "Complete components/features/sessions/presence-row.tsx
//
//  Props: members: Member[] (from session store)
//
//  Horizontal flex row of member avatars
//  Each avatar: 40px circle, initials fallback (first letter of display_name)
//  Active (heartbeat within 10s): ring-2 ring-indigo-500
//  Idle: ring-1 ring-zinc-700, opacity-50
//  Below each avatar: display name truncated to 8 chars, text-xs text-slate-500
//  Animate presence changes with scale transition"

