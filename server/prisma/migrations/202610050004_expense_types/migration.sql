ALTER TABLE "expenses" ADD COLUMN "expense_type" TEXT NOT NULL DEFAULT 'OTHER';
UPDATE "expenses" SET "expense_type" = CASE
  WHEN category ~* '(سولار|وقود|بنزين|diesel|fuel|petrol|gasoline)' THEN 'FUEL'
  WHEN category ~* '(صيانة|صيانه|تصليح|maintenance|repair)' THEN 'MAINTENANCE'
  ELSE 'OTHER' END;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expense_type_check" CHECK ("expense_type" IN ('FUEL','MAINTENANCE','OTHER'));
