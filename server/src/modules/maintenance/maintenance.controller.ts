import { Request, Response, NextFunction } from 'express';
import { MaintenanceService } from './maintenance.service.js';
import { sendSuccess } from '../../utils/response.js';

export class MaintenanceController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { vehicleId, status } = req.query;
      const records = await MaintenanceService.getAllMaintenance({
        vehicleId: vehicleId as string,
        status: status as any,
      });
      sendSuccess(res, records);
    } catch (err) {
      next(err);
    }
  }

  static async getSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await MaintenanceService.getCostSummary();
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const record = await MaintenanceService.getMaintenanceById(id);
      sendSuccess(res, record);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await MaintenanceService.createMaintenance(req.body);
      sendSuccess(res, record, 'Maintenance logged successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await MaintenanceService.updateMaintenance(id, req.body);
      sendSuccess(res, updated, 'Maintenance record updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await MaintenanceService.deleteMaintenanceRecord(id);
      sendSuccess(res, null, 'Maintenance record deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}