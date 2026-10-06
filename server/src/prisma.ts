import { companyScopeExtension } from './company-scope.js';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;
export const prisma = basePrisma.$extends(companyScopeExtension) as unknown as PrismaClient;

// Audit storage must remain writable even when the acting user has a restricted company scope.
export const auditDatabase = basePrisma;
