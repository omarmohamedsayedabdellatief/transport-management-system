import { accessFor } from "../roles/permissions.js";
import {
  assertCanGrant,
  preserveRoleAdministrators,
} from "../roles/roles.routes.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../../prisma.js";
import { UserRole, UserStatus } from "@prisma/client";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../types/index.js";

export class UserService {
  static async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        roleId: true,
        assignedRole: { select: { id: true, name: true, code: true } },
        status: true,
        companyScopeEnabled: true,
        companyIds: true,
        clientScopeId: true,
        partnerScopeId: true,
        driverScopeId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async createUser(
    data: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      role?: UserRole;
      roleId?: string;
      companyIds?: string[];
      companyScopeEnabled?: boolean;
    },
    actor?: any,
  ) {
    data = z
      .object({
        email: z.string().email(),
        password: z.string().min(10).max(128),
        fullName: z.string().trim().min(2),
        phone: z.string().optional(),
        role: z.nativeEnum(UserRole).optional(),
        roleId: z.string().min(1).optional(),
        companyIds: z.array(z.string().uuid()).max(500).optional(),
        companyScopeEnabled: z.boolean().optional(),
      })
      .parse(data);
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    const chosen = data.roleId
      ? await prisma.appRole.findUniqueOrThrow({ where: { id: data.roleId } })
      : null;
    const role = (chosen?.code ||
      (chosen ? "VIEWER" : data.role || "VIEWER")) as UserRole;
    const roleAccess = chosen
      ? chosen.permissions
      : (await accessFor({ role })).permissions;
    if (actor) assertCanGrant(actor, roleAccess);
    const scoped =
      chosen?.code === "VIEWER" ||
      (!chosen && role === UserRole.VIEWER) ||
      !!data.companyScopeEnabled;
    const companyIds = scoped
      ? await this.validateCompanies(data.companyIds || [])
      : [];
    const passwordHash = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role,
        roleId: chosen?.id || null,
        companyScopeEnabled: scoped,
        companyIds,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        roleId: true,
        assignedRole: { select: { id: true, name: true, code: true } },
        status: true,
        companyScopeEnabled: true,
        companyIds: true,
        clientScopeId: true,
        partnerScopeId: true,
        driverScopeId: true,
        createdAt: true,
      },
    });
  }

  static async validateCompanies(input: unknown) {
    const ids = [
      ...new Set(
        z
          .array(z.string().uuid())
          .min(1, "اختر شركة واحدة على الأقل.")
          .max(500)
          .parse(input),
      ),
    ];
    if (
      (await prisma.client.count({ where: { id: { in: ids } } })) !== ids.length
    )
      throw new ValidationError("One or more companies do not exist.");
    return ids;
  }

  static async updateCompanies(userId: string, input: unknown, actor: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");
    if (user.role !== UserRole.VIEWER)
      throw new ValidationError("Company assignment is for regular users.");
    const companyIds = await this.validateCompanies(input);
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632902)`;
      assertCanGrant(actor, (await accessFor(user, tx)).permissions);
      const result = await tx.user.update({
        where: { id: userId },
        data: {
          companyIds,
          companyScopeEnabled: true,
          sessionVersion: { increment: 1 },
        },
        select: { id: true, companyIds: true, companyScopeEnabled: true },
      });
      await preserveRoleAdministrators(tx);
      return result;
    });
  }

  static async assignRole(userId: string, input: unknown, actor: any) {
    const d = z
      .object({
        roleId: z.string().min(1),
        companyIds: z.array(z.string().uuid()).optional(),
        companyScopeEnabled: z.boolean().optional(),
      })
      .parse(input);
    return prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632902)`;
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        assertCanGrant(actor, (await accessFor(user, tx)).permissions);
        const role = await tx.appRole.findUniqueOrThrow({
          where: { id: d.roleId },
        });
        assertCanGrant(actor, role.permissions);
        const scoped =
          role.code === "VIEWER" ||
          (d.companyScopeEnabled ?? user.companyScopeEnabled);
        const ids = scoped
          ? await this.validateCompanies(d.companyIds || user.companyIds)
          : [];
        const result = await tx.user.update({
          where: { id: userId },
          data: {
            role: (role.code || "VIEWER") as UserRole,
            roleId: role.id,
            companyScopeEnabled: scoped,
            companyIds: ids,
            clientScopeId: null,
            partnerScopeId: null,
            driverScopeId: null,
            sessionVersion: { increment: 1 },
          },
          select: {
            id: true,
            role: true,
            roleId: true,
            companyScopeEnabled: true,
            companyIds: true,
          },
        });
        await preserveRoleAdministrators(tx);
        return result;
      },
      { timeout: 20000 },
    );
  }

  static async updateUserStatus(
    userId: string,
    status: UserStatus,
    actor?: any,
  ) {
    status = z.nativeEnum(UserStatus).parse(status);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632902)`;
      if (actor) assertCanGrant(actor, (await accessFor(user, tx)).permissions);
      const updated = await tx.user.update({
        where: { id: userId },
        data: { status, sessionVersion: { increment: 1 } },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          roleId: true,
          assignedRole: { select: { id: true, name: true, code: true } },
          status: true,
        },
      });
      await preserveRoleAdministrators(tx);
      return updated;
    });
  }
}
