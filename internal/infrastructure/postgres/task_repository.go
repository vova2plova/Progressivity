package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/vova2plova/progressivity/internal/domain"
	"github.com/vova2plova/progressivity/internal/repository"
)

type taskRepository struct {
	db *sql.DB
}

func NewTaskRepository(db *sql.DB) repository.TaskRepository {
	return &taskRepository{db: db}
}

func scanTask(row scanner) (*domain.Task, error) {
	task := &domain.Task{}
	err := row.Scan(
		&task.ID,
		&task.ParentID,
		&task.UserID,
		&task.Title,
		&task.Description,
		&task.Unit,
		&task.TargetValue,
		&task.TargetCount,
		&task.Deadline,
		&task.Position,
		&task.Status,
		&task.CreatedAt,
		&task.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return task, nil
}

func scanTasks(rows *sql.Rows) ([]*domain.Task, error) {
	defer rows.Close()
	var tasks []*domain.Task
	for rows.Next() {
		task, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}
	return tasks, rows.Err()
}

func (r *taskRepository) Create(ctx context.Context, task *domain.Task) (*domain.Task, error) {
	query := `INSERT INTO tasks (parent_id, user_id, title, description, unit,
			target_value, target_count, deadline, position, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, parent_id, user_id, title, description, unit,
			target_value, target_count, deadline, position, status,
			created_at, updated_at`

	row := r.db.QueryRowContext(ctx, query,
		task.ParentID,
		task.UserID,
		task.Title,
		task.Description,
		task.Unit,
		task.TargetValue,
		task.TargetCount,
		task.Deadline,
		task.Position,
		task.Status,
	)

	created, err := scanTask(row)
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (r *taskRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Task, error) {
	query := `SELECT id, parent_id, user_id, title, description, unit,
			target_value, target_count, deadline, position, status,
			created_at, updated_at
		FROM tasks WHERE id = $1`

	task, err := scanTask(r.db.QueryRowContext(ctx, query, id))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrTaskNotFound
		}
		return nil, err
	}
	return task, nil
}

func (r *taskRepository) Update(ctx context.Context, task *domain.Task) error {
	query := `UPDATE tasks
		SET title = $1, description = $2, unit = $3, target_value = $4,
			target_count = $5, deadline = $6, status = $7
		WHERE id = $8`

	result, err := r.db.ExecContext(ctx, query,
		task.Title,
		task.Description,
		task.Unit,
		task.TargetValue,
		task.TargetCount,
		task.Deadline,
		task.Status,
		task.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domain.ErrTaskNotFound
	}
	return nil
}

func (r *taskRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM tasks WHERE id = $1`, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domain.ErrTaskNotFound
	}
	return nil
}

func (r *taskRepository) ListByParentID(ctx context.Context, parentID uuid.UUID) ([]*domain.Task, error) {
	query := `SELECT id, parent_id, user_id, title, description, unit,
			target_value, target_count, deadline, position, status,
			created_at, updated_at
		FROM tasks
		WHERE parent_id = $1
		ORDER BY position, created_at`

	rows, err := r.db.QueryContext(ctx, query, parentID)
	if err != nil {
		return nil, err
	}
	return scanTasks(rows)
}

func (r *taskRepository) ListRootByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.Task, error) {
	query := `SELECT id, parent_id, user_id, title, description, unit,
			target_value, target_count, deadline, position, status,
			created_at, updated_at
		FROM tasks
		WHERE user_id = $1 AND parent_id IS NULL
		ORDER BY position, created_at`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	return scanTasks(rows)
}

func (r *taskRepository) UpdatePosition(ctx context.Context, id uuid.UUID, position int) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE tasks SET position = $1 WHERE id = $2`,
		position, id,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domain.ErrTaskNotFound
	}
	return nil
}

