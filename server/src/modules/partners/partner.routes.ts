import { Router } from 'express';
import { PartnerController } from './partner.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', PartnerController.list);
router.get('/:id', PartnerController.getById);

router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  PartnerController.create
);

router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  PartnerController.update
);

router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  PartnerController.delete
);

export default router;
