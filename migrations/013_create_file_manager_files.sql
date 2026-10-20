CREATE TABLE IF NOT EXISTS file_manager_files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  file_path VARCHAR(500) NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  mime_type VARCHAR(100),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_manager_files_user_id ON file_manager_files(user_id);
