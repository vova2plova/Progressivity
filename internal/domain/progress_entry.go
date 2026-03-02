package domain

import (
	"time"

	"github.com/google/uuid"
)

type ProgressEntry struct {
	ID         uuid.UUID `db:"id"`
	TaskID     uuid.UUID `db:"task_id"`
	Value      float64   `db:"value"`
	Note       *string   `db:"note"`
	RecordedAt time.Time `db:"recorded_at"`
	CreatedAt  time.Time `db:"created_at"`
}
