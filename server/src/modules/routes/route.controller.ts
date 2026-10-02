import { Request, Response, NextFunction } from 'express';
import { RouteService } from './route.service.js';
import { sendSuccess } from '../../utils/response.js';

export class RouteController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId, isActive, summary } = req.query;
      const routes = await RouteService.getAllRoutes({
        clientId: clientId as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        summary: summary === 'true' || summary === '1',
      });
      sendSuccess(res, routes);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const route = await RouteService.getRouteById(id);
      sendSuccess(res, route);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const route = await RouteService.createRoute(req.body);
      sendSuccess(res, route, 'Route created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await RouteService.updateRoute(id, req.body);
      sendSuccess(res, updated, 'Route updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await RouteService.deleteRoute(id);
      sendSuccess(res, { deleted: true }, 'Route deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}