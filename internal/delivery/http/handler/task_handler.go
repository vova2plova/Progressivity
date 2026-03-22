package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/delivery/http/dto"
	"github.com/vova2plova/progressivity/internal/delivery/http/middleware"
	"github.com/vova2plova/progressivity/internal/domain"
	"github.com/vova2plova/progressivity/internal/usecase"
)

// TaskHandler handles task-related HTTP endpoints.
type TaskHandler struct {
	taskUC     *usecase.TaskUsecase
	progressUC *usecase.ProgressUsecase
	log        *slog.Logger
}

// NewTaskHandler creates a new TaskHandler.
func NewTaskHandler(
	taskUC *usecase.TaskUsecase,
	progressUC *usecase.ProgressUsecase,
	log *slog.Logger,
) *TaskHandler {
	return &TaskHandler{
		taskUC:     taskUC,
		progressUC: progressUC,
		log:        log,
	}
}

// --- Request helpers ---

// requireAuth extracts the authenticated user ID from the request context.
func requireAuth(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, dto.ErrorResponse{Error: "unauthorized"})
	}
	return userID, ok
}

// requirePathID parses the {id} path parameter as UUID.
func requirePathID(w http.ResponseWriter, r *http.Request, label string) (uuid.UUID, bool) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Error: "invalid " + label})
		return uuid.Nil, false
	}
	return id, true
}

// decodeBody decodes JSON request body into dst.
func decodeBody(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Error: "invalid request body"})
		return false
	}
	return true
}

// decodeCreateTaskRequest decodes, validates, and converts a CreateTaskRequest to a domain Task.
func decodeCreateTaskRequest(w http.ResponseWriter, r *http.Request) (*domain.Task, bool) {
	var req dto.CreateTaskRequest
	if !decodeBody(w, r, &req) {
		return nil, false
	}
	if req.Title == "" {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Error: "title is required"})
		return nil, false
	}
	task, err := req.ToDomainTask()
	if err != nil {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Error: "invalid deadline format"})
		return nil, false
	}
	return task, true
}

// decodeUpdateTaskRequest decodes, validates, and converts an UpdateTaskRequest to a domain Task.
func decodeUpdateTaskRequest(w http.ResponseWriter, r *http.Request) (*domain.Task, bool) {
	var req dto.UpdateTaskRequest
	if !decodeBody(w, r, &req) {
		return nil, false
	}
	if req.Title == "" {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Error: "title is required"})
		return nil, false
	}
	task, err := req.ToDomainTask()
	if err != nil {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Error: "invalid deadline format"})
		return nil, false
	}
	return task, true
}

// decodeProgressRequest decodes, validates, and converts a CreateProgressRequest to a domain ProgressEntry.
func decodeProgressRequest(w http.ResponseWriter, r *http.Request) (*domain.ProgressEntry, bool) {
	var req dto.CreateProgressRequest
	if !decodeBody(w, r, &req) {
		return nil, false
	}
	if req.Value <= 0 {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Error: "value must be positive"})
		return nil, false
	}
	entry, err := req.ToDomainProgressEntry()
	if err != nil {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Error: "invalid recorded_at format, expected RFC3339"})
		return nil, false
	}
	return entry, true
}

// --- Task endpoints ---

// ListRootTasks handles GET /tasks.
func (h *TaskHandler) ListRootTasks(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}

	tasks, err := h.taskUC.ListRootTasks(r.Context(), userID)
	if err != nil {
		h.handleError(w, err)
		return
	}

	resp := make([]dto.TaskResponse, 0, len(tasks))
	for _, t := range tasks {
		resp = append(resp, dto.TaskResponseFromTaskWithProgress(t))
	}
	writeJSON(w, http.StatusOK, resp)
}

// CreateTask handles POST /tasks.
func (h *TaskHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}
	task, ok := decodeCreateTaskRequest(w, r)
	if !ok {
		return
	}
	created, err := h.taskUC.CreateTask(r.Context(), userID, task)
	if err != nil {
		h.handleError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, dto.TaskResponseFromDomain(created))
}

// GetTask handles GET /tasks/{id}.
func (h *TaskHandler) GetTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}
	taskID, ok := requirePathID(w, r, "task ID")
	if !ok {
		return
	}
	task, err := h.taskUC.GetTask(r.Context(), userID, taskID)
	if err != nil {
		h.handleError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, dto.TaskResponseFromTaskWithProgress(task))
}

// UpdateTask handles PUT /tasks/{id}.
func (h *TaskHandler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}
	taskID, ok := requirePathID(w, r, "task ID")
	if !ok {
		return
	}
	task, ok := decodeUpdateTaskRequest(w, r)
	if !ok {
		return
	}
	updated, err := h.taskUC.UpdateTask(r.Context(), userID, taskID, task)
	if err != nil {
		h.handleError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, dto.TaskResponseFromDomain(updated))
}

