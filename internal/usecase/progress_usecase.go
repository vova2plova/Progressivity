package usecase

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
	"github.com/vova2plova/progressivity/internal/repository"
)

// ProgressUsecase handles progress entry business logic.
type ProgressUsecase struct {
	taskRepo     repository.TaskRepository
	progressRepo repository.ProgressEntryRepository
	log          *slog.Logger
}

// NewProgressUsecase creates a new ProgressUsecase.
func NewProgressUsecase(
	taskRepo repository.TaskRepository,
	progressRepo repository.ProgressEntryRepository,
	log *slog.Logger,
) *ProgressUsecase {
	return &ProgressUsecase{
		taskRepo:     taskRepo,
		progressRepo: progressRepo,
		log:          log,
	}
}

// AddProgress adds a progress entry to a leaf task.
// Returns ErrCannotAddProgress if the task is a container (has children).
func (uc *ProgressUsecase) AddProgress(
	ctx context.Context, userID, taskID uuid.UUID, entry *domain.ProgressEntry,
) (*domain.ProgressEntry, error) {
	task, err := uc.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, domain.ErrTaskNotFound) {
			return nil, domain.ErrTaskNotFound
		}
		uc.log.Error("failed to get task", "error", err)
		return nil, domain.ErrInternalServerError
	}

	if task.UserID != userID {
		return nil, domain.ErrForbidden
	}

	// Only leaf tasks (no children) can receive progress entries.
	children, err := uc.taskRepo.ListByParentID(ctx, taskID)
	if err != nil {
		uc.log.Error("failed to check task children", "error", err)
		return nil, domain.ErrInternalServerError
	}
	if len(children) > 0 {
		return nil, domain.ErrCannotAddProgress
	}

	entry.TaskID = taskID

	created, err := uc.progressRepo.Create(ctx, entry)
	if err != nil {
		uc.log.Error("failed to create progress entry", "error", err)
		return nil, domain.ErrInternalServerError
	}

	return created, nil
}

// DeleteProgress deletes a progress entry after verifying task ownership.
func (uc *ProgressUsecase) DeleteProgress(ctx context.Context, userID, progressID uuid.UUID) error {
	entry, err := uc.progressRepo.GetByID(ctx, progressID)
	if err != nil {
		if errors.Is(err, domain.ErrProgressNotFound) {
			return domain.ErrProgressNotFound
		}
		uc.log.Error("failed to get progress entry", "error", err)
		return domain.ErrInternalServerError
	}

	// Verify ownership through the parent task.
	task, err := uc.taskRepo.GetByID(ctx, entry.TaskID)
	if err != nil {
		uc.log.Error("failed to get task for progress entry", "error", err)
		return domain.ErrInternalServerError
	}

	if task.UserID != userID {
		return domain.ErrForbidden
	}

	if err := uc.progressRepo.Delete(ctx, progressID); err != nil {
		uc.log.Error("failed to delete progress entry", "error", err)
		return domain.ErrInternalServerError
	}

	return nil
}

// ListProgress returns all progress entries for a task after verifying ownership.
func (uc *ProgressUsecase) ListProgress(
	ctx context.Context, userID, taskID uuid.UUID,
) ([]*domain.ProgressEntry, error) {
	if err := uc.verifyTaskOwnership(ctx, taskID, userID); err != nil {
		return nil, err
	}

	entries, err := uc.progressRepo.ListByTaskID(ctx, taskID)
	if err != nil {
		uc.log.Error("failed to list progress entries", "error", err)
		return nil, domain.ErrInternalServerError
	}

	return entries, nil
}

// verifyTaskOwnership checks that the task exists and belongs to the user.
func (uc *ProgressUsecase) verifyTaskOwnership(ctx context.Context, taskID, userID uuid.UUID) error {
	task, err := uc.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, domain.ErrTaskNotFound) {
			return domain.ErrTaskNotFound
		}
		uc.log.Error("failed to get task for ownership check", "error", err)
		return domain.ErrInternalServerError
	}

	if task.UserID != userID {
		return domain.ErrForbidden
	}

	return nil
}
