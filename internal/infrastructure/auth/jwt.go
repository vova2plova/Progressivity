package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/pkg/config"
)

// TokenClaims represents the custom JWT claims.
type TokenClaims struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

// JWTManager handles generation and validation of JWT tokens.
type JWTManager struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

// NewJWTManager creates a new JWTManager from the config.
func NewJWTManager(cfg *config.JWTConfig) *JWTManager {
	return &JWTManager{
		accessSecret:  []byte(cfg.AccessSecret),
		refreshSecret: []byte(cfg.RefreshSecret),
		accessTTL:     cfg.AccessTTL,
		refreshTTL:    cfg.RefreshTTL,
	}
}

// GenerateAccessToken creates a signed access JWT for the given user ID.
func (m *JWTManager) GenerateAccessToken(userID uuid.UUID) (string, error) {
	return m.generateToken(userID, m.accessSecret, m.accessTTL)
}

// GenerateRefreshToken creates a signed refresh JWT for the given user ID.
func (m *JWTManager) GenerateRefreshToken(userID uuid.UUID) (string, error) {
	return m.generateToken(userID, m.refreshSecret, m.refreshTTL)
}

// ValidateAccessToken parses and validates an access token, returning its claims.
func (m *JWTManager) ValidateAccessToken(tokenStr string) (*TokenClaims, error) {
	return m.validateToken(tokenStr, m.accessSecret)
}

// ValidateRefreshToken parses and validates a refresh token, returning its claims.
func (m *JWTManager) ValidateRefreshToken(tokenStr string) (*TokenClaims, error) {
	return m.validateToken(tokenStr, m.refreshSecret)
}

func (*JWTManager) generateToken(userID uuid.UUID, secret []byte, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := TokenClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        uuid.New().String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func (*JWTManager) validateToken(tokenStr string, secret []byte) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &TokenClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}
