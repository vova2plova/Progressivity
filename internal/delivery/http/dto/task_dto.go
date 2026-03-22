package dto

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
)

// --- Request DTOs ---

// CreateTaskRequest represents the request body for creating a task.
type CreateTaskRequest struct {
	Title       string   `json:"title"`
	Description *string  `json:"description,omitempty"`
	Unit        *string  `json:"unit,omitempty"`
	TargetValue *float64 `json:"target_value,omitempty"`
	TargetCount *int     `json:"target_count,omitempty"`
	Deadline    *string  `json:"deadline,omitempty"` // RFC3339 or date-only (YYYY-MM-DD) string
	Status      string   `json:"status,omitempty"`
}

// UpdateTaskRequest represents the request body for updating a task.
type UpdateTaskRequest struct {
	Title       string   `json:"title"`
	Description *string  `json:"description,omitempty"`
	Unit        *string  `json:"unit,omitempty"`
	TargetValue *float64 `json:"target_value,omitempty"`
	TargetCount *int     `json:"target_count,omitempty"`
	Deadline    *string  `json:"deadline,omitempty"` // RFC3339 or date-only (YYYY-MM-DD) string
	Status      string   `json:"status"`
}

// ReorderTaskRequest represents the request body for reordering a task.
type ReorderTaskRequest struct {
	Position int `json:"position"`
}

// CreateProgressRequest represents the request body for adding a progress entry.
type CreateProgressRequest struct {
	Value      float64 `json:"value"`
	Note       *string `json:"note,omitempty"`
	RecordedAt *string `json:"recorded_at,omitempty"` // RFC3339 or date-only (YYYY-MM-DD) string
}

// --- Response DTOs ---

