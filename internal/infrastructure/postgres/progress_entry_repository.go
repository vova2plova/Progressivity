package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
	"github.com/vova2plova/progressivity/internal/repository"
)

type progressEntryRepository struct {
	db *sql.DB
}

func NewProgressEntryRepository(db *sql.DB) repository.ProgressEntryRepository {
	return &progressEntryRepository{db: db}
}

func scanProgressEntry(row scanner) (*domain.ProgressEntry, error) {
	entry := &domain.ProgressEntry{}
	err := row.Scan(
		&entry.ID,
		&entry.TaskID,
		&entry.Value,
		&entry.Note,
		&entry.RecordedAt,
		&entry.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return entry, nil
}

func (r *progressEntryRepository) Create(ctx context.Context, entry *domain.ProgressEntry) (*domain.ProgressEntry, error) {
	query := `INSERT INTO progress_entries (task_id, value, note, recorded_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, task_id, value, note, recorded_at, created_at`

	created, err := scanProgressEntry(r.db.QueryRowContext(ctx, query,
		entry.TaskID,
		entry.Value,
		entry.Note,
		entry.RecordedAt,
	))
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (r *progressEntryRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.ProgressEntry, error) {
	query := `SELECT id, task_id, value, note, recorded_at, created_at
		FROM progress_entries WHERE id = $1`

	entry, err := scanProgressEntry(r.db.QueryRowContext(ctx, query, id))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrProgressNotFound
		}
		return nil, err
	}
	return entry, nil
}

func (r *progressEntryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := r.db.ExecContext(ctx,
		`DELETE FROM progress_entries WHERE id = $1`, id,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domain.ErrProgressNotFound
	}
	return nil
}

func (r *progressEntryRepository) ListByTaskID(ctx context.Context, taskID uuid.UUID) ([]*domain.ProgressEntry, error) {
	query := `SELECT id, task_id, value, note, recorded_at, created_at
		FROM progress_entries
		WHERE task_id = $1
		ORDER BY recorded_at DESC`

	rows, err := r.db.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*domain.ProgressEntry
	for rows.Next() {
		entry, err := scanProgressEntry(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}

func (r *progressEntryRepository) SumByTaskID(ctx context.Context, taskID uuid.UUID) (float64, error) {
	var sum float64
	err := r.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(value), 0) FROM progress_entries WHERE task_id = $1`,
		taskID,
	).Scan(&sum)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return sum, nil
}
