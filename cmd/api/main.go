package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/vitalijka10/progressivity/pkg/config"
	"github.com/vitalijka10/progressivity/pkg/logger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	log := logger.New(cfg.Log.Level)
	log.Info("starting progressivity",
		"port", cfg.Server.Port,
		"db_host", cfg.Database.Host,
		"log_level", cfg.Log.Level,
	)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	server := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Info("server listening", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()
	<-quit
	log.Info("shutting down server...")

	const baseTimeout = 10
	ctx, cancel := context.WithTimeout(context.Background(), baseTimeout*time.Second)

	if err := server.Shutdown(ctx); err != nil {
		cancel()
		log.Error("server forced to shutdown", "error", err)
		os.Exit(1)
	}

	cancel()
	log.Info("server stopped")
}
