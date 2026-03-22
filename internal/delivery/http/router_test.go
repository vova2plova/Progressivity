package http

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/delivery/http/dto"
	"github.com/vova2plova/progressivity/internal/domain"
	"github.com/vova2plova/progressivity/internal/infrastructure/auth"
	"github.com/vova2plova/progressivity/internal/testutil"
	"github.com/vova2plova/progressivity/internal/usecase"
	"github.com/vova2plova/progressivity/pkg/config"
)

// testEnv holds the shared test dependencies.
type testEnv struct {
	router       http.Handler
	jwtManager   *auth.JWTManager
	userRepo     *testutil.MockUserRepository
	taskRepo     *testutil.MockTaskRepository
	progressRepo *testutil.MockProgressEntryRepository
}

func setupTestEnv() *testEnv {
	log := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))

	jwtMgr := auth.NewJWTManager(&config.JWTConfig{
		AccessSecret:  "test-access-secret-key-1234567890",
		RefreshSecret: "test-refresh-secret-key-1234567890",
		AccessTTL:     15 * time.Minute,
		RefreshTTL:    24 * time.Hour,
	})

	userRepo := testutil.NewMockUserRepository()
	taskRepo := testutil.NewMockTaskRepository()
	progressRepo := testutil.NewMockProgressEntryRepository()

	authUC := usecase.NewAuthUsecase(userRepo, jwtMgr, log)
	taskUC := usecase.NewTaskUsecase(taskRepo, progressRepo, log)
	progressUC := usecase.NewProgressUsecase(taskRepo, progressRepo, log)

	router := NewRouter(authUC, taskUC, progressUC, jwtMgr, log, "http://localhost:5173")

	return &testEnv{
		router:       router,
		jwtManager:   jwtMgr,
		userRepo:     userRepo,
		taskRepo:     taskRepo,
		progressRepo: progressRepo,
	}
}

func (e *testEnv) generateAuthToken(userID uuid.UUID) string {
	token, _ := e.jwtManager.GenerateAccessToken(userID)
	return token
}

func jsonBody(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	data, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("failed to marshal body: %v", err)
	}
	return bytes.NewBuffer(data)
}

func parseJSON[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var result T
	if err := json.NewDecoder(rec.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v (body: %s)", err, rec.Body.String())
	}
	return result
}

// ============ Auth Handler Tests ============

