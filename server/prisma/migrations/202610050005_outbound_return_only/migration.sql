-- Keep historical trips and prices intact; stop offering combined trips.
UPDATE "TripBillingType" SET "active" = false WHERE "direction" = 'BOTH';
