import {
  pgTable, uuid, text, boolean, smallint, integer,
  timestamp, date, time, jsonb, unique, primaryKey, index,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ── Users ──────────────────────────────────────────────────────────────────
// id is TEXT (not uuid) because better-auth generates its own string IDs.
// All FK columns referencing users.id are also text for consistency.
export const users = pgTable("users", {
  id:                     text("id").primaryKey(),
  name:                   text("name").notNull().default(""),
  email:                  text("email").notNull().unique(),
  emailVerified:          boolean("email_verified").notNull().default(false),
  image:                  text("image"),
  username:               text("username").unique(),
  linkedinId:             text("linkedin_id").unique(),
  timezone:               text("timezone").notNull().default("Asia/Kolkata"),
  personaLevel:           smallint("persona_level").notNull().default(0),
  streakFreezesRemaining: smallint("streak_freezes_remaining").notNull().default(1),
  onboardingComplete:     boolean("onboarding_complete").notNull().default(false),
  currentFocus:           text("current_focus"),
  collegeUrl:             text("college_url"),
  createdAt:              timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:              timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── better-auth required tables ────────────────────────────────────────────
export const sessions = pgTable("sessions", {
  id:        text("id").primaryKey(),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token:     text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const accounts = pgTable("accounts", {
  id:                   text("id").primaryKey(),
  userId:               text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId:            text("account_id").notNull(),
  providerId:           text("provider_id").notNull(),
  accessToken:          text("access_token"),
  refreshToken:         text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  scope:                text("scope"),
  idToken:              text("id_token"),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const verifications = pgTable("verifications", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── Groups & Duos ──────────────────────────────────────────────────────────
export const groups = pgTable("groups", {
  id:           uuid("id").primaryKey().defaultRandom(),
  hostId:       text("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:        text("title").notNull(),
  description:  text("description"),
  durationDays: integer("duration_days").notNull().default(30),
  startDate:    date("start_date").notNull().default(sql`CURRENT_DATE`),
  status:       text("status").notNull().default("active"),
  inviteCode:   text("invite_code").notNull().unique().default(sql`substring(md5(random()::text), 1, 8)`),
  type:         text("type").notNull().default("group"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const groupMembers = pgTable("group_members", {
  groupId:  uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId:   text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role:     text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.groupId, t.userId] })])

export const nudges = pgTable("nudges", {
  id:       uuid("id").primaryKey().defaultRandom(),
  groupId:  uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  fromUser: text("from_user").notNull().references(() => users.id),
  toUser:   text("to_user").notNull().references(() => users.id),
  sentAt:   timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
})

export const duoNotifications = pgTable("duo_notifications", {
  id:      uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  date:    date("date").notNull(),
  sentAt:  timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.groupId, t.date)])

// ── Focus Sessions ────────────────────────────────────────────────────────
export const focusSessions = pgTable("focus_sessions", {
  id:          uuid("id").primaryKey().defaultRandom(),
  hostId:      text("host_id").notNull().references(() => users.id),
  groupId:     uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
  title:       text("title").notNull(),
  durationMin: integer("duration_min").notNull().default(25),
  status:      text("status").notNull().default("waiting"),
  startedAt:   timestamp("started_at", { withTimezone: true }),
  endedAt:     timestamp("ended_at", { withTimezone: true }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const sessionMembers = pgTable("session_members", {
  sessionId:  uuid("session_id").notNull().references(() => focusSessions.id, { onDelete: "cascade" }),
  userId:     text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt:   timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  updateText: text("update_text"),
}, (t) => [primaryKey({ columns: [t.sessionId, t.userId] })])

// ── Recurring Commitments ─────────────────────────────────────────────────
export const recurringCommitments = pgTable("recurring_commitments", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:         text("name").notNull(),
  emoji:        text("emoji").notNull().default("⚡"),
  color:        text("color").notNull().default("green"),
  description:  text("description"),
  targetMinDay: integer("target_min_day"),
  periodDays:   integer("period_days").notNull().default(30),
  startDate:    date("start_date").notNull().default(sql`CURRENT_DATE`),
  endDate:      date("end_date").notNull(),
  status:       text("status").notNull().default("active"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("rc_user_idx").on(t.userId)])

export const commitmentLogs = pgTable("commitment_logs", {
  id:              uuid("id").primaryKey().defaultRandom(),
  commitmentId:    uuid("commitment_id").notNull().references(() => recurringCommitments.id, { onDelete: "cascade" }),
  userId:          text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date:            date("date").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  timeStart:       time("time_start"),
  timeEnd:         time("time_end"),
  note:            text("note"),
  photoUrl:        text("photo_url"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.commitmentId, t.date),
  index("cl_commitment_date").on(t.commitmentId, t.date),
  index("cl_user_date").on(t.userId, t.date),
])

export const commitmentShares = pgTable("commitment_shares", {
  id:           uuid("id").primaryKey().defaultRandom(),
  commitmentId: uuid("commitment_id").notNull().references(() => recurringCommitments.id, { onDelete: "cascade" }),
  token:        text("token").notNull().unique().default(sql`substring(md5(random()::text), 1, 12)`),
  weekStart:    date("week_start"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("cs_token_idx").on(t.token)])

// ── Daily Scores ──────────────────────────────────────────────────────────
export const dailyScores = pgTable("daily_scores", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date:      date("date").notNull(),
  score:     smallint("score").notNull().default(0),
  breakdown: jsonb("breakdown").default(sql`'{}'::jsonb`),
}, (t) => [
  unique().on(t.userId, t.date),
  index("idx_daily_scores_user_year").on(t.userId, t.date),
])

// ── EOD Debriefs ──────────────────────────────────────────────────────────
export const eodDebriefs = pgTable("eod_debriefs", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date:        date("date").notNull(),
  whatMoved:   text("what_moved"),
  whatDidnt:   text("what_didnt"),
  mood:        smallint("mood"),
  energy:      smallint("energy"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.date),
  index("idx_eod_debriefs_user_date").on(t.userId, t.date),
])

// ── Streak Freezes ────────────────────────────────────────────────────────
export const streakFreezeUses = pgTable("streak_freeze_uses", {
  id:     uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date:   date("date").notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.date)])

// ── Declarations ──────────────────────────────────────────────────────────
export const declarations = pgTable("declarations", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date:        date("date").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.date),
  index("idx_declarations_user_date").on(t.userId, t.date),
])

export const commitments = pgTable("commitments", {
  id:            uuid("id").primaryKey().defaultRandom(),
  declarationId: uuid("declaration_id").notNull().references(() => declarations.id, { onDelete: "cascade" }),
  userId:        text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:         text("title").notNull(),
  type:          text("type").notNull().default("personal"),
  intensity:     text("intensity").notNull().default("firm"),
  tag:           text("tag"),
  groupId:       uuid("group_id"),
  status:        text("status").notNull().default("pending"),
  slipCount:     smallint("slip_count").notNull().default(0),
  honestScore:   smallint("honest_score"),
  focusTimeSec:  integer("focus_time_sec").notNull().default(0),
  completedAt:   timestamp("completed_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── Challenges ────────────────────────────────────────────────────────────
export const challenges = pgTable("challenges", {
  id:            uuid("id").primaryKey().defaultRandom(),
  title:         text("title").notNull(),
  category:      text("category").notNull(),
  durationDays:  integer("duration_days").notNull(),
  checkInRule:   text("check_in_rule").notNull().default("Check in once daily before midnight"),
  startDate:     date("start_date").notNull(),
  endDate:       date("end_date").notNull(),
  status:        text("status").notNull().default("upcoming"),
  isOfficial:    boolean("is_official").notNull().default(true),
  stakesEnabled: boolean("stakes_enabled").notNull().default(false),
  createdBy:     text("created_by").references(() => users.id, { onDelete: "set null" }),
  rules:         jsonb("rules").notNull().default(sql`'[]'::jsonb`),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("challenges_status_idx").on(t.status)])

export const challengeParticipants = pgTable("challenge_participants", {
  challengeId:      uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  userId:           text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt:         timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  currentStreak:    integer("current_streak").notNull().default(0),
  totalCheckins:    integer("total_checkins").notNull().default(0),
  lastCheckinDate:  date("last_checkin_date"),
  stakeAmountPaise: integer("stake_amount_paise").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.challengeId, t.userId] })])

export const challengeCheckins = pgTable("challenge_checkins", {
  id:          uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date:        date("date").notNull(),
  photoUrl:    text("photo_url"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.challengeId, t.userId, t.date)])

// ── Friendships ───────────────────────────────────────────────────────────
export const friendships = pgTable("friendships", {
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  friendId:  text("friend_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status:    text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.friendId] })])

// ── Job Runs ──────────────────────────────────────────────────────────────
export const jobRuns = pgTable("job_runs", {
  id:           uuid("id").primaryKey().defaultRandom(),
  jobName:      text("job_name").notNull(),
  startedAt:    timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  status:       text("status").notNull().default("running"),
  durationMs:   integer("duration_ms"),
  rowsAffected: integer("rows_affected"),
  errorMsg:     text("error_msg"),
})

// ── Duo Match ─────────────────────────────────────────────────────────────
export const duoMatchProfiles = pgTable("duo_match_profiles", {
  commitmentId: uuid("commitment_id").notNull().references(() => recurringCommitments.id, { onDelete: "cascade" }),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isActive:     boolean("is_active").notNull().default(true),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.commitmentId, t.userId] })])

export const duoMatchSwipes = pgTable("duo_match_swipes", {
  id:           uuid("id").primaryKey().defaultRandom(),
  swiperId:     text("swiper_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  swipedId:     text("swiped_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commitmentId: uuid("commitment_id").notNull().references(() => recurringCommitments.id, { onDelete: "cascade" }),
  direction:    text("direction").notNull(),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.swiperId, t.swipedId, t.commitmentId)])