func TestHandler_Register_Success(t *testing.T) {
	env := setupTestEnv()

	body := jsonBody(t, dto.RegisterRequest{
		Email:    "test@example.com",
		Username: "testuser",
		Password: "password123",
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", rec.Code, rec.Body.String())
	}

	resp := parseJSON[dto.AuthResponse](t, rec)
	if resp.AccessToken == "" || resp.RefreshToken == "" {
		t.Error("expected non-empty tokens")
	}
}

func TestHandler_Register_InvalidEmail(t *testing.T) {
	env := setupTestEnv()

	body := jsonBody(t, dto.RegisterRequest{
		Email:    "invalid",
		Username: "testuser",
		Password: "password123",
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}
}

func TestHandler_Register_ShortPassword(t *testing.T) {
	env := setupTestEnv()

	body := jsonBody(t, dto.RegisterRequest{
		Email:    "test@example.com",
		Username: "testuser",
		Password: "short",
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}
}

func TestHandler_Login_Success(t *testing.T) {
	env := setupTestEnv()

	// Register first.
	regBody := jsonBody(t, dto.RegisterRequest{
		Email:    "test@example.com",
		Username: "testuser",
		Password: "password123",
	})
	regReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", regBody)
	regReq.Header.Set("Content-Type", "application/json")
	regRec := httptest.NewRecorder()
	env.router.ServeHTTP(regRec, regReq)

	if regRec.Code != http.StatusCreated {
		t.Fatalf("registration failed: %d %s", regRec.Code, regRec.Body.String())
	}

	// Login.
	loginBody := jsonBody(t, dto.LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", loginBody)
	loginReq.Header.Set("Content-Type", "application/json")
	loginRec := httptest.NewRecorder()
	env.router.ServeHTTP(loginRec, loginReq)

	if loginRec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", loginRec.Code, loginRec.Body.String())
	}

	resp := parseJSON[dto.AuthResponse](t, loginRec)
	if resp.AccessToken == "" {
		t.Error("expected non-empty access token")
	}
}

func TestHandler_Login_WrongPassword(t *testing.T) {
	env := setupTestEnv()

	regBody := jsonBody(t, dto.RegisterRequest{
		Email:    "test@example.com",
		Username: "testuser",
		Password: "password123",
	})
	regReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", regBody)
	regReq.Header.Set("Content-Type", "application/json")
	regRec := httptest.NewRecorder()
	env.router.ServeHTTP(regRec, regReq)

	loginBody := jsonBody(t, dto.LoginRequest{
		Email:    "test@example.com",
		Password: "wrongpassword",
	})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", loginBody)
	loginReq.Header.Set("Content-Type", "application/json")
	loginRec := httptest.NewRecorder()
	env.router.ServeHTTP(loginRec, loginReq)

	if loginRec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", loginRec.Code)
	}
}

func TestHandler_Refresh_Success(t *testing.T) {
	env := setupTestEnv()

	// Register to get tokens.
	regBody := jsonBody(t, dto.RegisterRequest{
		Email:    "test@example.com",
		Username: "testuser",
		Password: "password123",
	})
	regReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", regBody)
	regReq.Header.Set("Content-Type", "application/json")
	regRec := httptest.NewRecorder()
	env.router.ServeHTTP(regRec, regReq)

	regResp := parseJSON[dto.AuthResponse](t, regRec)

	// Refresh.
	refreshBody := jsonBody(t, dto.RefreshRequest{RefreshToken: regResp.RefreshToken})
	refreshReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", refreshBody)
	refreshReq.Header.Set("Content-Type", "application/json")
	refreshRec := httptest.NewRecorder()
	env.router.ServeHTTP(refreshRec, refreshReq)

	if refreshRec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", refreshRec.Code, refreshRec.Body.String())
	}
}

func TestHandler_Logout(t *testing.T) {
	env := setupTestEnv()

	body := jsonBody(t, dto.LogoutRequest{RefreshToken: "some-token"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d", rec.Code)
	}
}

// ============ Task Handler Tests ============

func TestHandler_CreateTask_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	token := env.generateAuthToken(userID)

	body := jsonBody(t, dto.CreateTaskRequest{Title: "Read 10 books"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", rec.Code, rec.Body.String())
	}

	resp := parseJSON[dto.TaskResponse](t, rec)
	if resp.Title != "Read 10 books" {
		t.Errorf("expected title 'Read 10 books', got %q", resp.Title)
	}
	if resp.UserID != userID {
		t.Errorf("expected userID %v, got %v", userID, resp.UserID)
	}
}

func TestHandler_CreateTask_Unauthorized(t *testing.T) {
	env := setupTestEnv()

	body := jsonBody(t, dto.CreateTaskRequest{Title: "Task"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
}

func TestHandler_CreateTask_MissingTitle(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	token := env.generateAuthToken(userID)

	body := jsonBody(t, dto.CreateTaskRequest{Title: ""})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}
}

func TestHandler_ListRootTasks_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	token := env.generateAuthToken(userID)

	// Create some tasks.
	env.taskRepo.AddTask(&domain.Task{
		ID: uuid.New(), UserID: userID, Title: "Goal 1", Status: domain.TaskStatusPending,
	})
	env.taskRepo.AddTask(&domain.Task{
		ID: uuid.New(), UserID: userID, Title: "Goal 2", Status: domain.TaskStatusPending,
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", http.NoBody)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var tasks []dto.TaskResponse
	if err := json.NewDecoder(rec.Body).Decode(&tasks); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(tasks) != 2 {
		t.Errorf("expected 2 tasks, got %d", len(tasks))
	}
}

func TestHandler_GetTask_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	taskID := uuid.New()
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "My Task", Status: domain.TaskStatusPending,
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/"+taskID.String(), http.NoBody)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	resp := parseJSON[dto.TaskResponse](t, rec)
	if resp.Title != "My Task" {
		t.Errorf("expected title 'My Task', got %q", resp.Title)
	}
}

func TestHandler_GetTask_NotFound(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	token := env.generateAuthToken(userID)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/"+uuid.New().String(), http.NoBody)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", rec.Code)
	}
}

func TestHandler_GetTask_InvalidID(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	token := env.generateAuthToken(userID)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/not-a-uuid", http.NoBody)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}
}

func TestHandler_UpdateTask_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	taskID := uuid.New()
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "Old title", Status: domain.TaskStatusPending,
	})

	body := jsonBody(t, dto.UpdateTaskRequest{
		Title:  "New title",
		Status: "in_progress",
	})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/tasks/"+taskID.String(), body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	resp := parseJSON[dto.TaskResponse](t, rec)
	if resp.Title != "New title" {
		t.Errorf("expected title 'New title', got %q", resp.Title)
	}
}

