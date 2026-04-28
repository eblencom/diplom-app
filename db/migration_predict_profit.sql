ALTER TABLE predicts
  ADD COLUMN IF NOT EXISTS profit NUMERIC(14, 6) NULL;

UPDATE predicts
SET profit =
  CASE result
    WHEN 'win' THEN
      CASE WHEN result_percent IS NULL THEN NULL ELSE ABS(result_percent) END
    WHEN 'lose' THEN
      CASE WHEN result_percent IS NULL THEN NULL ELSE -ABS(result_percent) END
    WHEN 'neutral' THEN 0
    ELSE NULL
  END
WHERE status = 'closed' OR profit IS NOT NULL;
