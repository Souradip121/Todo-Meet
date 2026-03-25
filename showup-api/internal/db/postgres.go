package db

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

// Connect creates a pgxpool using DATABASE_URL (pooled/PgBouncer mode for REST API).
func Connect(ctx context.Context) (*pgxpool.Pool, error) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	config, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("parse db config: %w", err)
	}
	config.MaxConns = 20

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("connect to db: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	slog.Info("database connected")
	return pool, nil
}

// ConnectDirect creates a pgxpool using DATABASE_URL_DIRECT (for cron jobs — bypasses PgBouncer).
func ConnectDirect(ctx context.Context) (*pgxpool.Pool, error) {
	url := os.Getenv("DATABASE_URL_DIRECT")
	if url == "" {
		url = os.Getenv("DATABASE_URL") // fallback
	}

	config, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("parse db config (direct): %w", err)
	}
	config.MaxConns = 5

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("connect to db (direct): %w", err)
	}
	return pool, nil
}

// RunMigrations runs all pending goose migrations from the migrations/ directory.
func RunMigrations(pool *pgxpool.Pool) error {
	db := stdlib.OpenDBFromPool(pool)
	defer db.Close()

	if err := runGooseMigrations(db); err != nil {
		return fmt.Errorf("migrations: %w", err)
	}
	slog.Info("migrations applied")
	return nil
}

func runGooseMigrations(db *sql.DB) error {
	goose.SetBaseFS(nil) // use OS filesystem
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	return goose.Up(db, "migrations")
}
