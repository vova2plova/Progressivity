package usecase

import (
	"github.com/vova2plova/progressivity/internal/testutil"
)

// Re-export mock constructors so existing tests don't need to change their function calls.
var (
	NewMockUserRepository          = testutil.NewMockUserRepository
	NewMockTaskRepository          = testutil.NewMockTaskRepository
	NewMockProgressEntryRepository = testutil.NewMockProgressEntryRepository
)

// Type aliases for convenience.
type MockUserRepository = testutil.MockUserRepository
type MockTaskRepository = testutil.MockTaskRepository
type MockProgressEntryRepository = testutil.MockProgressEntryRepository
