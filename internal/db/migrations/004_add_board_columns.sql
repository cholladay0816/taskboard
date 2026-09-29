CREATE TABLE IF NOT EXISTS board_columns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position INTEGER NOT NULL
);

INSERT OR IGNORE INTO board_columns (id, name, position) VALUES
    ('todo', 'Todo', 0),
    ('in_progress', 'In Progress', 1),
    ('blocked', 'Blocked', 2),
    ('done', 'Done', 3);
