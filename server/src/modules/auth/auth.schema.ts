import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    phone: z.string().optional(),
    role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});