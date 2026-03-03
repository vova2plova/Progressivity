package postgres

import (
	"context"
	"database/sql"

	_ "github.com/lib/pq"
	"github.com/vova2plova/progressivity/pkg/config"
)

func InitDB(ctx context.Context, cfg *config.DatabaseConfig) (*sql.DB, error) {
	db, err := sql.Open("postgres", cfg.DSN())
	if err != nil {
		return nil, err
	}

	if err = db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	return db, nil
}
