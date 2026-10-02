import { prisma } from '../../prisma.js';
import { verifyRefreshToken } from '../../utils/jwt.js';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { sendSuccess } from '../../utils/response.js';
import { AuthenticatedRequest } from '../../types/index.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      // Set refresh token in secure HttpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(res, {
        user: result.user,
        accessToken: result.accessToken,

      }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!token) {
        res.status(401).json({ success: false, error: { message: 'Refresh token missing' } });
        return;
      }

      const result = await AuthService.refresh(token);
      sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try { const token=req.cookies?.refreshToken; if(token){const payload=verifyRefreshToken(token); await prisma.user.updateMany({where:{id:payload.userId,sessionVersion:payload.sessionVersion??0},data:{sessionVersion:{increment:1}}});} } catch { /* An expired token is already invalid. */ }
    res.clearCookie('refreshToken');
    sendSuccess(res, { loggedOut: true }, 'Logged out successfully');
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.userId);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }
}
