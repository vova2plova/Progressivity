package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
)

func newTaskUsecaseWithMocks() (uc *TaskUsecase, taskRepo *MockTaskRepository) {
	taskRepo = NewMockTaskRepository()
	progressRepo := NewMockProgressEntryRepository()
	log := newTestLogger()
	return NewTaskUsecase(taskRepo, progressRepo, log), taskRepo
}

// --- CreateTask ---

func TestTaskUsecase_CreateTask_Success(t *testing.T) {
	uc, _ := newTaskUsecaseWithMocks()
	userID := uuid.New()

	task := &domain.Task{
		Title: "Read 10 books",
	}

	created, err := uc.CreateTask(context.Background(), userID, task)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if created.Title != "Read 10 books" {
		t.Errorf("expected title 'Read 10 books', got %q", created.Title)
	}
	if created.UserID != userID {
		t.Errorf("expected userID %v, got %v", userID, created.UserID)
	}
	if created.ParentID != nil {
		t.Error("expected nil parent_id for top-level task")
	}
	if created.Status != domain.TaskStatusPending {
		t.Errorf("expected status 'pending', got %q", created.Status)
	}
}

func TestTaskUsecase_CreateTask_PreservesCustomStatus(t *testing.T) {
	uc, _ := newTaskUsecaseWithMocks()
	userID := uuid.New()

	task := &domain.Task{
		Title:  "In progress task",
		Status: domain.TaskStatusInProgress,
	}

	created, err := uc.CreateTask(context.Background(), userID, task)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if created.Status != domain.TaskStatusInProgress {
		t.Errorf("expected status 'in_progress', got %q", created.Status)
	}
}

// --- CreateChildTask ---

func TestTaskUsecase_CreateChildTask_Success(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	userID := uuid.New()
	parentID := uuid.New()

	parent := &domain.Task{
		ID:     parentID,
		UserID: userID,
		Title:  "Parent task",
		Status: domain.TaskStatusPending,
	}
	taskRepo.AddTask(parent)

	child := &domain.Task{
		Title: "Child task",
	}

	created, err := uc.CreateChildTask(context.Background(), userID, parentID, child)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if created.ParentID == nil || *created.ParentID != parentID {
		t.Error("expected parent_id to be set to parent's ID")
	}
	if created.UserID != userID {
		t.Errorf("expected userID %v, got %v", userID, created.UserID)
	}
}

func TestTaskUsecase_CreateChildTask_ParentNotFound(t *testing.T) {
	uc, _ := newTaskUsecaseWithMocks()
	userID := uuid.New()

	child := &domain.Task{
		Title: "Child task",
	}

	_, err := uc.CreateChildTask(context.Background(), userID, uuid.New(), child)
	if !errors.Is(err, domain.ErrTaskNotFound) {
		t.Errorf("expected ErrTaskNotFound, got %v", err)
	}
}

