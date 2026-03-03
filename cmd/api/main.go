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

	delivery "github.com/vova2plova/progressivity/internal/delivery/http"
	"github.com/vova2plova/progressivity/internal/infrastructure/auth"
	"github.com/vova2plova/progressivity/internal/infrastructure/postgres"
	"github.com/vova2plova/progressivity/internal/usecase"
	"github.com/vova2plova/progressivity/pkg/config"
	"github.com/vova2plova/progressivity/pkg/logger"
)

func main() {
	// --- Config ---
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// --- Logger ---
	log := logger.New(cfg.Log.Level)
	log.Info("starting progressivity",
		"port", cfg.Server.Port,
		"db_host", cfg.Database.Host,
		"log_level", cfg.Log.Level,
	)

	// --- Database ---
	db, err := postgres.InitDB(context.Background(), &cfg.Database)
	if err != nil {
		log.Error("failed to init database", "error", err)
		os.Exit(1)
	}
	log.Info("database connected")

	// --- Repositories ---
	userRepo := postgres.NewUserRepository(db)
	taskRepo := postgres.NewTaskRepository(db)
	progressRepo := postgres.NewProgressEntryRepository(db)

	// --- JWT Manager ---
	jwtManager := auth.NewJWTManager(&cfg.JWT)

	// --- Usecases ---
	authUC := usecase.NewAuthUsecase(userRepo, jwtManager, log)
	taskUC := usecase.NewTaskUsecase(taskRepo, progressRepo, log)
	progressUC := usecase.NewProgressUsecase(taskRepo, progressRepo, log)

	// --- HTTP Router ---
	router := delivery.NewRouter(
		authUC,
		taskUC,
		progressUC,
		jwtManager,
		log,
		cfg.Server.CORSAllowedOrigins,
	)

	// --- HTTP Server ---
	server := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// --- Graceful Shutdown ---
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

	const shutdownTimeout = 10
	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout*time.Second)

	if err := server.Shutdown(ctx); err != nil {
		log.Error("server forced to shutdown", "error", err)
		cancel()
		os.Exit(1)
	}
	cancel()

	if err := db.Close(); err != nil {
		log.Error("failed to close database", "error", err)
	}

	log.Info("server stopped gracefully")
}
