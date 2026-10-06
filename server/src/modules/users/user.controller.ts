import { ValidationError } from '../../types/index.js';
import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service.js';
import { sendSuccess } from '../../utils/response.js';

export class UserController {
  static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await UserService.getAllUsers();
      sendSuccess(res, users);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.createUser(req.body, (req as any).user);
      sendSuccess(res, user, 'User created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await UserService.updateCompanies(String(req.params.id), req.body.companyIds, (req as any).user));
    } catch (err) { next(err); }
  }

  static async assignRole(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await UserService.assignRole(String(req.params.id),req.body,(req as any).user)); }
    catch(error) { next(error); }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if(id===(req as any).user?.userId) throw new ValidationError('You cannot disable your own account.');
      const { status } = req.body;
      const updated = await UserService.updateUserStatus(id, status, (req as any).user);
      sendSuccess(res, updated, 'User status updated');
    } catch (err) {
      next(err);
    }
  }
}