CREATE TABLE IF NOT EXISTS monitoring_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  labels JSONB DEFAULT '{}',
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name ON monitoring_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_recorded_at ON monitoring_metrics(recorded_at);
