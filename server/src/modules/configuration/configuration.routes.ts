import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../../prisma.js";
import {
  AuthenticatedRequest,
  ForbiddenError,
  ValidationError,
} from "../../types/index.js";
const router = Router();
const wrap = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res)).catch(next);
const name = z.string().trim().min(2).max(100);
const category = z.object({ name, active: z.boolean().default(true) });
const billing = category.extend({
  direction: z.enum(["OUTBOUND", "RETURN"]),
});
router.get(
  "/",
  wrap(async (_req: any, res: any) =>
    res.json({
      success: true,
      data: {
        vehicleTypes: await prisma.vehicleCategory.findMany({
          orderBy: { createdAt: "asc" },
        }),
        billingTypes: await prisma.tripBillingType.findMany({
          where: { direction: { in: ["OUTBOUND", "RETURN"] } },
          orderBy: { createdAt: "asc" },
        }),
      },
    }),
  ),
);
router.use((req: AuthenticatedRequest, _res, next) =>
  req.permissionAuthorized ? next() : next(new ForbiddenError()),
);
router.post(
  "/vehicle-types",
  wrap(async (req: any, res: any) =>
    res
      .status(201)
      .json({
        success: true,
        data: await prisma.vehicleCategory.create({
          data: { ...category.parse(req.body), code: "CUSTOM_" + randomUUID() },
        }),
      }),
  ),
);
router.put(
  "/vehicle-types/:code",
  wrap(async (req: any, res: any) =>
    res.json({
      success: true,
      data: await prisma.vehicleCategory.update({
        where: { code: req.params.code },
        data: category.parse(req.body),
      }),
    }),
  ),
);
router.post(
  "/billing-types",
  wrap(async (req: any, res: any) =>
    res
      .status(201)
      .json({
        success: true,
        data: await prisma.tripBillingType.create({
          data: billing.parse(req.body),
        }),
      }),
  ),
);
router.put(
  "/billing-types/:id",
  wrap(async (req: any, res: any) => {
    const data = billing.parse(req.body);
    const existing = await prisma.tripBillingType.findUniqueOrThrow({
      where: { id: req.params.id },
    });
    if (
      data.direction !== existing.direction &&
      ((await prisma.routeRate.count({
        where: { billingTypeId: existing.id },
      })) ||
        (await prisma.trip.count({ where: { billingTypeId: existing.id } })))
    )
      throw new ValidationError(
        "This type is in use. Create a new type to change its direction.",
      );
    res.json({
      success: true,
      data: await prisma.tripBillingType.update({
        where: { id: existing.id },
        data,
      }),
    });
  }),
);
export default router;
