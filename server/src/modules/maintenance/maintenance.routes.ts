import { Router } from 'express';
import { MaintenanceController } from './maintenance.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createMaintenanceSchema, updateMaintenanceSchema } from './maintenance.schema.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', MaintenanceController.list);
router.get('/summary', MaintenanceController.getSummary);
router.get('/:id', MaintenanceController.getById);

router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(createMaintenanceSchema),
  MaintenanceController.create
);

router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(updateMaintenanceSchema),
  MaintenanceController.update
);

router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  MaintenanceController.delete
);

export default router;