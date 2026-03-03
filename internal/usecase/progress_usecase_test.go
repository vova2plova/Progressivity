package usecase

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
)

func newProgressUsecaseWithMocks() (uc *ProgressUsecase, taskRepo *MockTaskRepository, progressRepo *MockProgressEntryRepository) {
	taskRepo = NewMockTaskRepository()
	progressRepo = NewMockProgressEntryRepository()
	log := newTestLogger()
	return NewProgressUsecase(taskRepo, progressRepo, log), taskRepo, progressRepo
}

// --- AddProgress ---

func TestProgressUsecase_AddProgress_Success(t *testing.T) {
	uc, taskRepo, _ := newProgressUsecaseWithMocks()
	userID := uuid.New()
	taskID := uuid.New()
	target := 100.0

	// Create a leaf task (no children).
	taskRepo.AddTask(&domain.Task{
		ID:          taskID,
		UserID:      userID,
		Title:       "Read a book",
		TargetValue: &target,
		Status:      domain.TaskStatusInProgress,
	})

	entry := &domain.ProgressEntry{
		Value:      25.0,
		RecordedAt: time.Now(),
	}

	created, err := uc.AddProgress(context.Background(), userID, taskID, entry)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if created.Value != 25.0 {
		t.Errorf("expected value 25.0, got %f", created.Value)
	}
	if created.TaskID != taskID {
		t.Errorf("expected taskID %v, got %v", taskID, created.TaskID)
	}
}

func TestProgressUsecase_AddProgress_TaskNotFound(t *testing.T) {
	uc, _, _ := newProgressUsecaseWithMocks()

	entry := &domain.ProgressEntry{
		Value:      10.0,
		RecordedAt: time.Now(),
	}

	_, err := uc.AddProgress(context.Background(), uuid.New(), uuid.New(), entry)
	if !errors.Is(err, domain.ErrTaskNotFound) {
		t.Errorf("expected ErrTaskNotFound, got %v", err)
	}
}

func TestProgressUsecase_AddProgress_Forbidden(t *testing.T) {
	uc, taskRepo, _ := newProgressUsecaseWithMocks()
	ownerID := uuid.New()
	otherUserID := uuid.New()
	taskID := uuid.New()

	taskRepo.AddTask(&domain.Task{
		ID:     taskID,
		UserID: ownerID,
		Title:  "Owner's task",
		Status: domain.TaskStatusPending,
	})

	entry := &domain.ProgressEntry{
		Value:      10.0,
		RecordedAt: time.Now(),
	}

	_, err := uc.AddProgress(context.Background(), otherUserID, taskID, entry)
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestProgressUsecase_AddProgress_ContainerTask(t *testing.T) {
	uc, taskRepo, _ := newProgressUsecaseWithMocks()
	userID := uuid.New()
	parentID := uuid.New()
	childID := uuid.New()

	// Container task (has children).
	taskRepo.AddTask(&domain.Task{
		ID:     parentID,
		UserID: userID,
		Title:  "Parent",
		Status: domain.TaskStatusPending,
	})
	taskRepo.AddTask(&domain.Task{
		ID:       childID,
		UserID:   userID,
		ParentID: &parentID,
		Title:    "Child",
		Status:   domain.TaskStatusPending,
	})

	entry := &domain.ProgressEntry{
		Value:      10.0,
		RecordedAt: time.Now(),
	}

	_, err := uc.AddProgress(context.Background(), userID, parentID, entry)
	if !errors.Is(err, domain.ErrCannotAddProgress) {
		t.Errorf("expected ErrCannotAddProgress, got %v", err)
	}
}

// --- DeleteProgress ---

func TestProgressUsecase_DeleteProgress_Success(t *testing.T) {
	uc, taskRepo, progressRepo := newProgressUsecaseWithMocks()
	userID := uuid.New()
	taskID := uuid.New()
	progressID := uuid.New()

	taskRepo.AddTask(&domain.Task{
		ID:     taskID,
		UserID: userID,
		Title:  "Task",
		Status: domain.TaskStatusPending,
	})

	progressRepo.AddEntry(&domain.ProgressEntry{
		ID:         progressID,
		TaskID:     taskID,
		Value:      10.0,
		RecordedAt: time.Now(),
	})

	err := uc.DeleteProgress(context.Background(), userID, progressID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestProgressUsecase_DeleteProgress_NotFound(t *testing.T) {
	uc, _, _ := newProgressUsecaseWithMocks()

	err := uc.DeleteProgress(context.Background(), uuid.New(), uuid.New())
	if !errors.Is(err, domain.ErrProgressNotFound) {
		t.Errorf("expected ErrProgressNotFound, got %v", err)
	}
}

func TestProgressUsecase_DeleteProgress_Forbidden(t *testing.T) {
	uc, taskRepo, progressRepo := newProgressUsecaseWithMocks()
	ownerID := uuid.New()
	otherUserID := uuid.New()
	taskID := uuid.New()
	progressID := uuid.New()

	taskRepo.AddTask(&domain.Task{
		ID:     taskID,
		UserID: ownerID,
		Title:  "Owner's task",
		Status: domain.TaskStatusPending,
	})

	progressRepo.AddEntry(&domain.ProgressEntry{
		ID:         progressID,
		TaskID:     taskID,
		Value:      10.0,
		RecordedAt: time.Now(),
	})

	err := uc.DeleteProgress(context.Background(), otherUserID, progressID)
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

// --- ListProgress ---

func TestProgressUsecase_ListProgress_Success(t *testing.T) {
	uc, taskRepo, progressRepo := newProgressUsecaseWithMocks()
	userID := uuid.New()
	taskID := uuid.New()

	taskRepo.AddTask(&domain.Task{
		ID:     taskID,
		UserID: userID,
		Title:  "Task",
		Status: domain.TaskStatusPending,
	})

	progressRepo.AddEntry(&domain.ProgressEntry{
		ID:         uuid.New(),
		TaskID:     taskID,
		Value:      10.0,
		RecordedAt: time.Now(),
	})
	progressRepo.AddEntry(&domain.ProgressEntry{
		ID:         uuid.New(),
		TaskID:     taskID,
		Value:      20.0,
		RecordedAt: time.Now(),
	})

	entries, err := uc.ListProgress(context.Background(), userID, taskID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(entries) != 2 {
		t.Errorf("expected 2 entries, got %d", len(entries))
	}
}

func TestProgressUsecase_ListProgress_Forbidden(t *testing.T) {
	uc, taskRepo, _ := newProgressUsecaseWithMocks()
	ownerID := uuid.New()
	otherUserID := uuid.New()
	taskID := uuid.New()

	taskRepo.AddTask(&domain.Task{
		ID:     taskID,
		UserID: ownerID,
		Title:  "Owner's task",
		Status: domain.TaskStatusPending,
	})

	_, err := uc.ListProgress(context.Background(), otherUserID, taskID)
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestProgressUsecase_ListProgress_TaskNotFound(t *testing.T) {
	uc, _, _ := newProgressUsecaseWithMocks()

	_, err := uc.ListProgress(context.Background(), uuid.New(), uuid.New())
	if !errors.Is(err, domain.ErrTaskNotFound) {
		t.Errorf("expected ErrTaskNotFound, got %v", err)
	}
}