func TestTaskUsecase_CreateChildTask_Forbidden(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	ownerID := uuid.New()
	otherUserID := uuid.New()
	parentID := uuid.New()

	parent := &domain.Task{
		ID:     parentID,
		UserID: ownerID,
		Title:  "Owner's task",
		Status: domain.TaskStatusPending,
	}
	taskRepo.AddTask(parent)

	child := &domain.Task{
		Title: "Child task",
	}

	_, err := uc.CreateChildTask(context.Background(), otherUserID, parentID, child)
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

// --- GetTask ---

func TestTaskUsecase_GetTask_Success(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	userID := uuid.New()
	taskID := uuid.New()

	task := &domain.Task{
		ID:     taskID,
		UserID: userID,
		Title:  "My task",
		Status: domain.TaskStatusCompleted,
	}
	taskRepo.AddTask(task)

	result, err := uc.GetTask(context.Background(), userID, taskID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if result.Title != "My task" {
		t.Errorf("expected title 'My task', got %q", result.Title)
	}
}

func TestTaskUsecase_GetTask_NotFound(t *testing.T) {
	uc, _ := newTaskUsecaseWithMocks()

	_, err := uc.GetTask(context.Background(), uuid.New(), uuid.New())
	if !errors.Is(err, domain.ErrTaskNotFound) {
		t.Errorf("expected ErrTaskNotFound, got %v", err)
	}
}

func TestTaskUsecase_GetTask_Forbidden(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	ownerID := uuid.New()
	otherUserID := uuid.New()
	taskID := uuid.New()

	task := &domain.Task{
		ID:     taskID,
		UserID: ownerID,
		Title:  "Owner's task",
		Status: domain.TaskStatusPending,
	}
	taskRepo.AddTask(task)

	_, err := uc.GetTask(context.Background(), otherUserID, taskID)
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

// --- UpdateTask ---

func TestTaskUsecase_UpdateTask_Success(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	userID := uuid.New()
	taskID := uuid.New()

	task := &domain.Task{
		ID:     taskID,
		UserID: userID,
		Title:  "Original title",
		Status: domain.TaskStatusPending,
	}
	taskRepo.AddTask(task)

	update := &domain.Task{
		Title:  "Updated title",
		Status: domain.TaskStatusInProgress,
	}

	updated, err := uc.UpdateTask(context.Background(), userID, taskID, update)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if updated.Title != "Updated title" {
		t.Errorf("expected title 'Updated title', got %q", updated.Title)
	}
	if updated.Status != domain.TaskStatusInProgress {
		t.Errorf("expected status 'in_progress', got %q", updated.Status)
	}
}

func TestTaskUsecase_UpdateTask_NotFound(t *testing.T) {
	uc, _ := newTaskUsecaseWithMocks()

	update := &domain.Task{Title: "Updated", Status: domain.TaskStatusPending}
	_, err := uc.UpdateTask(context.Background(), uuid.New(), uuid.New(), update)
	if !errors.Is(err, domain.ErrTaskNotFound) {
		t.Errorf("expected ErrTaskNotFound, got %v", err)
	}
}

func TestTaskUsecase_UpdateTask_Forbidden(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	ownerID := uuid.New()
	otherUserID := uuid.New()
	taskID := uuid.New()

	task := &domain.Task{
		ID:     taskID,
		UserID: ownerID,
		Title:  "Owner's task",
		Status: domain.TaskStatusPending,
	}
	taskRepo.AddTask(task)

	update := &domain.Task{Title: "Hacked", Status: domain.TaskStatusPending}
	_, err := uc.UpdateTask(context.Background(), otherUserID, taskID, update)
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

// --- DeleteTask ---

func TestTaskUsecase_DeleteTask_Success(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	userID := uuid.New()
	taskID := uuid.New()

	task := &domain.Task{
		ID:     taskID,
		UserID: userID,
		Title:  "Task to delete",
		Status: domain.TaskStatusPending,
	}
	taskRepo.AddTask(task)

	err := uc.DeleteTask(context.Background(), userID, taskID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify task was removed.
	_, err = taskRepo.GetByID(context.Background(), taskID)
	if !errors.Is(err, domain.ErrTaskNotFound) {
		t.Error("expected task to be deleted")
	}
}

func TestTaskUsecase_DeleteTask_NotFound(t *testing.T) {
	uc, _ := newTaskUsecaseWithMocks()

	err := uc.DeleteTask(context.Background(), uuid.New(), uuid.New())
	if !errors.Is(err, domain.ErrTaskNotFound) {
		t.Errorf("expected ErrTaskNotFound, got %v", err)
	}
}

func TestTaskUsecase_DeleteTask_Forbidden(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	ownerID := uuid.New()
	otherUserID := uuid.New()
	taskID := uuid.New()

	task := &domain.Task{
		ID:     taskID,
		UserID: ownerID,
		Title:  "Owner's task",
		Status: domain.TaskStatusPending,
	}
	taskRepo.AddTask(task)

	err := uc.DeleteTask(context.Background(), otherUserID, taskID)
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

// --- ListRootTasks ---

func TestTaskUsecase_ListRootTasks_Success(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	userID := uuid.New()

	taskID1 := uuid.New()
	taskID2 := uuid.New()

	taskRepo.AddTask(&domain.Task{
		ID: taskID1, UserID: userID, Title: "Goal 1", Status: domain.TaskStatusPending,
	})
	taskRepo.AddTask(&domain.Task{
		ID: taskID2, UserID: userID, Title: "Goal 2", Status: domain.TaskStatusCompleted,
	})

	tasks, err := uc.ListRootTasks(context.Background(), userID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(tasks) != 2 {
		t.Errorf("expected 2 tasks, got %d", len(tasks))
	}
}

func TestTaskUsecase_ListRootTasks_Empty(t *testing.T) {
	uc, _ := newTaskUsecaseWithMocks()

	tasks, err := uc.ListRootTasks(context.Background(), uuid.New())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(tasks) != 0 {
		t.Errorf("expected 0 tasks, got %d", len(tasks))
	}
}

// --- ListChildren ---

func TestTaskUsecase_ListChildren_Success(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	userID := uuid.New()
	parentID := uuid.New()
	childID := uuid.New()

	taskRepo.AddTask(&domain.Task{
		ID: parentID, UserID: userID, Title: "Parent", Status: domain.TaskStatusPending,
	})
	taskRepo.AddTask(&domain.Task{
		ID: childID, UserID: userID, Title: "Child", ParentID: &parentID, Status: domain.TaskStatusPending,
	})

	children, err := uc.ListChildren(context.Background(), userID, parentID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(children) != 1 {
		t.Errorf("expected 1 child, got %d", len(children))
	}
}

func TestTaskUsecase_ListChildren_Forbidden(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	ownerID := uuid.New()
	otherUserID := uuid.New()
	parentID := uuid.New()

	taskRepo.AddTask(&domain.Task{
		ID: parentID, UserID: ownerID, Title: "Owner's task", Status: domain.TaskStatusPending,
	})

	_, err := uc.ListChildren(context.Background(), otherUserID, parentID)
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

// --- GetTree ---

func TestTaskUsecase_GetTree_Success(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	userID := uuid.New()
	taskID := uuid.New()

	target := 100.0
	taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "Goal", TargetValue: &target, Status: domain.TaskStatusPending,
	})

	tree, err := uc.GetTree(context.Background(), userID, taskID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if tree.Title != "Goal" {
		t.Errorf("expected title 'Goal', got %q", tree.Title)
	}
}

func TestTaskUsecase_GetTree_Forbidden(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	ownerID := uuid.New()
	otherUserID := uuid.New()
	taskID := uuid.New()

	taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: ownerID, Title: "Owner's task", Status: domain.TaskStatusPending,
	})

	_, err := uc.GetTree(context.Background(), otherUserID, taskID)
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

// --- ReorderTask ---

func TestTaskUsecase_ReorderTask_Success(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	userID := uuid.New()
	taskID := uuid.New()

	taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: userID, Title: "Task", Position: 0, Status: domain.TaskStatusPending,
	})

	err := uc.ReorderTask(context.Background(), userID, taskID, 5)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestTaskUsecase_ReorderTask_NotFound(t *testing.T) {
	uc, _ := newTaskUsecaseWithMocks()

	err := uc.ReorderTask(context.Background(), uuid.New(), uuid.New(), 1)
	if !errors.Is(err, domain.ErrTaskNotFound) {
		t.Errorf("expected ErrTaskNotFound, got %v", err)
	}
}

func TestTaskUsecase_ReorderTask_Forbidden(t *testing.T) {
	uc, taskRepo := newTaskUsecaseWithMocks()
	ownerID := uuid.New()
	otherUserID := uuid.New()
	taskID := uuid.New()

	taskRepo.AddTask(&domain.Task{
		ID: taskID, UserID: ownerID, Title: "Task", Position: 0, Status: domain.TaskStatusPending,
	})

	err := uc.ReorderTask(context.Background(), otherUserID, taskID, 1)
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}
