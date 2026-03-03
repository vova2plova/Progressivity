// Package testutil provides shared mock implementations for testing.
package testutil

import (
	"context"
	"sync"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
)

// --- MockUserRepository ---

// MockUserRepository is an in-memory implementation of repository.UserRepository for testing.
type MockUserRepository struct {
	mu    sync.Mutex
	users map[uuid.UUID]*domain.User

	CreateFunc        func(ctx context.Context, user *domain.User) (*domain.User, error)
	GetByIDFunc       func(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetByEmailFunc    func(ctx context.Context, email string) (*domain.User, error)
	GetByUsernameFunc func(ctx context.Context, username string) (*domain.User, error)
}

func NewMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		users: make(map[uuid.UUID]*domain.User),
	}
}

func (m *MockUserRepository) Create(ctx context.Context, user *domain.User) (*domain.User, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, user)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, u := range m.users {
		if u.Email == user.Email || u.Username == user.Username {
			return nil, domain.ErrUserAlreadyExists
		}
	}

	m.users[user.ID] = user
	return user, nil
}

func (m *MockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	u, ok := m.users[id]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return u, nil
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	if m.GetByEmailFunc != nil {
		return m.GetByEmailFunc(ctx, email)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, domain.ErrUserNotFound
}

func (m *MockUserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	if m.GetByUsernameFunc != nil {
		return m.GetByUsernameFunc(ctx, username)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, u := range m.users {
		if u.Username == username {
			return u, nil
		}
	}
	return nil, domain.ErrUserNotFound
}

func (m *MockUserRepository) AddUser(user *domain.User) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.users[user.ID] = user
}

// --- MockTaskRepository ---

// MockTaskRepository is an in-memory implementation of repository.TaskRepository for testing.
type MockTaskRepository struct {
	mu       sync.Mutex
	tasks    map[uuid.UUID]*domain.Task
	TreeData map[uuid.UUID]*domain.TaskWithProgress

	CreateFunc           func(ctx context.Context, task *domain.Task) (*domain.Task, error)
	GetByIDFunc          func(ctx context.Context, id uuid.UUID) (*domain.Task, error)
	UpdateFunc           func(ctx context.Context, task *domain.Task) error
	DeleteFunc           func(ctx context.Context, id uuid.UUID) error
	ListByParentIDFunc   func(ctx context.Context, parentID uuid.UUID) ([]*domain.Task, error)
	ListRootByUserIDFunc func(ctx context.Context, userID uuid.UUID) ([]*domain.Task, error)
	GetTreeByIDFunc      func(ctx context.Context, id uuid.UUID) (*domain.TaskWithProgress, error)
	UpdatePositionFunc   func(ctx context.Context, id uuid.UUID, position int) error
}

func NewMockTaskRepository() *MockTaskRepository {
	return &MockTaskRepository{
		tasks:    make(map[uuid.UUID]*domain.Task),
		TreeData: make(map[uuid.UUID]*domain.TaskWithProgress),
	}
}

func (m *MockTaskRepository) Create(ctx context.Context, task *domain.Task) (*domain.Task, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, task)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	if task.ID == uuid.Nil {
		task.ID = uuid.New()
	}
	m.tasks[task.ID] = task
	return task, nil
}

func (m *MockTaskRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Task, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	t, ok := m.tasks[id]
	if !ok {
		return nil, domain.ErrTaskNotFound
	}
	return t, nil
}

func (m *MockTaskRepository) Update(ctx context.Context, task *domain.Task) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, task)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.tasks[task.ID]; !ok {
		return domain.ErrTaskNotFound
	}
	m.tasks[task.ID] = task
	return nil
}

func (m *MockTaskRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.tasks[id]; !ok {
		return domain.ErrTaskNotFound
	}
	delete(m.tasks, id)
	return nil
}

