import { Request, Response, NextFunction } from 'express';
import { ClientService } from './client.service.js';
import { sendSuccess } from '../../utils/response.js';

export class ClientController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, status } = req.query;
      const clients = await ClientService.getAllClients({
        search: search as string,
        status: status as any,
      });
      sendSuccess(res, clients);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const client = await ClientService.getClientById(id);
      sendSuccess(res, client);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientService.createClient(req.body);
      sendSuccess(res, client, 'Client registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await ClientService.updateClient(id, req.body);
      sendSuccess(res, updated, 'Client updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await ClientService.deleteClient(id);
      sendSuccess(res, { deleted: true }, 'Client deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}