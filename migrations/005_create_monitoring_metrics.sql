CREATE TABLE IF NOT EXISTS monitoring_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  labels TEXT DEFAULT '{}',
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name ON monitoring_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_recorded_at ON monitoring_metrics(recorded_at);

