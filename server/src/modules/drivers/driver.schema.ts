import { z } from 'zod';
import { EmploymentStatus, DutyStatus, DocumentType } from '@prisma/client';

export const createDriverSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name is required'),
    phoneNumber: z.string().min(6, 'Valid phone number is required'),
    nationalId: z.string().min(8, 'National ID is required'),
    licenseNumber: z.string().min(4, 'License number is required'),
    licenseExpirationDate: z.string().or(z.date()),
    employmentStatus: z.nativeEnum(EmploymentStatus).default(EmploymentStatus.ACTIVE),
    dutyStatus: z.nativeEnum(DutyStatus).default(DutyStatus.AVAILABLE),
    assignedVehicleId: z.string().uuid().nullable().optional(),
    supplierId: z.string().uuid().nullable().optional(),
  }),
});

export const updateDriverSchema = z.object({
  body: createDriverSchema.shape.body.partial(),
});

export const assignVehicleSchema = z.object({
  body: z.object({
    vehicleId: z.string().uuid().nullable(),
  }),
});

export const addDocumentSchema = z.object({
  body: z.object({
    documentType: z.nativeEnum(DocumentType),
    documentNumber: z.string().optional(),
    issueDate: z.string().or(z.date()).optional(),
    expiryDate: z.string().or(z.date()).optional(),
    fileUrl: z.string().min(1, 'File URL / name is required'),
  }),
});