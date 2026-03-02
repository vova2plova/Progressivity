BEGIN;

CREATE TABLE progress_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    value NUMERIC(12,2) NOT NULL,
    note TEXT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_progress_entries_task
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_progress_entries_task_id ON progress_entries(task_id);
CREATE INDEX idx_progress_entries_recorded_at ON progress_entries(recorded_at);

COMMIT;
