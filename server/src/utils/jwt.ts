import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserPayload } from '../types/index.js';

export function signAccessToken(payload: UserPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as any,
  });
}

export function signRefreshToken(payload: { userId: string; sessionVersion?: number }): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
  });
}

export function verifyAccessToken(token: string): UserPayload {
  return jwt.verify(token, config.jwt.accessSecret) as UserPayload;
}

export function verifyRefreshToken(token: string): { userId: string; sessionVersion?: number } {
  return jwt.verify(token, config.jwt.refreshSecret) as { userId: string; sessionVersion?: number };
}