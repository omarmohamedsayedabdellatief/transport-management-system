ALTER TABLE "trips" ADD COLUMN "importMetadata" JSONB;
CREATE TABLE "TripImportBatch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PREVIEW',
  "payload" JSONB NOT NULL,
  "summary" JSONB NOT NULL,
  "beforeSnapshot" JSONB NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "result" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "committedAt" TIMESTAMP(3)
);
CREATE INDEX "TripImportBatch_actorId_createdAt_idx" ON "TripImportBatch"("actorId", "createdAt");
