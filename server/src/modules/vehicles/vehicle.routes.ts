import { Router } from 'express';
import { VehicleController } from './vehicle.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createVehicleSchema, updateVehicleSchema } from './vehicle.schema.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', VehicleController.list);
router.get('/suppliers', VehicleController.getSuppliers);
router.get('/unassigned', VehicleController.getUnassigned);
router.get('/expiring-documents', VehicleController.getExpiringDocuments);
router.get('/:id', VehicleController.getById);

router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(createVehicleSchema),
  VehicleController.create
);

router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER, UserRole.VIEWER]),
  validate(updateVehicleSchema),
  VehicleController.update
);

router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  VehicleController.delete
);

export default router;