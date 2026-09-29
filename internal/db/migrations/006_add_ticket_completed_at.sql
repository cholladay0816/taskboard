ALTER TABLE tickets ADD COLUMN completed_at DATETIME;

-- Historical completion times were not recorded; last update is the closest available estimate.
UPDATE tickets SET completed_at = updated_at WHERE status = 'done';

CREATE INDEX IF NOT EXISTS idx_tickets_completed_at ON tickets(status, archived, completed_at);
