CREATE TABLE IF NOT EXISTS build_step (
  id TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  status TEXT NOT NULL,
  needs_input INTEGER NOT NULL,
  summary TEXT NOT NULL,
  progress INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_owner (
  source_id TEXT PRIMARY KEY,
  department TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  due_date TEXT NOT NULL,
  authority TEXT NOT NULL,
  not_for_ai INTEGER NOT NULL,
  notes TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_submission (
  source_id TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  note TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_target (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
