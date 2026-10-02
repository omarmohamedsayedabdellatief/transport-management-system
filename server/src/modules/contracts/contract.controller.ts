import { Request, Response, NextFunction } from 'express';
import { ContractService } from './contract.service.js';
import { sendSuccess } from '../../utils/response.js';

export class ContractController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, clientId } = req.query;
      const contracts = await ContractService.getAllContracts({
        status: status as any,
        clientId: clientId as string,
      });
      sendSuccess(res, contracts);
    } catch (err) {
      next(err);
    }
  }

  static async getExpiring(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expiring = await ContractService.getExpiringSoon();
      sendSuccess(res, expiring);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const contract = await ContractService.getContractById(id);
      sendSuccess(res, contract);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contract = await ContractService.createContract(req.body);
      sendSuccess(res, contract, 'Contract created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await ContractService.updateContract(id, req.body);
      sendSuccess(res, updated, 'Contract updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await ContractService.deleteContract(id);
      sendSuccess(res, null, 'Contract deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}