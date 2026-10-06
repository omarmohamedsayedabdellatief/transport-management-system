import excelRoutes from './trip-excel.routes.js';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { TripController } from './trip.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createTripSchema, updateTripSchema, updateTripStatusSchema, batchGenerateTripsSchema, generateDailyFromTemplatesSchema } from './trip.schema.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use('/excel', excelRoutes);

router.get('/', TripController.list);
router.get('/template-exclusions', async (req, res, next) => {
  try {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
    const events = await prisma.auditEvent.findMany({
      where: { action: 'EXCLUDE_DAILY_TEMPLATE', detail: { contains: `"date":"${date}"` } },
      orderBy: { createdAt: 'desc' }, take: 1000,
    });
    res.json({ success: true, data: events.map(event => ({ id: event.id, createdAt: event.createdAt, ...JSON.parse(event.detail) })) });
  } catch (err) { next(err); }
});
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