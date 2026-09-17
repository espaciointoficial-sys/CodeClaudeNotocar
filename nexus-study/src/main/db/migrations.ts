// Migraciones ordenadas. Se aplican secuencialmente según PRAGMA user_version.
// Añadir una migración nueva = añadir un elemento nuevo al final del array.
export const MIGRATIONS: string[] = [
  // v1: esquema inicial
  `
  CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT,
    professor TEXT,
    term TEXT,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'archived')) DEFAULT 'active',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_accessed_at TEXT
  );

  CREATE TABLE folders (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_folders_subject ON folders(subject_id);

  CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    original_name TEXT NOT NULL,
    internal_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    page_count INTEGER,
    tags TEXT NOT NULL DEFAULT '[]',
    description TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    imported_at TEXT NOT NULL,
    last_opened_at TEXT,
    last_studied_at TEXT,
    open_count INTEGER NOT NULL DEFAULT 0,
    last_page INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX idx_documents_subject ON documents(subject_id);
  CREATE INDEX idx_documents_folder ON documents(folder_id);

  CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_notes_subject ON notes(subject_id);
  CREATE INDEX idx_notes_document ON notes(document_id);

  CREATE TABLE bookmarks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page INTEGER NOT NULL,
    label TEXT,
    note TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_bookmarks_document ON bookmarks(document_id);

  CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    due_date TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE INDEX idx_tasks_subject ON tasks(subject_id);

  CREATE TABLE events (
    id TEXT PRIMARY KEY,
    subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('exam', 'assignment', 'class', 'study_session', 'other')),
    start_at TEXT NOT NULL,
    end_at TEXT,
    description TEXT
  );
  CREATE INDEX idx_events_subject ON events(subject_id);
  CREATE INDEX idx_events_start ON events(start_at);

  CREATE TABLE study_sessions (
    id TEXT PRIMARY KEY,
    subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    duration_seconds INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pomodoro', 'free_reading', 'review', 'other'))
  );
  CREATE INDEX idx_sessions_subject ON study_sessions(subject_id);
  CREATE INDEX idx_sessions_started ON study_sessions(started_at);

  CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    theme TEXT NOT NULL DEFAULT 'system',
    pomodoro_focus_min INTEGER NOT NULL DEFAULT 25,
    pomodoro_short_break_min INTEGER NOT NULL DEFAULT 5,
    pomodoro_long_break_min INTEGER NOT NULL DEFAULT 15,
    pomodoro_cycles INTEGER NOT NULL DEFAULT 4,
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    widgets_json TEXT NOT NULL DEFAULT '{}'
  );
  INSERT INTO settings (id) VALUES (1);
  `,
  // v2: texto extraído de PDF para poder buscar dentro del contenido (búsqueda por LIKE, sin FTS
  // porque el SQLite integrado en Node no trae compilado ningún módulo fts3/4/5).
  `
  ALTER TABLE documents ADD COLUMN content_text TEXT;
  `,
  // v3: ciudad configurada para el widget de tiempo del Dashboard.
  `
  ALTER TABLE settings ADD COLUMN weather_city TEXT;
  `,
];