// DeleteTask handles DELETE /tasks/{id}.
func (h *TaskHandler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}
	taskID, ok := requirePathID(w, r, "task ID")
	if !ok {
		return
	}
	if err := h.taskUC.DeleteTask(r.Context(), userID, taskID); err != nil {
		h.handleError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ListChildren handles GET /tasks/{id}/children.
//
//nolint:dupl // structurally similar to ListProgress but operates on different usecase and response type
func (h *TaskHandler) ListChildren(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}
	parentID, ok := requirePathID(w, r, "task ID")
	if !ok {
		return
	}
	children, err := h.taskUC.ListChildren(r.Context(), userID, parentID)
	if err != nil {
		h.handleError(w, err)
		return
	}
	resp := make([]dto.TaskResponse, 0, len(children))
	for _, c := range children {
		resp = append(resp, dto.TaskResponseFromDomain(c))
	}
	writeJSON(w, http.StatusOK, resp)
}

// CreateChildTask handles POST /tasks/{id}/children.
func (h *TaskHandler) CreateChildTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}
	parentID, ok := requirePathID(w, r, "task ID")
	if !ok {
		return
	}
	task, ok := decodeCreateTaskRequest(w, r)
	if !ok {
		return
	}
	created, err := h.taskUC.CreateChildTask(r.Context(), userID, parentID, task)
	if err != nil {
		h.handleError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, dto.TaskResponseFromDomain(created))
}

// GetTree handles GET /tasks/{id}/tree.
func (h *TaskHandler) GetTree(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}
	taskID, ok := requirePathID(w, r, "task ID")
	if !ok {
		return
	}
	tree, err := h.taskUC.GetTree(r.Context(), userID, taskID)
	if err != nil {
		h.handleError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, dto.TaskTreeResponseFromDomain(tree))
}

// ReorderTask handles PATCH /tasks/{id}/reorder.
func (h *TaskHandler) ReorderTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}
	taskID, ok := requirePathID(w, r, "task ID")
	if !ok {
		return
	}
	var req dto.ReorderTaskRequest
	if !decodeBody(w, r, &req) {
		return
	}
	if err := h.taskUC.ReorderTask(r.Context(), userID, taskID, req.Position); err != nil {
		h.handleError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Progress endpoints ---

// ListProgress handles GET /tasks/{id}/progress.
//
//nolint:dupl // structurally similar to ListChildren but operates on different usecase and response type
func (h *TaskHandler) ListProgress(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}
	taskID, ok := requirePathID(w, r, "task ID")
	if !ok {
		return
	}
	entries, err := h.progressUC.ListProgress(r.Context(), userID, taskID)
	if err != nil {
		h.handleError(w, err)
		return
	}
	resp := make([]dto.ProgressEntryResponse, 0, len(entries))
	for _, e := range entries {
		resp = append(resp, dto.ProgressEntryResponseFromDomain(e))
	}
	writeJSON(w, http.StatusOK, resp)
}

// AddProgress handles POST /tasks/{id}/progress.
func (h *TaskHandler) AddProgress(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}
	taskID, ok := requirePathID(w, r, "task ID")
	if !ok {
		return
	}
	entry, ok := decodeProgressRequest(w, r)
	if !ok {
		return
	}
	created, err := h.progressUC.AddProgress(r.Context(), userID, taskID, entry)
	if err != nil {
		h.handleError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, dto.ProgressEntryResponseFromDomain(created))
}

// DeleteProgress handles DELETE /progress/{id}.
func (h *TaskHandler) DeleteProgress(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}
	progressID, ok := requirePathID(w, r, "progress entry ID")
	if !ok {
		return
	}
	if err := h.progressUC.DeleteProgress(r.Context(), userID, progressID); err != nil {
		h.handleError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Error mapping ---

// handleError maps domain errors to HTTP status codes.
func (h *TaskHandler) handleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrTaskNotFound),
		errors.Is(err, domain.ErrProgressNotFound):
		writeJSON(w, http.StatusNotFound, dto.ErrorResponse{Error: err.Error()})
	case errors.Is(err, domain.ErrForbidden):
		writeJSON(w, http.StatusForbidden, dto.ErrorResponse{Error: err.Error()})
	case errors.Is(err, domain.ErrCannotAddProgress),
		errors.Is(err, domain.ErrInvalidTaskTarget),
		errors.Is(err, domain.ErrValidation):
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
	case errors.Is(err, domain.ErrUnauthorized):
		writeJSON(w, http.StatusUnauthorized, dto.ErrorResponse{Error: err.Error()})
	default:
		h.log.Error("internal server error", "error", err)
		writeJSON(w, http.StatusInternalServerError, dto.ErrorResponse{Error: "internal server error"})
	}
}
