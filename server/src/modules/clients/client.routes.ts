import { Router } from 'express';
import { ClientController } from './client.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createClientSchema, updateClientSchema } from './client.schema.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', ClientController.list);
router.get('/:id', ClientController.getById);

// Admin and Operations Manager can create/update
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(createClientSchema),
  ClientController.create
);

router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(updateClientSchema),
  ClientController.update
);

router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  ClientController.delete
);

export default router;