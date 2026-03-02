package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
)

type TaskRepository interface {
	Create(ctx context.Context, task *domain.Task) (*domain.Task, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Task, error)
	Update(ctx context.Context, task *domain.Task) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListByParentID(ctx context.Context, parentID uuid.UUID) ([]*domain.Task, error)
	ListRootByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.Task, error)
	GetTreeByID(ctx context.Context, id uuid.UUID) (*domain.TaskWithProgress, error)
	UpdatePosition(ctx context.Context, id uuid.UUID, position int) error
}
