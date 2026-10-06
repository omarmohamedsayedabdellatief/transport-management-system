import { accessFor } from '../roles/permissions.js';
import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { UnauthorizedError, ConflictError, NotFoundError } from '../../types/index.js';
import { UserRole } from '@prisma/client';

export class AuthService {
  static async login(email: string, passwordPlain: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError(`Account is ${user.status.toLowerCase()}. Please contact administrator.`);
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload = {
      userId: user.id,
      sessionVersion: user.sessionVersion,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ userId: user.id, sessionVersion: user.sessionVersion });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        ...await accessFor(user),
      },
      accessToken,
      refreshToken,
    };
  }

  static async refresh(refreshTokenFromHeaderOrCookie: string) {
    try {
      const decoded = verifyRefreshToken(refreshTokenFromHeaderOrCookie);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.status !== 'ACTIVE' || user.sessionVersion !== (decoded.sessionVersion ?? 0)) {
        throw new UnauthorizedError('User account not found or inactive');
      }

      const payload = {
        userId: user.id,
      sessionVersion: user.sessionVersion,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      };

      const newAccessToken = signAccessToken(payload);
      return { accessToken: newAccessToken, user: {...payload, ...await accessFor(user)} };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  static async registerUser(data: {
    email: string;
    passwordPlain: string;
    fullName: string;
    phone?: string;
    role?: UserRole;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(data.passwordPlain, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role || UserRole.VIEWER,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        roleId: true,
        companyScopeEnabled: true,
        status: true,
        createdAt: true,
      },
    });

    return user;
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        roleId: true,
        companyScopeEnabled: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {...user, ...await accessFor(user)};
  }
}