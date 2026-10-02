import { z } from 'zod';
import { MaintenanceType, MaintenanceStatus } from '@prisma/client';

export const createMaintenanceSchema = z.object({
  body: z.object({
    vehicleId: z.string().uuid('Valid vehicle ID is required'),
    maintenanceType: z.nativeEnum(MaintenanceType),
    serviceDate: z.string().or(z.date()),
    completionDate: z.string().or(z.date()).optional(),
    cost: z.number().min(0, 'Cost must be zero or positive'),
    mileageAtService: z.number().int().min(0),
    nextMaintenanceDate: z.string().or(z.date()).optional(),
    nextMaintenanceMileage: z.number().int().optional(),
    serviceProvider: z.string().optional(),
    downtimeHours: z.number().min(0).default(0),
    status: z.nativeEnum(MaintenanceStatus).default(MaintenanceStatus.IN_PROGRESS),
    description: z.string().min(3, 'Description is required'),
    invoiceUrl: z.string().optional(),
  }),
});

export const updateMaintenanceSchema = z.object({
  body: createMaintenanceSchema.shape.body.partial(),
});