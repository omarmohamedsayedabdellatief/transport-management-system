import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, ForbiddenError, UnauthorizedError } from '../types/index.js';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Role ${req.user.role} does not have sufficient permissions for this resource.`
      );
    }

    next();
  };
};