ALTER TABLE predicts
  ADD COLUMN IF NOT EXISTS profit NUMERIC(14, 6) NULL;

UPDATE predicts
SET profit =
  CASE result
    WHEN 'win' THEN ABS(result_percent)
    WHEN 'lose' THEN -ABS(result_percent)
    WHEN 'neutral' THEN result_percent * 0
    ELSE NULL
  END
WHERE result_percent IS NOT NULL;
