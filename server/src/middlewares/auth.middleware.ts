import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UnauthorizedError } from '../types/index.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../prisma.js';
export const authenticate = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const header=req.headers.authorization;
    if(!header?.startsWith('Bearer ')) throw new UnauthorizedError('Sign in to continue.');
    const payload=verifyAccessToken(header.slice(7));
    const user=await prisma.user.findUnique({where:{id:payload.userId}});
    if(!user || user.status!=='ACTIVE' || user.sessionVersion!==(payload.sessionVersion??0)) throw new UnauthorizedError('Your session has ended. Please sign in again.');
    req.user={userId:user.id,email:user.email,fullName:user.fullName,role:user.role,sessionVersion:user.sessionVersion};
    next();
  } catch(error) { next(error instanceof UnauthorizedError?error:new UnauthorizedError('Your session has expired. Please sign in again.')); }
};
