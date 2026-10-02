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
      const user = await UserService.createUser(req.body);
      sendSuccess(res, user, 'User created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if(id===(req as any).user?.userId) throw new ValidationError('You cannot disable your own account.');
      const { status } = req.body;
      const updated = await UserService.updateUserStatus(id, status);
      sendSuccess(res, updated, 'User status updated');
    } catch (err) {
      next(err);
    }
  }
}