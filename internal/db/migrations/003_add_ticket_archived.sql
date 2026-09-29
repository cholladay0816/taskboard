ALTER TABLE tickets ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tickets_archived ON tickets(archived);
