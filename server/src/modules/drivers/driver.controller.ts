import { Request, Response, NextFunction } from 'express';
import { DriverService } from './driver.service.js';
import { sendSuccess } from '../../utils/response.js';

export class DriverController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dutyStatus, employmentStatus, search, supplierId, ownership } = req.query;
      const drivers = await DriverService.getAllDrivers({
        dutyStatus: dutyStatus as any,
        employmentStatus: employmentStatus as any,
        search: search as string,
        supplierId: supplierId as string,
        ownership: ownership as any,
      });
      sendSuccess(res, drivers);
    } catch (err) {
      next(err);
    }
  }

  static async getExpiringLicenses(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expiring = await DriverService.getExpiringLicenses();
      sendSuccess(res, expiring);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const driver = await DriverService.getDriverById(id);
      sendSuccess(res, driver);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await DriverService.createDriver(req.body);
      sendSuccess(res, driver, 'Driver registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await DriverService.updateDriver(id, req.body);
      sendSuccess(res, updated, 'Driver updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async assignVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { vehicleId } = req.body;
      const updated = await DriverService.assignVehicle(id, vehicleId);
      sendSuccess(res, updated, 'Driver vehicle assignment updated');
    } catch (err) {
      next(err);
    }
  }

  static async addDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const doc = await DriverService.addDocument(id, req.body);
      sendSuccess(res, doc, 'Document added successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await DriverService.deleteDriver(id);
      sendSuccess(res, null, 'Driver deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}