package models

import "time"

type User struct {
	ID                     string    `json:"id"`
	Email                  string    `json:"email"`
	Username               string    `json:"username"`
	DisplayName            string    `json:"display_name"`
	AvatarURL              *string   `json:"avatar_url"`
	Timezone               string    `json:"timezone"`
	PersonaLevel           int16     `json:"persona_level"`
	StreakFreezesRemaining int16     `json:"streak_freezes_remaining"`
	AvailabilityMood       *string   `json:"availability_mood"`
	OnboardingComplete     bool      `json:"onboarding_complete"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}

type Commitment struct {
	ID            string     `json:"id"`
	DeclarationID string     `json:"declaration_id"`
	UserID        string     `json:"user_id"`
	Title         string     `json:"title"`
	Type          string     `json:"type"`
	Intensity     string     `json:"intensity"`
	Tag           *string    `json:"tag"`
	GroupID       *string    `json:"group_id"`
	Status        string     `json:"status"`
	SlipCount     int16      `json:"slip_count"`
	HonestScore   *int16     `json:"honest_score"`
	FocusTimeSec  int32      `json:"focus_time_sec"`
	CompletedAt   *time.Time `json:"completed_at"`
	CreatedAt     time.Time  `json:"created_at"`
}

type Declaration struct {
	ID          string      `json:"id"`
	UserID      string      `json:"user_id"`
	Date        string      `json:"date"`
	SubmittedAt time.Time   `json:"submitted_at"`
	Commitments []Commitment `json:"commitments,omitempty"`
}

type DayScore struct {
	Date      string          `json:"date"`
	Score     int16           `json:"score"`
	Breakdown ScoreBreakdown  `json:"breakdown"`
}

type ScoreBreakdown struct {
	Declaration  int `json:"declaration"`
	Completion   int `json:"completion"`
	Debrief      int `json:"debrief"`
	GroupContrib int `json:"group_contrib"`
}

type EODDebrief struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	Date        string     `json:"date"`
	WhatMoved   *string    `json:"what_moved"`
	WhatDidnt   *string    `json:"what_didnt"`
	Mood        *int16     `json:"mood"`
	Energy      *int16     `json:"energy"`
	SubmittedAt time.Time  `json:"submitted_at"`
}

type StreakData struct {
	Current          int `json:"current"`
	PerfectDay       int `json:"perfect_day"`
	Group            int `json:"group"`
	LongestEver      int `json:"longest_ever"`
	FreezesRemaining int `json:"freezes_remaining"`
}
