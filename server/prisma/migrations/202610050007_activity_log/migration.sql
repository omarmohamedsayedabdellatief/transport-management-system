CREATE TABLE "ActivityLog" (
 "id" TEXT PRIMARY KEY, "actorId" TEXT, "actorName" TEXT NOT NULL, "actorEmail" TEXT,
 "action" TEXT NOT NULL, "entity" TEXT NOT NULL, "entityId" TEXT, "method" TEXT NOT NULL, "path" TEXT NOT NULL,
 "outcome" TEXT NOT NULL DEFAULT 'PENDING', "statusCode" INTEGER, "detail" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3)
);
CREATE INDEX "ActivityLog_createdAt_id_idx" ON "ActivityLog"("createdAt", "id");
CREATE INDEX "ActivityLog_actorId_createdAt_idx" ON "ActivityLog"("actorId", "createdAt");
CREATE INDEX "ActivityLog_entity_createdAt_idx" ON "ActivityLog"("entity", "createdAt");
CREATE INDEX "ActivityLog_action_createdAt_idx" ON "ActivityLog"("action", "createdAt");
INSERT INTO "ActivityLog" ("id","actorId","actorName","actorEmail","action","entity","entityId","method","path","outcome","statusCode","detail","createdAt","completedAt")
SELECT a."id",a."actorId",COALESCE(u."full_name",a."actorId"),u."email",a."action",a."entity",a."entityId",'LEGACY','', 'SUCCESS',200,
json_build_object('legacy',a."detail")::text,a."createdAt",a."createdAt"
FROM "AuditEvent" a LEFT JOIN "users" u ON u."id"=a."actorId";
