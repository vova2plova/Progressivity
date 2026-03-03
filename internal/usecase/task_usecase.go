package usecase

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
	"github.com/vova2plova/progressivity/internal/repository"
)

// TaskUsecase handles task-related business logic.
type TaskUsecase struct {
	taskRepo     repository.TaskRepository
	progressRepo repository.ProgressEntryRepository
	log          *slog.Logger
}

// NewTaskUsecase creates a new TaskUsecase.
func NewTaskUsecase(
	taskRepo repository.TaskRepository,
	progressRepo repository.ProgressEntryRepository,
	log *slog.Logger,
) *TaskUsecase {
	return &TaskUsecase{
		taskRepo:     taskRepo,
		progressRepo: progressRepo,
		log:          log,
	}
}

// CreateTask creates a new top-level task for the given user.
func (uc *TaskUsecase) CreateTask(ctx context.Context, userID uuid.UUID, task *domain.Task) (*domain.Task, error) {
	task.UserID = userID
	task.ParentID = nil
	if task.Status == "" {
		task.Status = domain.TaskStatusPending
	}

	created, err := uc.taskRepo.Create(ctx, task)
	if err != nil {
		uc.log.Error("failed to create task", "error", err)
		return nil, domain.ErrInternalServerError
	}

	return created, nil
}

// CreateChildTask creates a child task under the specified parent.
// It verifies that the parent task exists and belongs to the user.
func (uc *TaskUsecase) CreateChildTask(ctx context.Context, userID, parentID uuid.UUID, task *domain.Task) (*domain.Task, error) {
	parent, err := uc.taskRepo.GetByID(ctx, parentID)
	if err != nil {
		if errors.Is(err, domain.ErrTaskNotFound) {
			return nil, domain.ErrTaskNotFound
		}
		uc.log.Error("failed to get parent task", "error", err)
		return nil, domain.ErrInternalServerError
	}

	if parent.UserID != userID {
		return nil, domain.ErrForbidden
	}

	task.UserID = userID
	task.ParentID = &parentID
	if task.Status == "" {
		task.Status = domain.TaskStatusPending
	}

	created, err := uc.taskRepo.Create(ctx, task)
	if err != nil {
		uc.log.Error("failed to create child task", "error", err)
		return nil, domain.ErrInternalServerError
	}

	return created, nil
}

// GetTask returns a task with recursively calculated progress.
func (uc *TaskUsecase) GetTask(ctx context.Context, userID, taskID uuid.UUID) (*domain.TaskWithProgress, error) {
	tree, err := uc.taskRepo.GetTreeByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, domain.ErrTaskNotFound) {
			return nil, domain.ErrTaskNotFound
		}
		uc.log.Error("failed to get task tree", "error", err)
		return nil, domain.ErrInternalServerError
	}

	if tree.UserID != userID {
		return nil, domain.ErrForbidden
	}

	return tree, nil
}

// UpdateTask updates a task after verifying ownership.
func (uc *TaskUsecase) UpdateTask(ctx context.Context, userID, taskID uuid.UUID, update *domain.Task) (*domain.Task, error) {
	existing, err := uc.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, domain.ErrTaskNotFound) {
			return nil, domain.ErrTaskNotFound
		}
		uc.log.Error("failed to get task for update", "error", err)
		return nil, domain.ErrInternalServerError
	}

	if existing.UserID != userID {
		return nil, domain.ErrForbidden
	}

	// Apply updates to existing task, preserving immutable fields.
	existing.Title = update.Title
	existing.Description = update.Description
	existing.Unit = update.Unit
	existing.TargetValue = update.TargetValue
	existing.TargetCount = update.TargetCount
	existing.Deadline = update.Deadline
	existing.Status = update.Status

	err = uc.taskRepo.Update(ctx, existing)
	if err != nil {
		uc.log.Error("failed to update task", "error", err)
		return nil, domain.ErrInternalServerError
	}

	// Re-fetch to return the current state with updated_at.
	updated, err := uc.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		uc.log.Error("failed to get updated task", "error", err)
		return nil, domain.ErrInternalServerError
	}

	return updated, nil
}

// DeleteTask deletes a task after verifying ownership.
// Child tasks and progress entries are removed via database cascade.
func (uc *TaskUsecase) DeleteTask(ctx context.Context, userID, taskID uuid.UUID) error {
	existing, err := uc.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, domain.ErrTaskNotFound) {
			return domain.ErrTaskNotFound
		}
		uc.log.Error("failed to get task for deletion", "error", err)
		return domain.ErrInternalServerError
	}

	if existing.UserID != userID {
		return domain.ErrForbidden
	}

	if err := uc.taskRepo.Delete(ctx, taskID); err != nil {
		uc.log.Error("failed to delete task", "error", err)
		return domain.ErrInternalServerError
	}

	return nil
}

// ListRootTasks returns all top-level tasks for the user with calculated progress.
func (uc *TaskUsecase) ListRootTasks(ctx context.Context, userID uuid.UUID) ([]*domain.TaskWithProgress, error) {
	tasks, err := uc.taskRepo.ListRootByUserID(ctx, userID)
	if err != nil {
		uc.log.Error("failed to list root tasks", "error", err)
		return nil, domain.ErrInternalServerError
	}

	result := make([]*domain.TaskWithProgress, 0, len(tasks))
	for _, t := range tasks {
		tree, err := uc.taskRepo.GetTreeByID(ctx, t.ID)
		if err != nil {
			uc.log.Error("failed to get task tree for root task", "taskID", t.ID, "error", err)
			return nil, domain.ErrInternalServerError
		}
		// Strip deep children — list view only needs summary progress.
		tree.Children = nil
		result = append(result, tree)
	}

	return result, nil
}

// ListChildren returns direct children of a task after verifying ownership.
func (uc *TaskUsecase) ListChildren(ctx context.Context, userID, parentID uuid.UUID) ([]*domain.Task, error) {
	if err := uc.verifyOwnership(ctx, parentID, userID); err != nil {
		return nil, err
	}

	children, err := uc.taskRepo.ListByParentID(ctx, parentID)
	if err != nil {
		uc.log.Error("failed to list children", "error", err)
		return nil, domain.ErrInternalServerError
	}

	return children, nil
}

// verifyOwnership checks that the task exists and belongs to the user.
func (uc *TaskUsecase) verifyOwnership(ctx context.Context, taskID, userID uuid.UUID) error {
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

// GetTree returns the full task tree with recursively calculated progress.
func (uc *TaskUsecase) GetTree(ctx context.Context, userID, taskID uuid.UUID) (*domain.TaskWithProgress, error) {
	tree, err := uc.taskRepo.GetTreeByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, domain.ErrTaskNotFound) {
			return nil, domain.ErrTaskNotFound
		}
		uc.log.Error("failed to get task tree", "error", err)
		return nil, domain.ErrInternalServerError
	}

	if tree.UserID != userID {
		return nil, domain.ErrForbidden
	}

	return tree, nil
}

// ReorderTask changes the position of a task within its sibling list.
func (uc *TaskUsecase) ReorderTask(ctx context.Context, userID, taskID uuid.UUID, position int) error {
	existing, err := uc.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, domain.ErrTaskNotFound) {
			return domain.ErrTaskNotFound
		}
		uc.log.Error("failed to get task for reorder", "error", err)
		return domain.ErrInternalServerError
	}

	if existing.UserID != userID {
		return domain.ErrForbidden
	}

	if err := uc.taskRepo.UpdatePosition(ctx, taskID, position); err != nil {
		uc.log.Error("failed to reorder task", "error", err)
		return domain.ErrInternalServerError
	}

	return nil
}
