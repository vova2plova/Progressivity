package http

import (
	"log/slog"
	"net/http"

	"github.com/vova2plova/progressivity/internal/delivery/http/handler"
	"github.com/vova2plova/progressivity/internal/delivery/http/middleware"
	"github.com/vova2plova/progressivity/internal/infrastructure/auth"
	"github.com/vova2plova/progressivity/internal/usecase"
)

// NewRouter creates and configures the HTTP router with all routes and middleware.
func NewRouter(
	authUC *usecase.AuthUsecase,
	taskUC *usecase.TaskUsecase,
	progressUC *usecase.ProgressUsecase,
	jwtManager *auth.JWTManager,
	log *slog.Logger,
) http.Handler {
	mux := http.NewServeMux()

	// Handlers
	authHandler := handler.NewAuthHandler(authUC, log)
	taskHandler := handler.NewTaskHandler(taskUC, progressUC, log)

	// Auth middleware
	authMW := middleware.Auth(jwtManager)

	// --- Public routes: Auth ---
	mux.HandleFunc("POST /api/v1/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/auth/refresh", authHandler.Refresh)
	mux.HandleFunc("POST /api/v1/auth/logout", authHandler.Logout)

	// --- Protected routes: Tasks ---
	mux.Handle("GET /api/v1/tasks", authMW(http.HandlerFunc(taskHandler.ListRootTasks)))
	mux.Handle("POST /api/v1/tasks", authMW(http.HandlerFunc(taskHandler.CreateTask)))
	mux.Handle("GET /api/v1/tasks/{id}", authMW(http.HandlerFunc(taskHandler.GetTask)))
	mux.Handle("PUT /api/v1/tasks/{id}", authMW(http.HandlerFunc(taskHandler.UpdateTask)))
	mux.Handle("DELETE /api/v1/tasks/{id}", authMW(http.HandlerFunc(taskHandler.DeleteTask)))
	mux.Handle("GET /api/v1/tasks/{id}/children", authMW(http.HandlerFunc(taskHandler.ListChildren)))
	mux.Handle("POST /api/v1/tasks/{id}/children", authMW(http.HandlerFunc(taskHandler.CreateChildTask)))
	mux.Handle("GET /api/v1/tasks/{id}/tree", authMW(http.HandlerFunc(taskHandler.GetTree)))
	mux.Handle("PATCH /api/v1/tasks/{id}/reorder", authMW(http.HandlerFunc(taskHandler.ReorderTask)))

	// --- Protected routes: Progress ---
	mux.Handle("GET /api/v1/tasks/{id}/progress", authMW(http.HandlerFunc(taskHandler.ListProgress)))
	mux.Handle("POST /api/v1/tasks/{id}/progress", authMW(http.HandlerFunc(taskHandler.AddProgress)))
	mux.Handle("DELETE /api/v1/progress/{id}", authMW(http.HandlerFunc(taskHandler.DeleteProgress)))

	// Apply global middleware stack: logging -> recovery -> handler
	var rootHandler http.Handler = mux
	rootHandler = middleware.Recovery(log)(rootHandler)
	rootHandler = middleware.Logging(log)(rootHandler)

	return rootHandler
}
