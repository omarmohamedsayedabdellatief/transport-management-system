import { ConflictError, ValidationError } from '../../types/index.js';
import { prisma } from '../../prisma.js';
import { dateOnly } from '../operations/operations.logic.js';
import { NotFoundError } from '../../types/index.js';
import { ContractStatus } from '@prisma/client';

export class ContractService {
  static async getAllContracts(params?: { status?: ContractStatus; clientId?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.clientId) where.clientId = params.clientId;

    return prisma.contract.findMany({
      where,
      include: {
        client: {
          select: { id: true, companyName: true, contactPerson: true, phone: true },
        },
        contractVehicles: {
          where: { isActive: true },
          include: { vehicle: true },
        },
        _count: {
          select: { trips: true },
        },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  static async getContractById(id: string) {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        client: true,
        contractVehicles: {
          include: {
            vehicle: {
              include: { assignedDriver: true },
            },
          },
        },
        trips: {
          take: 10,
          orderBy: { scheduledDeparture: 'desc' },
          include: { route: true, vehicle: true, driver: true },
        },
      },
    });

    if (!contract) throw new NotFoundError('Contract not found');
    return contract;
  }

  static async createContract(data: any) {
    const { vehicleIds, ...contractData } = data;
    contractData.startDate = dateOnly(String(contractData.startDate).slice(0, 10));
    contractData.endDate = dateOnly(String(contractData.endDate).slice(0, 10));

    if (contractData.endDate < contractData.startDate) throw new ValidationError("Contract end date must be on or after start date.");
    const contract = await prisma.contract.create({
      data: {
        ...contractData,
        contractVehicles: vehicleIds?.length
          ? {
              create: vehicleIds.map((vId: string) => ({
                vehicleId: vId,
              })),
            }
          : undefined,
      },
      include: {
        client: true,
        contractVehicles: { include: { vehicle: true } },
      },
    });

    return contract;
  }

  static async updateContract(id: string, data: any) {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;
      const current = await tx.contract.findUnique({ where: { id } });
      if (!current) throw new NotFoundError('Contract not found');
      const { vehicleIds, ...contractData } = data;
      if (contractData.startDate) contractData.startDate = dateOnly(String(contractData.startDate).slice(0, 10));
      if (contractData.endDate) contractData.endDate = dateOnly(String(contractData.endDate).slice(0, 10));
      const merged = { ...current, ...contractData };
      if (merged.endDate < merged.startDate) throw new ValidationError('Contract end date must be on or after start date.');
      if (merged.clientId !== current.clientId && (await tx.trip.count({ where: { contractId: id } }) || await tx.servicePlan.count({ where: { contractId: id } })))
        throw new ConflictError('This contract has scheduled services or trip history. Create a new contract for another client.');
      if (await tx.servicePlan.count({ where: { contractId: id, active: true, OR: [{ startDate: { lt: merged.startDate } }, { endDate: { gt: merged.endDate } }] } }))
        throw new ConflictError('Adjust active service schedules before shortening this contract.');
      if (vehicleIds) {
        await tx.contractVehicle.deleteMany({ where: { contractId: id } });
        if (vehicleIds.length) await tx.contractVehicle.createMany({ data: [...new Set<string>(vehicleIds)].map(vehicleId => ({ contractId: id, vehicleId, isActive: true })) });
      }
      return tx.contract.update({ where: { id }, data: contractData, include: { client: true, contractVehicles: { include: { vehicle: true } } } });
    });
  }

  static async getExpiringSoon() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return prisma.contract.findMany({
      where: {
        status: ContractStatus.ACTIVE,
        endDate: { lte: thirtyDaysFromNow },
      },
      include: { client: true },
      orderBy: { endDate: 'asc' },
    });
  }

  static async deleteContract(id: string) {
    await this.getContractById(id);
    if(await prisma.trip.count({where:{contractId:id}})) throw new ConflictError('Contracts with trip history cannot be deleted. Change the contract status instead.');
    await prisma.contractVehicle.deleteMany({ where: { contractId: id } });
    return prisma.contract.delete({ where: { id } });
  }
}