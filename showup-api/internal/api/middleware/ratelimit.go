package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/Souradip121/showup-api/internal/cache"
)

// RateLimit returns middleware that enforces a token bucket per user.
// limit: max requests, window: duration of the window.
// Key pattern: ratelimit:{userID}:{label}
func RateLimit(redis *cache.RedisClient, limit int, window time.Duration, label string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := UserIDFrom(r.Context())
			if userID == "" {
				next.ServeHTTP(w, r)
				return
			}

			key := fmt.Sprintf("ratelimit:%s:%s", userID, label)
			ctx := context.Background()

			count, err := redis.Incr(ctx, key)
			if err != nil {
				// Fail open — don't block on Redis errors
				next.ServeHTTP(w, r)
				return
			}

			if count == 1 {
				// First request in window — set expiry
				redis.Expire(ctx, key, window)
			}

			if count > int64(limit) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
				w.WriteHeader(http.StatusTooManyRequests)
				json.NewEncoder(w).Encode(map[string]string{
					"error": fmt.Sprintf("rate limit exceeded: %d requests per %s", limit, window),
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
