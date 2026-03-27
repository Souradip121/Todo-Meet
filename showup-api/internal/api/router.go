package api

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souradip121/showup-api/internal/api/handlers"
	"github.com/Souradip121/showup-api/internal/api/middleware"
	"github.com/Souradip121/showup-api/internal/auth"
	"github.com/Souradip121/showup-api/internal/cache"
)

// NewRouter builds the chi router with all middleware and routes wired.
func NewRouter(db *pgxpool.Pool, redis *cache.RedisClient, authSvc *auth.Service) http.Handler {
	r := chi.NewRouter()

	// Core middleware
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RealIP)
	r.Use(middleware.Logger)

	// CORS
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			allowed := map[string]bool{
				"https://showup.day":       true,
				"http://localhost:3000":    true,
				"http://localhost:3001":    true,
			}
			if allowed[origin] || os.Getenv("APP_ENV") == "development" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

	// Handlers
	authH := handlers.NewAuthHandler(db, authSvc)
	declH := handlers.NewDeclarationHandler(db)
	cmtH := handlers.NewCommitmentHandler(db)
	debriefH := handlers.NewDebriefHandler(db)
	scoreH := handlers.NewScoreHandler(db)
	groupH := handlers.NewGroupHandler(db)
	sessH := handlers.NewSessionHandler(db)
	rcH := handlers.NewRecurringCommitmentHandler(db)

	// Health check
	r.Get("/health", handleHealth)

	// API v1
	r.Route("/api/v1", func(r chi.Router) {

		// Public auth routes
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authH.Register)
			r.Post("/login", authH.Login)
			r.Post("/refresh", authH.Refresh)
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(authSvc))
			// General rate limit: 120/min per user
			r.Use(middleware.RateLimit(redis, 120, time.Minute, "global"))

			// Auth (protected)
			r.Post("/auth/logout", authH.Logout)
			r.Get("/auth/me", authH.Me)
			r.Patch("/auth/profile", authH.UpdateProfile)

			// Declarations
			r.Route("/declarations", func(r chi.Router) {
				r.With(middleware.RateLimit(redis, 5, 24*time.Hour, "declarations")).
					Post("/", declH.Create)
				r.Get("/today", declH.Today)
				r.Get("/history", declH.History)
			})

			// Commitments
			r.Route("/commitments", func(r chi.Router) {
				r.Get("/", cmtH.List)
				r.Get("/slipping", cmtH.Slipping)
				r.Patch("/{id}/complete", cmtH.Complete)
				r.Patch("/{id}/carry", cmtH.Carry)
				r.Patch("/{id}/drop", cmtH.Drop)
				r.Patch("/{id}/focus", cmtH.AddFocusTime)
			})

			// Debriefs
			r.Route("/debriefs", func(r chi.Router) {
				r.With(middleware.RateLimit(redis, 3, 24*time.Hour, "debriefs")).
					Post("/", debriefH.Create)
				r.Get("/streak", debriefH.Streak)
				r.Get("/{date}", debriefH.ByDate)
			})

			// Streak freeze
			r.Post("/streaks/freeze", debriefH.FreezeStreak)

			// Scores / integrity grid
			r.Route("/scores", func(r chi.Router) {
				r.Get("/grid", scoreH.Grid)
				r.Get("/weekly", scoreH.Weekly)
				r.Get("/day/{date}", scoreH.Day)
			})

			// Groups
			r.Route("/groups", func(r chi.Router) {
				r.Post("/", groupH.Create)
				r.Get("/", groupH.List)
				r.Post("/join", groupH.Join)
				r.Get("/{id}", groupH.Get)
				r.Post("/{id}/leave", groupH.Leave)
				r.Post("/{id}/nudge/{userID}", groupH.Nudge)
				r.Delete("/{id}", groupH.Archive)
				r.Get("/{id}/sessions", sessH.ListForGroup)
			})

			// Sessions
			r.Route("/sessions", func(r chi.Router) {
				r.Post("/", sessH.Create)
				r.Get("/active", sessH.Active)
				r.Get("/{id}", sessH.Get)
				r.Post("/{id}/join", sessH.Join)
				r.Post("/{id}/start", sessH.Start)
				r.Post("/{id}/end", sessH.End)
				r.Patch("/{id}/update", sessH.SubmitUpdate)
			})
			// Recurring commitments (long-run activities)
			r.Get("/commitments/today", rcH.Today)
			r.Route("/commitments/recurring", func(r chi.Router) {
				r.Post("/", rcH.Create)
				r.Get("/", rcH.List)
				r.Get("/{id}", rcH.Get)
				r.Patch("/{id}", rcH.Update)
				r.Delete("/{id}", rcH.Archive)
				r.Post("/{id}/renew", rcH.Renew)
				r.Post("/{id}/logs", rcH.LogTime)
				r.Delete("/{id}/logs/{date}", rcH.DeleteLog)
				r.Get("/{id}/stats/weekly", rcH.WeeklyStats)
				r.Get("/{id}/stats/monthly", rcH.MonthlyStats)
				r.Post("/{id}/share", rcH.Share)
			})
		})

		// Public share endpoint (no auth)
		r.Get("/share/{token}", rcH.PublicShare)
	})

	return r
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"version": "0.1.0",
	})
}