func (m *MockTaskRepository) ListByParentID(ctx context.Context, parentID uuid.UUID) ([]*domain.Task, error) {
	if m.ListByParentIDFunc != nil {
		return m.ListByParentIDFunc(ctx, parentID)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	var result []*domain.Task
	for _, t := range m.tasks {
		if t.ParentID != nil && *t.ParentID == parentID {
			result = append(result, t)
		}
	}
	return result, nil
}

func (m *MockTaskRepository) ListRootByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.Task, error) {
	if m.ListRootByUserIDFunc != nil {
		return m.ListRootByUserIDFunc(ctx, userID)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	var result []*domain.Task
	for _, t := range m.tasks {
		if t.UserID == userID && t.ParentID == nil {
			result = append(result, t)
		}
	}
	return result, nil
}

func (m *MockTaskRepository) GetTreeByID(ctx context.Context, id uuid.UUID) (*domain.TaskWithProgress, error) {
	if m.GetTreeByIDFunc != nil {
		return m.GetTreeByIDFunc(ctx, id)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	if tree, ok := m.TreeData[id]; ok {
		return tree, nil
	}

	t, ok := m.tasks[id]
	if !ok {
		return nil, domain.ErrTaskNotFound
	}

	twp := &domain.TaskWithProgress{Task: *t}
	domain.CalculateProgress(twp)
	return twp, nil
}

func (m *MockTaskRepository) UpdatePosition(ctx context.Context, id uuid.UUID, position int) error {
	if m.UpdatePositionFunc != nil {
		return m.UpdatePositionFunc(ctx, id, position)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	t, ok := m.tasks[id]
	if !ok {
		return domain.ErrTaskNotFound
	}
	t.Position = position
	return nil
}

func (m *MockTaskRepository) AddTask(task *domain.Task) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.tasks[task.ID] = task
}

func (m *MockTaskRepository) SetTreeData(id uuid.UUID, tree *domain.TaskWithProgress) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.TreeData[id] = tree
}

// --- MockProgressEntryRepository ---

// MockProgressEntryRepository is an in-memory implementation of repository.ProgressEntryRepository for testing.
type MockProgressEntryRepository struct {
	mu      sync.Mutex
	entries map[uuid.UUID]*domain.ProgressEntry

	CreateFunc       func(ctx context.Context, entry *domain.ProgressEntry) (*domain.ProgressEntry, error)
	GetByIDFunc      func(ctx context.Context, id uuid.UUID) (*domain.ProgressEntry, error)
	DeleteFunc       func(ctx context.Context, id uuid.UUID) error
	ListByTaskIDFunc func(ctx context.Context, taskID uuid.UUID) ([]*domain.ProgressEntry, error)
	SumByTaskIDFunc  func(ctx context.Context, taskID uuid.UUID) (float64, error)
}

func NewMockProgressEntryRepository() *MockProgressEntryRepository {
	return &MockProgressEntryRepository{
		entries: make(map[uuid.UUID]*domain.ProgressEntry),
	}
}

func (m *MockProgressEntryRepository) Create(ctx context.Context, entry *domain.ProgressEntry) (*domain.ProgressEntry, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, entry)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	if entry.ID == uuid.Nil {
		entry.ID = uuid.New()
	}
	m.entries[entry.ID] = entry
	return entry, nil
}

func (m *MockProgressEntryRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.ProgressEntry, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	e, ok := m.entries[id]
	if !ok {
		return nil, domain.ErrProgressNotFound
	}
	return e, nil
}

func (m *MockProgressEntryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.entries[id]; !ok {
		return domain.ErrProgressNotFound
	}
	delete(m.entries, id)
	return nil
}

func (m *MockProgressEntryRepository) ListByTaskID(ctx context.Context, taskID uuid.UUID) ([]*domain.ProgressEntry, error) {
	if m.ListByTaskIDFunc != nil {
		return m.ListByTaskIDFunc(ctx, taskID)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	var result []*domain.ProgressEntry
	for _, e := range m.entries {
		if e.TaskID == taskID {
			result = append(result, e)
		}
	}
	return result, nil
}

func (m *MockProgressEntryRepository) SumByTaskID(ctx context.Context, taskID uuid.UUID) (float64, error) {
	if m.SumByTaskIDFunc != nil {
		return m.SumByTaskIDFunc(ctx, taskID)
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	var sum float64
	for _, e := range m.entries {
		if e.TaskID == taskID {
			sum += e.Value
		}
	}
	return sum, nil
}

func (m *MockProgressEntryRepository) AddEntry(entry *domain.ProgressEntry) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.entries[entry.ID] = entry
}