func TestHandler_DeleteTask_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	taskID := uuid.New()
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "To delete", Status: domain.TaskStatusPending,
	})

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/tasks/"+taskID.String(), http.NoBody)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestHandler_DeleteTask_Forbidden(t *testing.T) {
	env := setupTestEnv()
	ownerID := uuid.New()
	otherUserID := uuid.New()
	taskID := uuid.New()
	token := env.generateAuthToken(otherUserID)

	env.taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: ownerID, Title: "Owner's task", Status: domain.TaskStatusPending,
	})

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/tasks/"+taskID.String(), http.NoBody)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", rec.Code)
	}
}

func TestHandler_CreateChildTask_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	parentID := uuid.New()
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: parentID, UserID: userID, Title: "Parent", Status: domain.TaskStatusPending,
	})

	body := jsonBody(t, dto.CreateTaskRequest{Title: "Child task"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+parentID.String()+"/children", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", rec.Code, rec.Body.String())
	}

	resp := parseJSON[dto.TaskResponse](t, rec)
	if resp.Title != "Child task" {
		t.Errorf("expected title 'Child task', got %q", resp.Title)
	}
}

func TestHandler_ListChildren_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	parentID := uuid.New()
	childID := uuid.New()
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: parentID, UserID: userID, Title: "Parent", Status: domain.TaskStatusPending,
	})
	env.taskRepo.AddTask(&domain.Task{
		ID: childID, UserID: userID, ParentID: &parentID, Title: "Child", Status: domain.TaskStatusPending,
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/"+parentID.String()+"/children", http.NoBody)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var children []dto.TaskResponse
	if err := json.NewDecoder(rec.Body).Decode(&children); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(children) != 1 {
		t.Errorf("expected 1 child, got %d", len(children))
	}
}

func TestHandler_GetTree_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	taskID := uuid.New()
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "Goal", Status: domain.TaskStatusPending,
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/"+taskID.String()+"/tree", http.NoBody)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	resp := parseJSON[dto.TaskTreeResponse](t, rec)
	if resp.Title != "Goal" {
		t.Errorf("expected title 'Goal', got %q", resp.Title)
	}
}

func TestHandler_ReorderTask_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	taskID := uuid.New()
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "Task", Position: 0, Status: domain.TaskStatusPending,
	})

	body := jsonBody(t, dto.ReorderTaskRequest{Position: 5})
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/tasks/"+taskID.String()+"/reorder", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d: %s", rec.Code, rec.Body.String())
	}
}

// ============ Progress Handler Tests ============

func TestHandler_AddProgress_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	taskID := uuid.New()
	target := 100.0
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "Task", TargetValue: &target, Status: domain.TaskStatusInProgress,
	})

	body := jsonBody(t, dto.CreateProgressRequest{Value: 25.0})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+taskID.String()+"/progress", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", rec.Code, rec.Body.String())
	}

	resp := parseJSON[dto.ProgressEntryResponse](t, rec)
	if resp.Value != 25.0 {
		t.Errorf("expected value 25.0, got %f", resp.Value)
	}
}

