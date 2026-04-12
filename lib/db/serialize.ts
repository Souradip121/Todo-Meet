import type { recurringCommitments, commitmentLogs } from "./schema"

type DrizzleCommitment = typeof recurringCommitments.$inferSelect
type DrizzleLog = typeof commitmentLogs.$inferSelect

/** Map Drizzle camelCase → frontend snake_case for RecurringCommitment */
export function serializeCommitment(c: DrizzleCommitment) {
  return {
    id:             c.id,
    name:           c.name,
    emoji:          c.emoji,
    color:          c.color as "green" | "indigo" | "amber",
    description:    c.description,
    target_min_day: c.targetMinDay,
    period_days:    c.periodDays,
    start_date:     c.startDate,
    end_date:       c.endDate,
    status:         c.status as "active" | "archived" | "pending_review",
    created_at:     c.createdAt,
  }
}

/** Map Drizzle camelCase → frontend snake_case for CommitmentLog */
export function serializeLog(l: DrizzleLog) {
  return {
    date:             l.date,
    duration_minutes: l.durationMinutes,
    time_start:       l.timeStart,
    time_end:         l.timeEnd,
    note:             l.note,
    photo_url:        l.photoUrl,
  }
}

/** Flatten commitment + optional log into TodayCommitment shape */
export function serializeTodayCommitment(c: DrizzleCommitment, log: DrizzleLog | undefined) {
  return {
    ...serializeCommitment(c),
    today_logged:     !!log,
    today_log_date:   log?.date ?? null,
    today_minutes:    log?.durationMinutes ?? null,
    today_time_start: log?.timeStart ?? null,
    today_time_end:   log?.timeEnd ?? null,
    today_note:       log?.note ?? null,
    today_photo_url:  log?.photoUrl ?? null,
  }
}
