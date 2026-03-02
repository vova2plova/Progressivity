package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
)

type ProgressEntryRepository interface {
	Create(ctx context.Context, entry *domain.ProgressEntry) (*domain.ProgressEntry, error)
	Delete(ctx context.Context, id uuid.UUID) error
	ListByTaskID(ctx context.Context, taskID uuid.UUID) ([]*domain.ProgressEntry, error)
	SumByTaskID(ctx context.Context, taskID uuid.UUID) (float64, error)
}
