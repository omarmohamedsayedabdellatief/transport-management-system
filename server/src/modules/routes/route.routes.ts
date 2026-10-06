import { saveRouteRates } from './route-rates.js';
import { Router } from 'express';
import { RouteController } from './route.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createRouteSchema, updateRouteSchema } from './route.schema.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.put('/:id/rates', requireRole([UserRole.ADMIN, UserRole.ACCOUNTANT]), async (req,res,next) => {
  try { res.json({success:true,data:await saveRouteRates(String(req.params.id),req.body)}); } catch(error) { next(error); }
});

router.get('/', RouteController.list);
router.get('/:id', RouteController.getById);

router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(createRouteSchema),
  RouteController.create
);

router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  validate(updateRouteSchema),
  RouteController.update
);

router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER]),
  RouteController.delete
);

export default router;