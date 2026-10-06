import roleRoutes from './modules/roles/roles.routes.js';
import { isInternal } from './modules/roles/permissions.js';
import { recordActivity } from './middlewares/activity.middleware.js';
import { companyScope } from './company-scope.js';
import { enforceAccess } from './middlewares/access.middleware.js';
import configurationRoutes from './modules/configuration/configuration.routes.js';
import operationsRoutes from "./modules/operations/operations.routes.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import { prisma } from "./prisma.js";
import path from "node:path";
import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { config } from "./config/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";

import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import clientRoutes from "./modules/clients/client.routes.js";
import contractRoutes from "./modules/contracts/contract.routes.js";
import vehicleRoutes from "./modules/vehicles/vehicle.routes.js";
import driverRoutes from "./modules/drivers/driver.routes.js";
import routeRoutes from "./modules/routes/route.routes.js";
import tripRoutes from "./modules/trips/trip.routes.js";
import maintenanceRoutes from "./modules/maintenance/maintenance.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import accountingRoutes from "./modules/accounting/accounting.routes.js";
import partnerRoutes from "./modules/partners/partner.routes.js";

export const createApp = (): Express => {
  const app = express();

  // Security and utilities
  app.use(helmet());
  app.use(
    cors({
      origin: [
        config.clientOrigin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ],
      credentials: true,
    }),
  );
  app.use(morgan("dev"));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "transport-management-system-api",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  app.use('/api', recordActivity);
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth/')) return next();
    authenticate(req, res, (error?: any) => error ? next(error) : enforceAccess(req, res, next));
  });
  app.use('/api', async (req, _res, next) => {
    if (req.path.startsWith('/auth/')) return next();
    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.userId } });
      if (!user?.companyScopeEnabled) return next();
      const routes = await prisma.route.findMany({ where: { clientId: { in: user.companyIds } }, select: { id: true } });
      companyScope.run({ companyIds: user.companyIds, routeIds: routes.map(route => route.id) }, next);
    } catch (error) { next(error); }
  });
  app.use('/api/roles', roleRoutes);
  app.use('/api/configuration', configurationRoutes);
  app.use("/api/operations", operationsRoutes);
  // External portal accounts may only use scoped operations endpoints and authentication.
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth/")) return next();
    authenticate(req, res, (error?: any) => {
      if (error) return next(error);
      const role = (req as any).user?.role;
      if (
        !isInternal((req as any).user)
      )
        return res
          .status(403)
          .json({
            success: false,
            error: { message: "Use your assigned portal." },
          });
      if (req.path.startsWith("/accounting/import-workspace-files"))
        return res
          .status(409)
          .json({
            success: false,
            error: {
              message:
                "The destructive legacy import is disabled. Use reviewed migration batches.",
            },
          });
      next();
    });
  });
  app.use("/api", async (req, res, next) => {
    if (req.method !== "DELETE") return next();
    const match = req.path.match(
      /^\/(clients|contracts|routes|vehicles|drivers)\/([^/]+)$/,
    );
    if (!match) return next();
    const [, resource, id] = match;
    try {
      const field = (
        {
          clients: "clientId",
          contracts: "contractId",
          routes: "routeId",
          vehicles: "vehicleId",
          drivers: "driverId",
        } as Record<string, string>
      )[resource];
      const trips = await prisma.trip.count({ where: { [field]: id } });
      const plans =
        resource === "clients"
          ? await prisma.servicePlan.count({
              where: { route: { clientId: id } },
            })
          : await prisma.servicePlan.count({ where: { [field]: id } });
      const extra =
        resource === "vehicles"
          ? await prisma.maintenanceRecord.count({ where: { vehicleId: id } })
          : resource === "clients"
            ? await prisma.contract.count({ where: { clientId: id } })
            : resource === "routes"
              ? await prisma.enrollment.count({ where: { routeId: id } })
              : 0;
      if (trips || plans || extra)
        return res
          .status(409)
          .json({
            success: false,
            error: {
              message:
                "This record has service history or linked records. Deactivate it instead of deleting it.",
            },
          });
      next();
    } catch (error) {
      next(error);
    }
  });
  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/contracts", contractRoutes);
  app.use("/api/vehicles", vehicleRoutes);
  app.use("/api/drivers", driverRoutes);
  app.use("/api/routes", routeRoutes);
  app.use("/api/trips", tripRoutes);
  app.use("/api/maintenance", maintenanceRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/accounting", accountingRoutes);
  app.use("/api/partners", partnerRoutes);

  if (config.nodeEnv === "production") {
    app.use(express.static(path.resolve(process.cwd(), "../client/dist")));
    app.get("*", (req, res, next) =>
      req.path.startsWith("/api/")
        ? next()
        : res.sendFile(
            path.resolve(process.cwd(), "../client/dist/index.html"),
          ),
    );
  }
  // Global Error Handler
  app.use(errorHandler);

  return app;
};
