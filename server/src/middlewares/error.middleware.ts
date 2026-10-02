import { ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/index.js';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (err instanceof ZodError) return res.status(422).json({success:false,error:{message:err.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '),details:err.issues}});
  // Application Custom Error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
      },
    });
  }

  // Prisma Known Request Error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      return res.status(409).json({
        success: false,
        error: {
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: `A record with this ${target} already exists.`,
          details: err.meta,
        },
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Target record not found in the database.',
          details: err.meta,
        },
      });
    }

    return res.status(400).json({
      success: false,
      error: {
        code: `PRISMA_${err.code}`,
        message: 'This action conflicts with related records or invalid data.',
        details: null,
      },
    });
  }

  // Fallback for unhandled unexpected server errors
  console.error('Unhandled Error:', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred' : err.message,
    },
  });
};