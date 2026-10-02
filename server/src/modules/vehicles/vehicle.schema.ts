import { z } from 'zod';
import { VehicleStatus, VehicleType } from '@prisma/client';

export const createVehicleSchema = z.object({
  body: z.object({
    plateNumber: z.string().min(2, 'Plate number is required'),
    make: z.string().min(2, 'Make is required'),
    model: z.string().min(1, 'Model is required'),
    manufacturingYear: z.number().int().min(1990).max(2035),
    vehicleType: z.nativeEnum(VehicleType),
    capacity: z.number().int().positive('Capacity must be positive'),
    currentMileage: z.number().int().min(0).default(0),
    status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
    insuranceExpiry: z.string().or(z.date()),
    licenseExpiry: z.string().or(z.date()),
    inspectionExpiry: z.string().or(z.date()),
    supplierId: z.string().uuid().nullable().optional(),
  }),
});

export const updateVehicleSchema = z.object({
  body: createVehicleSchema.shape.body.partial(),
});