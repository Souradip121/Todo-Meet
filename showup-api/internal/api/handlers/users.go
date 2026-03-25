package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souradip121/showup-api/internal/api/middleware"
	"github.com/Souradip121/showup-api/internal/auth"
)

const (
	accessTTL  = 15 * time.Minute
	refreshTTL = 30 * 24 * time.Hour
)

type AuthHandler struct {
	db      *pgxpool.Pool
	authSvc *auth.Service
}

func NewAuthHandler(db *pgxpool.Pool, authSvc *auth.Service) *AuthHandler {
	return &AuthHandler{db: db, authSvc: authSvc}
}

type registerRequest struct {
	Email       string `json:"email"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Password    string `json:"password"`
	Timezone    string `json:"timezone"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// Register creates a new user account.
// POST /api/v1/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Email == "" || req.Username == "" || req.DisplayName == "" || req.Password == "" {
		jsonError(w, "email, username, display_name, and password are required", http.StatusUnprocessableEntity)
		return
	}
	if len(req.DisplayName) > 50 {
		jsonError(w, "display_name max 50 characters", http.StatusUnprocessableEntity)
		return
	}
	tz := req.Timezone
	if tz == "" {
		tz = "Asia/Kolkata"
	}

	// Hash password (bcrypt via pgcrypto — stored directly in DB query)
	// For now we store a placeholder; full bcrypt integrated via sqlc + pgcrypto
	row := h.db.QueryRow(r.Context(),
		`INSERT INTO users (email, username, display_name, timezone)
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		req.Email, req.Username, req.DisplayName, tz,
	)
	var userID string
	if err := row.Scan(&userID); err != nil {
		slog.Error("register: insert user", "error", err)
		if isUniqueViolation(err) {
			jsonError(w, "email or username already taken", http.StatusConflict)
			return
		}
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Store hashed password in a separate auth table (better-auth pattern)
	_, err := h.db.Exec(r.Context(),
		`INSERT INTO user_passwords (user_id, password_hash)
		 VALUES ($1, crypt($2, gen_salt('bf')))`,
		userID, req.Password,
	)
	if err != nil {
		slog.Error("register: store password", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	access, _ := h.authSvc.IssueToken(userID, req.Email, accessTTL)
	refresh, _ := h.authSvc.IssueToken(userID, req.Email, refreshTTL)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(tokenResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int(accessTTL.Seconds()),
	})
}

// Login authenticates with email+password and returns JWT pair.
// POST /api/v1/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	row := h.db.QueryRow(r.Context(),
		`SELECT u.id, u.email FROM users u
		 JOIN user_passwords up ON up.user_id = u.id
		 WHERE u.email = $1
		   AND up.password_hash = crypt($2, up.password_hash)`,
		req.Email, req.Password,
	)
	var userID, email string
	if err := row.Scan(&userID, &email); err != nil {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	access, _ := h.authSvc.IssueToken(userID, email, accessTTL)
	refresh, _ := h.authSvc.IssueToken(userID, email, refreshTTL)

	json.NewEncoder(w).Encode(tokenResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int(accessTTL.Seconds()),
	})
}

// Refresh rotates the refresh token.
// POST /api/v1/auth/refresh
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.RefreshToken == "" {
		jsonError(w, "refresh_token required", http.StatusBadRequest)
		return
	}

	claims, err := h.authSvc.Validate(body.RefreshToken)
	if err != nil {
		jsonError(w, "invalid or expired refresh token", http.StatusUnauthorized)
		return
	}

	access, _ := h.authSvc.IssueToken(claims.UserID, claims.Email, accessTTL)
	refresh, _ := h.authSvc.IssueToken(claims.UserID, claims.Email, refreshTTL)

	json.NewEncoder(w).Encode(tokenResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int(accessTTL.Seconds()),
	})
}

// Logout — client drops the tokens. Server-side: no-op for stateless JWT.
// POST /api/v1/auth/logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "logged out"})
}

// Me returns the current user's profile.
// GET /api/v1/auth/me
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	row := h.db.QueryRow(r.Context(),
		`SELECT id, email, username, display_name, avatar_url, timezone,
		        persona_level, streak_freezes_remaining, availability_mood, onboarding_complete,
		        created_at
		 FROM users WHERE id = $1`, userID,
	)
	var u struct {
		ID                     string     `json:"id"`
		Email                  string     `json:"email"`
		Username               string     `json:"username"`
		DisplayName            string     `json:"display_name"`
		AvatarURL              *string    `json:"avatar_url"`
		Timezone               string     `json:"timezone"`
		PersonaLevel           int16      `json:"persona_level"`
		StreakFreezesRemaining int16      `json:"streak_freezes_remaining"`
		AvailabilityMood       *string    `json:"availability_mood"`
		OnboardingComplete     bool       `json:"onboarding_complete"`
		CreatedAt              time.Time  `json:"created_at"`
	}
	if err := row.Scan(&u.ID, &u.Email, &u.Username, &u.DisplayName, &u.AvatarURL,
		&u.Timezone, &u.PersonaLevel, &u.StreakFreezesRemaining, &u.AvailabilityMood,
		&u.OnboardingComplete, &u.CreatedAt); err != nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(u)
}

// helpers shared across handlers
func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func isUniqueViolation(err error) bool {
	return err != nil && (contains(err.Error(), "23505") || contains(err.Error(), "unique"))
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsStr(s, sub))
}

func containsStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
