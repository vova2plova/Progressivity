BEGIN;

-- Drop trigger and function
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop table
DROP TABLE IF EXISTS users;

-- Note: pgcrypto extension is not dropped as it may be used by other tables

COMMIT;
