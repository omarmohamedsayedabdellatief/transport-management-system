import { Router } from 'express';
import { DriverController } from './driver.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createDriverSchema, updateDriverSchema, assignVehicleSchema, addDocumentSchema } from './driver.schema.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', DriverController.list);
router.get('/expiring-licenses', DriverController.getExpiringLicenses);
router.get('/:id', DriverController.getById);

router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(createDriverSchema),
  DriverController.create
);

router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(updateDriverSchema),
  DriverController.update
);

router.patch(
  '/:id/assign-vehicle',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(assignVehicleSchema),
  DriverController.assignVehicle
);

router.post(
  '/:id/documents',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(addDocumentSchema),
  DriverController.addDocument
);

router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  DriverController.delete
);

export default router;