func (r *taskRepository) GetTreeByID(ctx context.Context, id uuid.UUID) (*domain.TaskWithProgress, error) {
	query := `WITH RECURSIVE task_tree AS (
			SELECT id, parent_id, user_id, title, description, unit,
				target_value, target_count, deadline, position, status,
				created_at, updated_at
			FROM tasks
			WHERE id = $1
			UNION ALL
			SELECT t.id, t.parent_id, t.user_id, t.title, t.description, t.unit,
				t.target_value, t.target_count, t.deadline, t.position, t.status,
				t.created_at, t.updated_at
			FROM tasks t
			JOIN task_tree tt ON t.parent_id = tt.id
		)
		SELECT tt.id, tt.parent_id, tt.user_id, tt.title, tt.description, tt.unit,
			tt.target_value, tt.target_count, tt.deadline, tt.position, tt.status,
			tt.created_at, tt.updated_at,
			COALESCE(SUM(pe.value), 0) AS current_value
		FROM task_tree tt
		LEFT JOIN progress_entries pe ON tt.id = pe.task_id
		GROUP BY tt.id, tt.parent_id, tt.user_id, tt.title, tt.description, tt.unit,
			tt.target_value, tt.target_count, tt.deadline, tt.position, tt.status,
			tt.created_at, tt.updated_at
		ORDER BY tt.position, tt.created_at`

	rows, err := r.db.QueryContext(ctx, query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type treeRow struct {
		task         domain.Task
		currentValue float64
	}

	var flatRows []treeRow
	for rows.Next() {
		var r treeRow
		err := rows.Scan(
			&r.task.ID,
			&r.task.ParentID,
			&r.task.UserID,
			&r.task.Title,
			&r.task.Description,
			&r.task.Unit,
			&r.task.TargetValue,
			&r.task.TargetCount,
			&r.task.Deadline,
			&r.task.Position,
			&r.task.Status,
			&r.task.CreatedAt,
			&r.task.UpdatedAt,
			&r.currentValue,
		)
		if err != nil {
			return nil, err
		}
		flatRows = append(flatRows, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(flatRows) == 0 {
		return nil, domain.ErrTaskNotFound
	}

	// Build map: id -> *TaskWithProgress
	nodeMap := make(map[uuid.UUID]*domain.TaskWithProgress, len(flatRows))
	for i := range flatRows {
		nodeMap[flatRows[i].task.ID] = &domain.TaskWithProgress{
			Task:         flatRows[i].task,
			CurrentValue: flatRows[i].currentValue,
		}
	}

	// Link children to parents; iterate flatRows to preserve ORDER BY position
	var root *domain.TaskWithProgress
	for i := range flatRows {
		node := nodeMap[flatRows[i].task.ID]
		if node.ID == id {
			root = node
		}
		if node.ParentID != nil {
			if parent, ok := nodeMap[*node.ParentID]; ok {
				parent.Children = append(parent.Children, node)
			}
		}
	}

	if root == nil {
		return nil, domain.ErrTaskNotFound
	}

	calculateProgress(root)
	return root, nil
}

const maxProgressPercent = 100.0

// calculateProgress recursively computes progress for the entire task tree.
//
// Rules:
//   - Leaf + target_value:  progress = currentValue / targetValue * 100 (capped at 100)
//   - Leaf binary (no target): progress = 100% if completed, 0% otherwise
//   - Container: progress = avg(children.progress)
func calculateProgress(node *domain.TaskWithProgress) {
	if len(node.Children) == 0 {
		// Leaf node
		if node.TargetValue != nil && *node.TargetValue > 0 {
			node.Progress = node.CurrentValue / *node.TargetValue * maxProgressPercent
			if node.Progress > maxProgressPercent {
				node.Progress = maxProgressPercent
			}
		} else if node.Status == domain.TaskStatusCompleted {
			node.Progress = maxProgressPercent
		}
		return
	}

	// Container node
	var sum float64
	var completed int
	for _, child := range node.Children {
		calculateProgress(child)
		sum += child.Progress
		if child.Progress >= maxProgressPercent {
			completed++
		}
	}
	node.TotalChildren = len(node.Children)
	node.CompletedChildren = completed
	if node.TotalChildren > 0 {
		node.Progress = sum / float64(node.TotalChildren)
	}
}
