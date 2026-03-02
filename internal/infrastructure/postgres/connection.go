package postgres

import (
	"database/sql"

	_ "github.com/lib/pq"
	"github.com/vova2plova/progressivity/pkg/config"
)

func InitDB(cfg *config.DatabaseConfig) (*sql.DB, error) {
	db, err := sql.Open("postgres", cfg.DSN())

	if err != nil {
		return nil, err
	}

	err = db.Ping()
	if err != nil {
		_ = db.Close()
		return nil, err
	}

	return db, nil
}
