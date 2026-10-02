import { Router } from 'express';
import { TripController } from './trip.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createTripSchema, updateTripSchema, updateTripStatusSchema, batchGenerateTripsSchema, generateDailyFromTemplatesSchema } from './trip.schema.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', TripController.list);
router.get('/:id', TripController.getById);

router.post(
  '/check-conflict',
  TripController.checkConflict
);

router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(createTripSchema),
  TripController.create
);

router.post(
  '/generate-daily-from-templates',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(generateDailyFromTemplatesSchema),
  TripController.generateDailyFromTemplates
);

router.post(
  '/batch-generate',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(batchGenerateTripsSchema),
  TripController.batchGenerate
);

router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(updateTripSchema),
  TripController.update
);

router.patch(
  '/:id/status',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(updateTripStatusSchema),
  TripController.updateStatus
);

router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  TripController.delete
);

export default router;