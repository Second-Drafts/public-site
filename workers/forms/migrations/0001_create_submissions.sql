CREATE TABLE submissions (
	id TEXT PRIMARY KEY,
	form TEXT NOT NULL,
	email TEXT,
	early_access INTEGER NOT NULL DEFAULT 0,
	answers TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
