import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma.js';
import { UserRole, UserStatus } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../types/index.js';

export class UserService {
  static async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        clientScopeId: true, partnerScopeId: true, driverScopeId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createUser(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: UserRole;
  }) {
    data=z.object({email:z.string().email(),password:z.string().min(10).max(128),fullName:z.string().trim().min(2),phone:z.string().optional(),role:z.nativeEnum(UserRole)}).parse(data);
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        clientScopeId: true, partnerScopeId: true, driverScopeId: true,
        createdAt: true,
      },
    });
  }

  static async updateUserStatus(userId: string, status: UserStatus) {
    status=z.nativeEnum(UserStatus).parse(status);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    return prisma.user.update({
      where: { id: userId },
      data: { status, sessionVersion:{increment:1} },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
      },
    });
  }
}