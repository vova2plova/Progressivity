package usecase

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
	"github.com/vova2plova/progressivity/internal/infrastructure/auth"
	"github.com/vova2plova/progressivity/pkg/config"
	"golang.org/x/crypto/bcrypt"
)

func newTestJWTManager() *auth.JWTManager {
	return auth.NewJWTManager(&config.JWTConfig{
		AccessSecret:  "test-access-secret-key-1234567890",
		RefreshSecret: "test-refresh-secret-key-1234567890",
		AccessTTL:     15 * time.Minute,
		RefreshTTL:    24 * time.Hour,
	})
}

func newTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
}

func TestAuthUsecase_Register_Success(t *testing.T) {
	userRepo := NewMockUserRepository()
	jwtMgr := newTestJWTManager()
	log := newTestLogger()
	uc := NewAuthUsecase(userRepo, jwtMgr, log)

	tokens, err := uc.Register(context.Background(), "test@example.com", "testuser", "password123")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if tokens.AccessToken == "" {
		t.Error("expected non-empty access token")
	}
	if tokens.RefreshToken == "" {
		t.Error("expected non-empty refresh token")
	}

	// Validate that the access token works.
	claims, err := jwtMgr.ValidateAccessToken(tokens.AccessToken)
	if err != nil {
		t.Fatalf("access token validation failed: %v", err)
	}
	if claims.UserID == uuid.Nil {
		t.Error("expected non-nil user ID in claims")
	}
}

func TestAuthUsecase_Register_DuplicateEmail(t *testing.T) {
	userRepo := NewMockUserRepository()
	jwtMgr := newTestJWTManager()
	log := newTestLogger()
	uc := NewAuthUsecase(userRepo, jwtMgr, log)

	_, err := uc.Register(context.Background(), "test@example.com", "testuser1", "password123")
	if err != nil {
		t.Fatalf("first registration failed: %v", err)
	}

	_, err = uc.Register(context.Background(), "test@example.com", "testuser2", "password456")
	if !errors.Is(err, domain.ErrUserAlreadyExists) {
		t.Errorf("expected ErrUserAlreadyExists, got %v", err)
	}
}

func TestAuthUsecase_Login_Success(t *testing.T) {
	userRepo := NewMockUserRepository()
	jwtMgr := newTestJWTManager()
	log := newTestLogger()
	uc := NewAuthUsecase(userRepo, jwtMgr, log)

	// Register a user first.
	_, err := uc.Register(context.Background(), "test@example.com", "testuser", "password123")
	if err != nil {
		t.Fatalf("registration failed: %v", err)
	}

	// Login with correct credentials.
	tokens, err := uc.Login(context.Background(), "test@example.com", "password123")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if tokens.AccessToken == "" || tokens.RefreshToken == "" {
		t.Error("expected non-empty tokens")
	}
}

func TestAuthUsecase_Login_WrongPassword(t *testing.T) {
	userRepo := NewMockUserRepository()
	jwtMgr := newTestJWTManager()
	log := newTestLogger()
	uc := NewAuthUsecase(userRepo, jwtMgr, log)

	_, err := uc.Register(context.Background(), "test@example.com", "testuser", "password123")
	if err != nil {
		t.Fatalf("registration failed: %v", err)
	}

	_, err = uc.Login(context.Background(), "test@example.com", "wrongpassword")
	if !errors.Is(err, domain.ErrInvalidCredentials) {
		t.Errorf("expected ErrInvalidCredentials, got %v", err)
	}
}

func TestAuthUsecase_Login_NonExistentUser(t *testing.T) {
	userRepo := NewMockUserRepository()
	jwtMgr := newTestJWTManager()
	log := newTestLogger()
	uc := NewAuthUsecase(userRepo, jwtMgr, log)

	_, err := uc.Login(context.Background(), "nonexistent@example.com", "password123")
	if !errors.Is(err, domain.ErrInvalidCredentials) {
		t.Errorf("expected ErrInvalidCredentials, got %v", err)
	}
}

func TestAuthUsecase_Refresh_Success(t *testing.T) {
	userRepo := NewMockUserRepository()
	jwtMgr := newTestJWTManager()
	log := newTestLogger()
	uc := NewAuthUsecase(userRepo, jwtMgr, log)

	tokens, err := uc.Register(context.Background(), "test@example.com", "testuser", "password123")
	if err != nil {
		t.Fatalf("registration failed: %v", err)
	}

	newTokens, err := uc.Refresh(context.Background(), tokens.RefreshToken)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if newTokens.AccessToken == "" || newTokens.RefreshToken == "" {
		t.Error("expected non-empty tokens")
	}

	// New tokens should be different from old ones.
	if newTokens.AccessToken == tokens.AccessToken {
		t.Error("expected different access token after refresh")
	}
}

func TestAuthUsecase_Refresh_InvalidToken(t *testing.T) {
	userRepo := NewMockUserRepository()
	jwtMgr := newTestJWTManager()
	log := newTestLogger()
	uc := NewAuthUsecase(userRepo, jwtMgr, log)

	_, err := uc.Refresh(context.Background(), "invalid-token")
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got %v", err)
	}
}

func TestAuthUsecase_Logout(t *testing.T) {
	userRepo := NewMockUserRepository()
	jwtMgr := newTestJWTManager()
	log := newTestLogger()
	uc := NewAuthUsecase(userRepo, jwtMgr, log)

	// Logout should succeed (no-op in stateless JWT).
	err := uc.Logout(context.Background(), "any-token")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestAuthUsecase_Register_Login_PasswordHash(t *testing.T) {
	userRepo := NewMockUserRepository()
	jwtMgr := newTestJWTManager()
	log := newTestLogger()
	uc := NewAuthUsecase(userRepo, jwtMgr, log)

	_, err := uc.Register(context.Background(), "test@example.com", "testuser", "password123")
	if err != nil {
		t.Fatalf("registration failed: %v", err)
	}

	// Verify the password was hashed.
	user, err := userRepo.GetByEmail(context.Background(), "test@example.com")
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}

	if user.PasswordHash == "password123" {
		t.Error("password should be hashed, not stored in plaintext")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("password123")); err != nil {
		t.Error("password hash should match original password")
	}
}
