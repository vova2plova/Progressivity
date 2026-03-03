package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/vova2plova/progressivity/internal/domain"
	"github.com/vova2plova/progressivity/internal/repository"
)

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) repository.UserRepository {
	return &userRepository{db: db}
}

// scanner is an interface satisfied by *sql.Row and *sql.Rows.
type scanner interface {
	Scan(dest ...any) error
}

// scanUser scans a single user row into a domain.User struct.
func scanUser(row scanner) (*domain.User, error) {
	user := &domain.User{}
	err := row.Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.PasswordHash,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) (*domain.User, error) {
	query := `INSERT INTO users (email, username, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, email, username, password_hash, created_at, updated_at`

	row := r.db.QueryRowContext(ctx, query,
		user.Email,
		user.Username,
		user.PasswordHash,
	)

	created, err := scanUser(row)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, domain.ErrUserAlreadyExists
		}
		return nil, err
	}

	return created, nil
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	query := `SELECT id, email, username, password_hash, created_at, updated_at
		FROM users WHERE id = $1`

	user, err := scanUser(r.db.QueryRowContext(ctx, query, id))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `SELECT id, email, username, password_hash, created_at, updated_at
		FROM users WHERE email = $1`

	user, err := scanUser(r.db.QueryRowContext(ctx, query, email))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

func (r *userRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	query := `SELECT id, email, username, password_hash, created_at, updated_at
		FROM users WHERE username = $1`

	user, err := scanUser(r.db.QueryRowContext(ctx, query, username))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}
