import { Request, Response, NextFunction } from 'express';
import { VehicleService } from './vehicle.service.js';
import { sendSuccess } from '../../utils/response.js';

export class VehicleController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, vehicleType, search, supplierId, ownership } = req.query;
      const vehicles = await VehicleService.getAllVehicles({
        status: status as any,
        vehicleType: vehicleType as any,
        search: search as string,
        supplierId: supplierId as string,
        ownership: ownership as any,
      });
      sendSuccess(res, vehicles);
    } catch (err) {
      next(err);
    }
  }

  static async getUnassigned(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicles = await VehicleService.getUnassignedVehicles();
      sendSuccess(res, vehicles);
    } catch (err) {
      next(err);
    }
  }

  static async getSuppliers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prisma } = await import('../../prisma.js');
      const suppliers = await prisma.partner.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
      sendSuccess(res, suppliers);
    } catch (err) {
      next(err);
    }
  }

  static async getExpiringDocuments(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expiring = await VehicleService.getExpiringDocuments();
      sendSuccess(res, expiring);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const vehicle = await VehicleService.getVehicleById(id);
      sendSuccess(res, vehicle);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await VehicleService.createVehicle(req.body);
      sendSuccess(res, vehicle, 'Vehicle registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await VehicleService.updateVehicle(id, req.body);
      sendSuccess(res, updated, 'Vehicle updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await VehicleService.deleteVehicle(id);
      sendSuccess(res, null, 'Vehicle deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}