import { z } from 'zod';
import { ShiftType, TripStatus } from '@prisma/client';

export const createTripSchema = z.object({
  body: z.object({
    billingTypeId: z.string().uuid().optional(),
    direction: z.enum(['OUTBOUND','RETURN']).optional(),
    returnDeparture: z.string().nullable().optional(),
    clientId: z.string().uuid('Valid client ID is required'),
    contractId: z.string().uuid().nullable().optional(),
    routeId: z.string().uuid('Valid route ID is required'),
    driverId: z.string().uuid('Valid driver ID is required'),
    vehicleId: z.string().uuid('Valid vehicle ID is required'),
    supplierId: z.string().uuid().nullable().optional(),
    executionType: z.enum(['COMPANY', 'SUPPLIER']).optional(),
    saleAmount: z.number().min(0).optional(),
    costAmount: z.number().min(0).optional(),
    driverAllowance: z.number().min(0).optional(),
    vehicleCost: z.number().min(0).optional(),
    tripDate: z.string().or(z.date()),
    shift: z.nativeEnum(ShiftType),
    scheduledDeparture: z.string().or(z.date()),
    expectedArrival: z.string().or(z.date()),
    notes: z.string().optional(),
  }),
});

export const updateTripSchema = z.object({
  body: createTripSchema.shape.body.partial(),
});

export const updateTripStatusSchema = z.object({
  body: z.object({
    tripStatus: z.nativeEnum(TripStatus),
    actualDeparture: z.string().or(z.date()).optional(),
    actualArrival: z.string().or(z.date()).optional(),
    notes: z.string().optional(),
  }),
});

export const batchGenerateTripsSchema = z.object({
  body: z.object({
    routeId: z.string().uuid(),
    billingTypeId: z.string().uuid().optional(),
    direction: z.enum(['OUTBOUND','RETURN']).optional(),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
    shifts: z.array(z.nativeEnum(ShiftType)).min(1),
    departureTime: z.string(), // "06:00"
    durationMinutes: z.number().int().positive().default(60),
  }),
});

export const generateDailyFromTemplatesSchema = z.object({
  body: z.object({
    date: z.string().or(z.date()),
    clientId: z.string().uuid().or(z.literal('')).optional(),
    shifts: z.array(z.nativeEnum(ShiftType)).optional(),
    shift: z.nativeEnum(ShiftType).optional(),
    departureTime: z.string().optional(),
    tripStatus: z.nativeEnum(TripStatus).optional(),
    routeOverrides: z.array(
      z.object({
        routeId: z.string().uuid(),
        billingTypeId: z.string().uuid().optional(),
        direction: z.enum(['OUTBOUND','RETURN']).optional(),
        selected: z.boolean().optional(),
        exclusionNote: z.string().trim().max(2000).optional(),
        driverId: z.string().uuid().optional(),
        vehicleId: z.string().uuid().optional(),
        shift: z.nativeEnum(ShiftType).optional(),
        departureTime: z.string().optional(),
        saleAmount: z.number().min(0).optional(),
        costAmount: z.number().min(0).optional(),
        driverAllowance: z.number().min(0).optional(),
        vehicleCost: z.number().min(0).optional(),
        executionType: z.enum(['COMPANY', 'SUPPLIER']).optional(),
      })
    ).optional(),
  }),
});