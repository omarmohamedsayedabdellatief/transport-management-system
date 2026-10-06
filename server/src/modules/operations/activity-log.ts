import { z } from "zod";
import { prisma } from "../../prisma.js";
import { safeAuditValue } from "../../middlewares/activity.middleware.js";

export async function listActivity(
  query: unknown,
  currentActivityId?: string,
  includeTreasury = true,
) {
  const input = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(30),
      search: z.string().trim().max(200).optional(),
      actorId: z.string().optional(),
      action: z.string().max(80).optional(),
      outcome: z.enum(["SUCCESS", "FAILED", "PENDING", "ABORTED"]).optional(),
      from: z.string().datetime({ offset: true }).optional(),
      to: z.string().datetime({ offset: true }).optional(),
    })
    .parse(query);
  const where: any = currentActivityId
    ? { id: { not: currentActivityId } }
    : {};
  // Exclude the entire event before search/count so historic payloads cannot expose opening balances or statements.
  if (!includeTreasury)
    where.NOT = {
      OR: [
        { path: { startsWith: "/accounting/treasury" } },
        { path: { startsWith: "/operations/treasury" } },
        { entity: "treasury" },
      ],
    };
  if (input.actorId) where.actorId = input.actorId;
  if (input.action === "CHANGES") where.action = { not: "VIEW" };
  else if (input.action) where.action = input.action;
  if (input.outcome) where.outcome = input.outcome;
  if (input.from || input.to)
    where.createdAt = {
      ...(input.from ? { gte: new Date(input.from) } : {}),
      ...(input.to ? { lte: new Date(input.to) } : {}),
    };
  if (input.search)
    where.OR = [
      "actorName",
      "actorEmail",
      "entity",
      "entityId",
      "path",
      ...(includeTreasury ? ["detail"] : []),
    ].map((key) => ({
      [key]: { contains: input.search, mode: "insensitive" },
    }));
  const [rows, total, people] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where: { actorId: { not: null } },
      distinct: ["actorId"],
      select: { actorId: true, actorName: true, actorEmail: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return {
    rows: rows.map((row) => {
      if (!includeTreasury && row.path.startsWith("/accounting/"))
        return {
          ...row,
          detail: {
            restricted:
              "تفاصيل الحركات المالية في سجل النشاط متاحة للمالك فقط.",
          },
        };
      let detail: any;
      try {
        detail = JSON.parse(row.detail);
      } catch {
        detail = { legacy: row.detail };
      }
      if (typeof detail.legacy === "string") {
        try {
          detail.legacy = JSON.parse(detail.legacy);
        } catch {}
      }
      return { ...row, detail: safeAuditValue(detail) };
    }),
    total,
    page: input.page,
    pageSize: input.pageSize,
    people,
  };
}