// TaskResponse represents a single task in API responses.
type TaskResponse struct {
	ID                uuid.UUID  `json:"id"`
	ParentID          *uuid.UUID `json:"parent_id,omitempty"`
	UserID            uuid.UUID  `json:"user_id"`
	Title             string     `json:"title"`
	Description       *string    `json:"description,omitempty"`
	Unit              *string    `json:"unit,omitempty"`
	TargetValue       *float64   `json:"target_value,omitempty"`
	TargetCount       *int       `json:"target_count,omitempty"`
	Deadline          *time.Time `json:"deadline,omitempty"`
	Position          int        `json:"position"`
	Status            string     `json:"status"`
	Progress          float64    `json:"progress"`
	CurrentValue      float64    `json:"current_value"`
	CompletedChildren int        `json:"completed_children"`
	TotalChildren     int        `json:"total_children"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// TaskTreeResponse represents a task with its recursive children.
type TaskTreeResponse struct {
	TaskResponse
	Children []TaskTreeResponse `json:"children"`
}

// ProgressEntryResponse represents a progress entry in API responses.
type ProgressEntryResponse struct {
	ID         uuid.UUID `json:"id"`
	TaskID     uuid.UUID `json:"task_id"`
	Value      float64   `json:"value"`
	Note       *string   `json:"note,omitempty"`
	RecordedAt time.Time `json:"recorded_at"`
	CreatedAt  time.Time `json:"created_at"`
}

// --- Conversion helpers ---

// TaskResponseFromDomain converts a domain Task to a TaskResponse (no progress info).
func TaskResponseFromDomain(t *domain.Task) TaskResponse {
	return TaskResponse{
		ID:          t.ID,
		ParentID:    t.ParentID,
		UserID:      t.UserID,
		Title:       t.Title,
		Description: t.Description,
		Unit:        t.Unit,
		TargetValue: t.TargetValue,
		TargetCount: t.TargetCount,
		Deadline:    t.Deadline,
		Position:    t.Position,
		Status:      string(t.Status),
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}
}

// TaskResponseFromTaskWithProgress converts a domain TaskWithProgress to a TaskResponse.
func TaskResponseFromTaskWithProgress(t *domain.TaskWithProgress) TaskResponse {
	return TaskResponse{
		ID:                t.ID,
		ParentID:          t.ParentID,
		UserID:            t.UserID,
		Title:             t.Title,
		Description:       t.Description,
		Unit:              t.Unit,
		TargetValue:       t.TargetValue,
		TargetCount:       t.TargetCount,
		Deadline:          t.Deadline,
		Position:          t.Position,
		Status:            string(t.Status),
		Progress:          t.Progress,
		CurrentValue:      t.CurrentValue,
		CompletedChildren: t.CompletedChildren,
		TotalChildren:     t.TotalChildren,
		CreatedAt:         t.CreatedAt,
		UpdatedAt:         t.UpdatedAt,
	}
}

// TaskTreeResponseFromDomain recursively converts a domain TaskWithProgress tree.
func TaskTreeResponseFromDomain(t *domain.TaskWithProgress) TaskTreeResponse {
	resp := TaskTreeResponse{
		TaskResponse: TaskResponseFromTaskWithProgress(t),
		Children:     make([]TaskTreeResponse, 0, len(t.Children)),
	}

	for _, child := range t.Children {
		resp.Children = append(resp.Children, TaskTreeResponseFromDomain(child))
	}

	return resp
}

// ProgressEntryResponseFromDomain converts a domain ProgressEntry to a ProgressEntryResponse.
func ProgressEntryResponseFromDomain(e *domain.ProgressEntry) ProgressEntryResponse {
	return ProgressEntryResponse{
		ID:         e.ID,
		TaskID:     e.TaskID,
		Value:      e.Value,
		Note:       e.Note,
		RecordedAt: e.RecordedAt,
		CreatedAt:  e.CreatedAt,
	}
}

// parseOptionalDateTime parses a string that can be empty, RFC3339, or date-only (YYYY-MM-DD).
// Returns nil if the string is empty.
func parseOptionalDateTime(s string) (*time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}

	t, err := time.Parse(time.RFC3339, s)
	if err == nil {
		return &t, nil
	}

	t, err = time.Parse("2006-01-02", s)
	if err == nil {
		// Date-only values are interpreted as the start of the day in UTC.
		t = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		return &t, nil
	}

	return nil, err
}

// ToDomainTask converts a CreateTaskRequest to a domain Task.
func (r *CreateTaskRequest) ToDomainTask() (*domain.Task, error) {
	task := &domain.Task{
		Title:       r.Title,
		Description: r.Description,
		Unit:        r.Unit,
		TargetValue: r.TargetValue,
		TargetCount: r.TargetCount,
	}

	if r.Deadline != nil {
		t, err := parseOptionalDateTime(*r.Deadline)
		if err != nil {
			return nil, err
		}
		task.Deadline = t
	}

	if r.Status != "" {
		task.Status = domain.TaskStatus(r.Status)
	}

	return task, nil
}

// ToDomainTask converts an UpdateTaskRequest to a domain Task.
func (r *UpdateTaskRequest) ToDomainTask() (*domain.Task, error) {
	task := &domain.Task{
		Title:       r.Title,
		Description: r.Description,
		Unit:        r.Unit,
		TargetValue: r.TargetValue,
		TargetCount: r.TargetCount,
		Status:      domain.TaskStatus(r.Status),
	}

	if r.Deadline != nil {
		t, err := parseOptionalDateTime(*r.Deadline)
		if err != nil {
			return nil, err
		}
		task.Deadline = t
	}

	return task, nil
}

// ToDomainProgressEntry converts a CreateProgressRequest to a domain ProgressEntry.
func (r *CreateProgressRequest) ToDomainProgressEntry() (*domain.ProgressEntry, error) {
	entry := &domain.ProgressEntry{
		Value: r.Value,
		Note:  r.Note,
	}

	if r.RecordedAt != nil {
		t, err := parseOptionalDateTime(*r.RecordedAt)
		if err != nil {
			return nil, err
		}
		if t != nil {
			entry.RecordedAt = *t
		} else {
			entry.RecordedAt = time.Now()
		}
	} else {
		entry.RecordedAt = time.Now()
	}

	return entry, nil
}
