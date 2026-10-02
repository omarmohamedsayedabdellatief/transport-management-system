import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/kpis', DashboardController.getKPIs);
router.get('/trends', DashboardController.getTrends);
router.get('/notifications', DashboardController.getNotifications);
router.get('/reports/vehicle-utilization', DashboardController.getVehicleUtilization);
router.get('/reports/driver-performance', DashboardController.getDriverPerformance);

export default router;