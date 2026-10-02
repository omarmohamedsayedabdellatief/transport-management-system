import { prisma } from '../../prisma.js';
import { NotFoundError } from '../../types/index.js';
import { ClientStatus } from '@prisma/client';

export class ClientService {
  static async getAllClients(params?: { search?: string; status?: ClientStatus }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.search) {
      where.OR = [
        { companyName: { contains: params.search, mode: 'insensitive' } },
        { contactPerson: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return prisma.client.findMany({
      where,
      include: {
        contracts: {
          select: {
            id: true,
            contractNumber: true,
            status: true,
            startDate: true,
            endDate: true,
            monthlyValue: true,
          },
        },
        _count: {
          select: { contracts: true, routes: true, trips: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        contracts: {
          include: {
            contractVehicles: {
              include: { vehicle: true },
            },
          },
        },
        routes: {
          include: {
            stops: { orderBy: { stopOrder: 'asc' } },
            defaultVehicle: true,
            defaultDriver: true,
          },
        },
      },
    });

    if (!client) throw new NotFoundError('Client not found');
    return client;
  }

  static async createClient(data: any) {
    return prisma.client.create({ data });
  }

  static async updateClient(id: string, data: any) {
    await this.getClientById(id);
    return prisma.client.update({
      where: { id },
      data,
    });
  }

  static async deleteClient(id: string) {
    await this.getClientById(id);
    // Delete trips
    await prisma.trip.deleteMany({ where: { clientId: id } });
    // Delete contracts and contract vehicles
    const contracts = await prisma.contract.findMany({ where: { clientId: id }, select: { id: true } });
    const contractIds = contracts.map((c) => c.id);
    if (contractIds.length > 0) {
      await prisma.contractVehicle.deleteMany({ where: { contractId: { in: contractIds } } });
      await prisma.contract.deleteMany({ where: { clientId: id } });
    }
    // Delete routes and stops
    const routes = await prisma.route.findMany({ where: { clientId: id }, select: { id: true } });
    const routeIds = routes.map((r) => r.id);
    if (routeIds.length > 0) {
      await prisma.routeStop.deleteMany({ where: { routeId: { in: routeIds } } });
      await prisma.route.deleteMany({ where: { clientId: id } });
    }
    return prisma.client.delete({ where: { id } });
  }
}