import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../prisma.js';
import { sendSuccess } from '../../utils/response.js';

export class PartnerController {
  static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const partners = await prisma.partner.findMany({
        where: { active: true },
        include: {
          _count: {
            select: { vehicles: true, drivers: true, routes: true, trips: true },
          },
        },
        orderBy: { name: 'asc' },
      });
      sendSuccess(res, partners);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const partner = await prisma.partner.findUnique({
        where: { id },
        include: {
          vehicles: true,
          drivers: true,
          routes: true,
        },
      });
      if (!partner) {
        res.status(404).json({ success: false, error: { message: 'Partner not found' } });
        return;
      }
      sendSuccess(res, partner);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, kind, contactName, phone, email, notes, active } = req.body;
      const partner = await prisma.partner.create({
        data: {
          name,
          kind: kind || 'TRANSPORT',
          contactName: contactName || null,
          phone: phone || null,
          email: email || null,
          notes: notes || null,
          active: active !== undefined ? Boolean(active) : true,
        },
      });
      sendSuccess(res, partner, 'Partner created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { name, kind, contactName, phone, email, notes, active } = req.body;
      const partner = await prisma.partner.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(kind !== undefined ? { kind } : {}),
          ...(contactName !== undefined ? { contactName } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(active !== undefined ? { active: Boolean(active) } : {}),
        },
      });
      sendSuccess(res, partner, 'Partner updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await prisma.partner.delete({ where: { id } });
      sendSuccess(res, null, 'Partner deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
