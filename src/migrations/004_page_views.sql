CREATE TABLE IF NOT EXISTS page_views (
  page    TEXT NOT NULL,
  date    TEXT NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (page, date)
);
