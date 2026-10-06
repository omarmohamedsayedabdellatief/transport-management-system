import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { AuthenticatedRequest } from "../../types/index.js";
import {
  assertImport,
  inspectExcel,
  previewExcel,
  commitExcel,
  exportExcel,
} from "./trip-excel.service.js";
const router = Router();
const fileSchema = z.object({
  fileContent: z.string().min(4).max(1400000),
  sheet: z.string().max(100).optional(),
  headerRow: z.number().int().min(1).max(50).optional(),
  mapping: z.record(z.string()).optional(),
});
router.get("/lookups", async (req: AuthenticatedRequest, res, next) => {
  try {
    assertImport(req.user);
    const [companies, drivers, vehicles, routes] = await Promise.all([
      prisma.client.findMany({
        select: { id: true, companyName: true, status: true },
        orderBy: { companyName: "asc" },
      }),
      prisma.driver.findMany({
        select: { id: true, fullName: true, assignedVehicleId: true },
        orderBy: { fullName: "asc" },
      }),
      prisma.vehicle.findMany({
        select: { id: true, plateNumber: true, vehicleType: true },
        orderBy: { plateNumber: "asc" },
      }),
      prisma.route.findMany({
        select: { id: true, routeName: true, clientId: true },
        orderBy: { routeName: "asc" },
      }),
    ]);
    res.json({ success: true, data: { companies, drivers, vehicles, routes } });
  } catch (e) {
    next(e);
  }
});
router.post("/inspect", async (req: AuthenticatedRequest, res, next) => {
  try {
    assertImport(req.user);
    res.json({
      success: true,
      data: await inspectExcel(fileSchema.parse(req.body)),
    });
  } catch (e) {
    next(e);
  }
});
router.post("/preview", async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json({ success: true, data: await previewExcel(req.body, req.user) });
  } catch (e) {
    next(e);
  }
});
router.post("/commit", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { batchId, confirm } = z
      .object({ batchId: z.string().uuid(), confirm: z.literal(true) })
      .parse(req.body);
    res.json({ success: true, data: await commitExcel(batchId, req.user) });
  } catch (e) {
    next(e);
  }
});
router.get("/export", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = z
      .object({
        startDate: z.string(),
        endDate: z.string(),
        companyIds: z.string().min(1),
      })
      .parse(req.query);
    const buffer = await exportExcel(
      { ...input, companyIds: input.companyIds.split(",").slice(0, 100) },
      req.user,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="trips_${input.startDate}_${input.endDate}.xlsx"`,
    );
    res.send(buffer);
  } catch (e) {
    next(e);
  }
});
export default router;
