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
	"github.com/Souradip121/showup-api/internal/email"
	"github.com/Souradip121/showup-api/internal/jobs"
	"github.com/Souradip121/showup-api/internal/storage"
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

	// Cloudinary (optional — photo upload disabled if not configured)
	cdn := storage.NewCloudinaryClient(
		os.Getenv("CLOUDINARY_CLOUD_NAME"),
		os.Getenv("CLOUDINARY_API_KEY"),
		os.Getenv("CLOUDINARY_API_SECRET"),
	)
	if cdn == nil {
		slog.Warn("Cloudinary not configured — photo upload disabled")
	}

	// Email client (Resend — optional, duo notifications disabled if not configured)
	emailClient := email.NewClient(os.Getenv("RESEND_API_KEY"))

	// Background jobs
	scheduler := jobs.NewScheduler(pool, emailClient)
	scheduler.Start()
	defer scheduler.Stop()

	// Router
	router := api.NewRouter(pool, redis, authSvc, cdn)

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
