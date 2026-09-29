ALTER TABLE board_columns ADD COLUMN color TEXT NOT NULL DEFAULT '#94a3b8';

UPDATE board_columns SET color = CASE id
    WHEN 'todo' THEN '#94a3b8'
    WHEN 'in_progress' THEN '#22d3ee'
    WHEN 'blocked' THEN '#fbbf24'
    WHEN 'done' THEN '#34d399'
    ELSE color
END;
