import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';
import { sendSuccess } from '../../utils/response.js';

export class DashboardController {
  static async getKPIs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const kpis = await DashboardService.getOverviewKPIs();
      sendSuccess(res, kpis);
    } catch (err) {
      next(err);
    }
  }

  static async getTrends(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trends = await DashboardService.getWeeklyTripTrends();
      sendSuccess(res, trends);
    } catch (err) {
      next(err);
    }
  }

  static async getVehicleUtilization(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await DashboardService.getFleetUtilizationReport();
      sendSuccess(res, report);
    } catch (err) {
      next(err);
    }
  }

  static async getDriverPerformance(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await DashboardService.getDriverPerformanceReport();
      sendSuccess(res, report);
    } catch (err) {
      next(err);
    }
  }

  static async getNotifications(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getNotifications();
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
}