package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Souradip121/showup-api/internal/auth"
)

type contextKey string

const UserIDKey contextKey = "user_id"

// Auth validates the Bearer JWT and injects user_id into the request context.
func Auth(authSvc *auth.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractBearer(r)
			if token == "" {
				jsonError(w, "missing or malformed authorization header", http.StatusUnauthorized)
				return
			}
			claims, err := authSvc.Validate(token)
			if err != nil {
				jsonError(w, "invalid or expired token", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFrom extracts the authenticated user ID from ctx.
// Returns empty string if not set.
func UserIDFrom(ctx context.Context) string {
	v, _ := ctx.Value(UserIDKey).(string)
	return v
}

func extractBearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(h, "Bearer ")
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
