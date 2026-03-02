package domain

import (
	"time"

	"github.com/google/uuid"
)

type TaskStatus string

const (
	TaskStatusPending    TaskStatus = "pending"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusCompleted  TaskStatus = "completed"
	TaskStatusCancelled  TaskStatus = "cancelled"
)

type Task struct {
	ID          uuid.UUID  `db:"id"`
	ParentID    *uuid.UUID `db:"parent_id"`
	UserID      uuid.UUID  `db:"user_id"`
	Title       string     `db:"title"`
	Description *string    `db:"description"`
	Unit        *string    `db:"unit"`
	TargetValue *float64   `db:"target_value"`
	TargetCount *int       `db:"target_count"`
	Deadline    *time.Time `db:"deadline"`
	Position    int        `db:"position"`
	Status      TaskStatus `db:"status"`
	CreatedAt   time.Time  `db:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at"`
}
