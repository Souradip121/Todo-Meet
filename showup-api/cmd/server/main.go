package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Souradip121/showup-api/internal/api"
	"github.com/Souradip121/showup-api/internal/auth"
	"github.com/Souradip121/showup-api/internal/cache"
	"github.com/Souradip121/showup-api/internal/db"
	"github.com/Souradip121/showup-api/internal/jobs"
)

func main() {
	// Structured JSON logging
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	ctx := context.Background()

	// Database
	pool, err := db.Connect(ctx)
	if err != nil {
		slog.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Run migrations before serving traffic
	if err := db.RunMigrations(pool); err != nil {
		slog.Error("migrations failed", "error", err)
		os.Exit(1)
	}

	// Redis (Upstash)
	redis := cache.NewRedisClient(
		os.Getenv("UPSTASH_REDIS_REST_URL"),
		os.Getenv("UPSTASH_REDIS_REST_TOKEN"),
	)

	// Auth service
	authSvc := auth.New()

	// Background jobs
	scheduler := jobs.NewScheduler(pool)
	scheduler.Start()
	defer scheduler.Stop()

	// Router
	router := api.NewRouter(pool, redis, authSvc)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("server starting", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-done
	slog.Info("server shutting down")

	shutCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutCtx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
	slog.Info("server stopped")
}
