import { z } from 'zod';
import { ClientStatus } from '@prisma/client';

export const createClientSchema = z.object({
  body: z.object({
    companyName: z.string().min(2, 'Company name is required'),
    contactPerson: z.string().min(2, 'Contact person name is required'),
    phone: z.string().min(6, 'Valid phone number is required'),
    email: z.string().email('Valid email is required'),
    address: z.string().min(5, 'Address is required'),
    taxId: z.string().optional(),
    status: z.nativeEnum(ClientStatus).default(ClientStatus.ACTIVE),
    notes: z.string().optional(),
  }),
});

export const updateClientSchema = z.object({
  body: createClientSchema.shape.body.partial(),
});