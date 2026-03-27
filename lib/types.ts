// Shared TypeScript types across the app

export type Intensity = "soft" | "firm" | "non_negotiable"
export type CommitmentTag = "work" | "learning" | "health" | "relationships" | "other"

export interface User {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url: string | null
  timezone: string
  persona_level: number
  availability_mood: "deep_work" | "open" | "heads_down" | null
  created_at: string
}

export interface DraftCommitment {
  id: string
  title: string
  intensity: "soft" | "firm" | "non_negotiable"
  tag: string
  type: "personal" | "group"
  group_id?: string
}

export interface Commitment extends DraftCommitment {
  declaration_id: string
  user_id: string
  status: "pending" | "completed" | "carried" | "dropped"
  slip_count: number
  honest_score: number | null
  focus_time_sec: number
  completed_at: string | null
  created_at: string
}

export interface DayScore {
  date: string
  score: 0 | 1 | 2 | 3 | 4 | 5
  breakdown: {
    declaration: number
    completion: number
    debrief: number
    group_contrib: number
  }
}

export interface DayReplay {
  date: string
  score: DayScore
  declaration: { commitments: Commitment[] } | null
  debrief: EODDebrief | null
  focus_time_sec: number
}

export interface EODDebrief {
  id: string
  user_id: string
  date: string
  what_moved: string | null
  what_didnt: string | null
  mood: number | null
  energy: number | null
  submitted_at: string
}

export interface GroupCommitment {
  id: string
  host_id: string
  title: string
  description: string | null
  duration_days: number
  start_date: string
  status: "active" | "completed" | "archived"
  invite_code: string
  members: GroupMember[]
  created_at: string
}

export interface GroupMember {
  user_id: string
  display_name: string
  avatar_url: string | null
  joined_at: string
  nudge_eligible: boolean
  contribution_this_week: number
}

export interface Session {
  id: string
  host_id: string
  commitment_id: string
  commitment_title: string
  title: string
  slot_start: string
  slot_end: string
  max_attendees: number
  current_attendees: number
  gated: boolean
  status: "open" | "full" | "completed" | "cancelled"
}

export interface WeeklySummary {
  personal_completion_pct: number
  group_contribution_pct: number
  focus_time_sec: number
  session_count: number
  strongest_day: string | null
  quietest_day: string | null
  vs_last_week_pct: number
}

export interface StreakData {
  current: number
  perfect_day: number
  group: number
  longest_ever: number
  freezes_remaining: number
}

export interface RecurringCommitment {
  id: string
  name: string
  emoji: string
  color: "green" | "indigo" | "amber"
  description: string | null
  target_min_day: number | null
  period_days: number
  start_date: string
  end_date: string
  status: "active" | "archived" | "pending_review"
  created_at: string
}

export interface CommitmentLog {
  date: string
  duration_minutes: number
  time_start: string | null
  time_end: string | null
  note: string | null
}

export interface TodayCommitment extends RecurringCommitment {
  today_logged: boolean
  today_minutes: number | null
  today_time_start: string | null
  today_time_end: string | null
  today_note: string | null
}

export interface CommitmentDetail {
  commitment: RecurringCommitment
  logs: CommitmentLog[]
}

export interface CommitmentStatPoint {
  week?: string   // weekly: YYYY-MM-DD
  month?: string  // monthly: YYYY-MM
  total_minutes: number
  days_logged: number
}

// duration_minutes → 0-5 score for heatmap
export function minutesToScore(minutes: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (minutes <= 0) return 0
  if (minutes < 30) return 1
  if (minutes < 60) return 2
  if (minutes < 90) return 3
  if (minutes < 120) return 4
  return 5
}