func TestHandler_AddProgress_InvalidValue(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	taskID := uuid.New()
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "Task", Status: domain.TaskStatusPending,
	})

	body := jsonBody(t, dto.CreateProgressRequest{Value: 0})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+taskID.String()+"/progress", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}
}

func TestHandler_AddProgress_NegativeValue(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	taskID := uuid.New()
	target := 100.0
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "Task", TargetValue: &target, Status: domain.TaskStatusInProgress,
	})

	body := jsonBody(t, dto.CreateProgressRequest{Value: -5.0})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+taskID.String()+"/progress", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", rec.Code, rec.Body.String())
	}

	resp := parseJSON[dto.ProgressEntryResponse](t, rec)
	if resp.Value != -5.0 {
		t.Errorf("expected value -5.0, got %f", resp.Value)
	}
}

func TestHandler_ListProgress_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	taskID := uuid.New()
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "Task", Status: domain.TaskStatusPending,
	})
	env.progressRepo.AddEntry(&domain.ProgressEntry{
		ID: uuid.New(), TaskID: taskID, Value: 10.0, RecordedAt: time.Now(),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/"+taskID.String()+"/progress", http.NoBody)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var entries []dto.ProgressEntryResponse
	if err := json.NewDecoder(rec.Body).Decode(&entries); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(entries) != 1 {
		t.Errorf("expected 1 entry, got %d", len(entries))
	}
}

func TestHandler_DeleteProgress_Success(t *testing.T) {
	env := setupTestEnv()
	userID := uuid.New()
	taskID := uuid.New()
	progressID := uuid.New()
	token := env.generateAuthToken(userID)

	env.taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "Task", Status: domain.TaskStatusPending,
	})
	env.progressRepo.AddEntry(&domain.ProgressEntry{
		ID: progressID, TaskID: taskID, Value: 10.0, RecordedAt: time.Now(),
	})

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/progress/"+progressID.String(), http.NoBody)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d: %s", rec.Code, rec.Body.String())
	}
}

// ============ Health Check ============

func TestHandler_Health(t *testing.T) {
	env := setupTestEnv()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", http.NoBody)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	body := rec.Body.String()
	if body != `{"status":"ok"}` {
		t.Errorf("unexpected body: %s", body)
	}
}

// ============ CORS Tests ============

func TestHandler_CORS_AllowedOrigin(t *testing.T) {
	env := setupTestEnv()

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/health", http.NoBody)
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected status 204 for preflight, got %d", rec.Code)
	}

	origin := rec.Header().Get("Access-Control-Allow-Origin")
	if origin != "http://localhost:5173" {
		t.Errorf("expected Access-Control-Allow-Origin 'http://localhost:5173', got %q", origin)
	}

	methods := rec.Header().Get("Access-Control-Allow-Methods")
	if methods == "" {
		t.Error("expected non-empty Access-Control-Allow-Methods")
	}
}

func TestHandler_CORS_DisallowedOrigin(t *testing.T) {
	env := setupTestEnv()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", http.NoBody)
	req.Header.Set("Origin", "http://evil.com")
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	origin := rec.Header().Get("Access-Control-Allow-Origin")
	if origin != "" {
		t.Errorf("expected empty Access-Control-Allow-Origin for disallowed origin, got %q", origin)
	}
}

// ============ Auth Middleware Tests ============

func TestHandler_InvalidToken(t *testing.T) {
	env := setupTestEnv()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", http.NoBody)
	req.Header.Set("Authorization", "Bearer invalid-token")
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
}

func TestHandler_MissingAuthHeader(t *testing.T) {
	env := setupTestEnv()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", http.NoBody)
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
}

func TestHandler_MalformedAuthHeader(t *testing.T) {
	env := setupTestEnv()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", http.NoBody)
	req.Header.Set("Authorization", "NotBearer token")
	rec := httptest.NewRecorder()

	env.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
}
