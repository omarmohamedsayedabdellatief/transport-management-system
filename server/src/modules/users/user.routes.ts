import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

// Only ADMIN can manage users
router.use(authenticate, requireRole([UserRole.ADMIN]));

router.get('/', UserController.list);
router.post('/', UserController.create);
router.patch('/:id/status', UserController.updateStatus);

export default router;