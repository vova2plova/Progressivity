package usecase

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
	"github.com/vova2plova/progressivity/internal/infrastructure/auth"
	"github.com/vova2plova/progressivity/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// TokenPair holds access and refresh tokens.
type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

// AuthUsecase handles authentication business logic.
type AuthUsecase struct {
	userRepo   repository.UserRepository
	jwtManager *auth.JWTManager
	log        *slog.Logger
}

// NewAuthUsecase creates a new AuthUsecase.
func NewAuthUsecase(
	userRepo repository.UserRepository,
	jwtManager *auth.JWTManager,
	log *slog.Logger,
) *AuthUsecase {
	return &AuthUsecase{
		userRepo:   userRepo,
		jwtManager: jwtManager,
		log:        log,
	}
}

// Register creates a new user with hashed password and returns a token pair.
func (uc *AuthUsecase) Register(ctx context.Context, email, username, password string) (*TokenPair, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		uc.log.Error("failed to hash password", "error", err)
		return nil, domain.ErrInternalServerError
	}

	user := &domain.User{
		ID:           uuid.New(),
		Email:        email,
		Username:     username,
		PasswordHash: string(hash),
	}

	created, err := uc.userRepo.Create(ctx, user)
	if err != nil {
		if errors.Is(err, domain.ErrUserAlreadyExists) {
			return nil, domain.ErrUserAlreadyExists
		}
		uc.log.Error("failed to create user", "error", err)
		return nil, domain.ErrInternalServerError
	}

	tokens, err := uc.generateTokenPair(created.ID)
	if err != nil {
		return nil, err
	}

	return tokens, nil
}

// Login authenticates a user by email and password, returning a token pair.
func (uc *AuthUsecase) Login(ctx context.Context, email, password string) (*TokenPair, error) {
	user, err := uc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return nil, domain.ErrInvalidCredentials
		}
		uc.log.Error("failed to get user by email", "error", err)
		return nil, domain.ErrInternalServerError
	}

	if errCompare := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); errCompare != nil {
		return nil, domain.ErrInvalidCredentials
	}

	tokens, err := uc.generateTokenPair(user.ID)
	if err != nil {
		return nil, err
	}

	return tokens, nil
}

// Refresh validates a refresh token and generates a new token pair.
func (uc *AuthUsecase) Refresh(_ context.Context, refreshToken string) (*TokenPair, error) {
	claims, err := uc.jwtManager.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, domain.ErrUnauthorized
	}

	tokens, err := uc.generateTokenPair(claims.UserID)
	if err != nil {
		return nil, err
	}

	return tokens, nil
}

// Logout is a placeholder for refresh token invalidation.
// In a stateless JWT setup, the client simply discards the tokens.
// For server-side invalidation, a token blacklist or versioning would be needed.
func (*AuthUsecase) Logout(_ context.Context, _ string) error {
	// In MVP, logout is handled client-side by discarding tokens.
	// Future: add refresh token to a blacklist or revocation store.
	return nil
}

func (uc *AuthUsecase) generateTokenPair(userID uuid.UUID) (*TokenPair, error) {
	accessToken, err := uc.jwtManager.GenerateAccessToken(userID)
	if err != nil {
		uc.log.Error("failed to generate access token", "error", err)
		return nil, domain.ErrInternalServerError
	}

	refreshToken, err := uc.jwtManager.GenerateRefreshToken(userID)
	if err != nil {
		uc.log.Error("failed to generate refresh token", "error", err)
		return nil, domain.ErrInternalServerError
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}
