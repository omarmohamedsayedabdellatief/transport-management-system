import { z } from 'zod';

export const stopSchema = z.object({
  stopOrder: z.number().int().min(1),
  stopName: z.string().min(1, 'Stop name is required'),
  pickupTimeOffsetMin: z.number().int().default(0),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
});

export const createRouteSchema = z.object({
  body: z.object({
    clientId: z.string().uuid('Valid client ID is required'),
    routeName: z.string().min(2, 'Route name is required'),
    startLocation: z.string().min(2, 'Start location is required'),
    finalDestination: z.string().min(2, 'Final destination is required'),
    estimatedDistanceKm: z.number().positive('Distance must be positive'),
    estimatedDurationMin: z.number().int().positive('Duration must be positive'),
    clientPricePerTrip: z.number().min(0).optional().default(0),
    supplierCostPerTrip: z.number().min(0).optional().default(0),
    executionType: z.enum(['COMPANY', 'SUPPLIER']).optional().default('COMPANY'),
    supplierId: z.string().uuid().nullable().optional(),
    driverTripAllowance: z.number().min(0).optional().default(0),
    vehicleRentalCost: z.number().min(0).optional().default(0),
    defaultVehicleId: z.string().uuid().nullable().optional(),
    defaultDriverId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().default(true),
    stops: z.array(stopSchema).optional(),
  }),
});

export const updateRouteSchema = z.object({
  body: createRouteSchema.shape.body.partial(),
});