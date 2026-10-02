import { z } from 'zod';
import { ContractStatus, PricingModel } from '@prisma/client';

export const createContractSchema = z.object({
  body: z.object({
    clientId: z.string().uuid('Valid client ID is required'),
    contractNumber: z.string().min(3, 'Contract number is required'),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
    status: z.nativeEnum(ContractStatus).default(ContractStatus.ACTIVE),
    assignedVehicleCount: z.number().int().min(1).default(1),
    pricingModel: z.nativeEnum(PricingModel).default(PricingModel.MONTHLY_FIXED),
    monthlyValue: z.number().positive('Monthly contract value must be positive'),
    notes: z.string().optional(),
    vehicleIds: z.array(z.string().uuid()).optional(),
  }),
});

export const updateContractSchema = z.object({
  body: createContractSchema.shape.body.partial(),
});