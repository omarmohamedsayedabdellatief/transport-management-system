import { prisma } from '../../prisma.js';
import { dateOnly } from '../operations/operations.logic.js';
import { NotFoundError, ValidationError, ConflictError } from '../../types/index.js';
import { MaintenanceStatus } from '@prisma/client';

export class MaintenanceService {
  static async getAllMaintenance(params?: { vehicleId?: string; status?: MaintenanceStatus }) {
    const where: any = {};
    if (params?.vehicleId) where.vehicleId = params.vehicleId;
    if (params?.status) where.status = params.status;

    return prisma.maintenanceRecord.findMany({
      where,
      include: {
        vehicle: {
          select: { id: true, plateNumber: true, make: true, model: true, currentMileage: true, supplierId: true, supplier: { select: { id: true, name: true } } },
        },
      },
      orderBy: { serviceDate: 'desc' },
    });
  }

  static async getMaintenanceById(id: string) {
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: { vehicle: { include: { assignedDriver: true } } },
    });

    if (!record) throw new NotFoundError('Maintenance record not found');
    return record;
  }

  static async saveMaintenance(data: any, id?: string) {
    return prisma.$transaction(async (tx) => {
      // Serialize with dispatch so maintenance cannot release an occupied vehicle.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;
      const current = id ? await tx.maintenanceRecord.findUnique({ where: { id } }) : null;
      if (id && !current) throw new NotFoundError('Maintenance record not found');
      if (current && data.vehicleId && current.vehicleId !== data.vehicleId)
        throw new ValidationError('Create a separate maintenance record for another vehicle.');
      const input = { ...data };
      for (const key of ['serviceDate', 'completionDate', 'nextMaintenanceDate']) {
        if (key in input) {
          if (!input[key] && key !== 'serviceDate') { input[key] = null; continue; }
          const value = input[key] instanceof Date ? input[key].toISOString().slice(0, 10) : input[key];
          input[key] = dateOnly(value);
        }
      }
      const merged = { ...current, ...input };
      if (merged.completionDate && merged.completionDate < merged.serviceDate)
        throw new ValidationError('Completion date cannot be before the service date.');
      if (merged.nextMaintenanceDate && merged.nextMaintenanceDate < merged.serviceDate)
        throw new ValidationError('Next maintenance date cannot be before this service.');
      const vehicle = await tx.vehicle.findUnique({ where: { id: merged.vehicleId } });
      if (!vehicle) throw new ValidationError('Choose an existing vehicle.');
      if (merged.status === 'IN_PROGRESS' && await tx.trip.count({ where: { vehicleId: merged.vehicleId, tripStatus: 'IN_PROGRESS' } }))
        throw new ConflictError('Pause the active trip before starting vehicle maintenance.');
      const record = id
        ? await tx.maintenanceRecord.update({ where: { id }, data: input, include: { vehicle: true } })
        : await tx.maintenanceRecord.create({ data: input, include: { vehicle: true } });
      await this.syncVehicle(tx, merged.vehicleId, record.status === 'COMPLETED' ? record.mileageAtService : undefined);
      return record;
    });
  }

  static async syncVehicle(tx: any, vehicleId: string, mileage?: number) {
    const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: vehicleId }, include: { assignedDriver: true } });
    const occupied = await tx.trip.count({ where: { vehicleId, tripStatus: 'IN_PROGRESS' } });
    const open = await tx.maintenanceRecord.count({ where: { vehicleId, OR: [
      { status: 'IN_PROGRESS' }, { status: 'SCHEDULED', serviceDate: { lte: new Date() } },
    ] } });
    await tx.vehicle.update({ where: { id: vehicleId }, data: {
      currentMileage: mileage === undefined ? vehicle.currentMileage : Math.max(vehicle.currentMileage, mileage),
      status: vehicle.status === 'OUT_OF_SERVICE' ? 'OUT_OF_SERVICE' : occupied ? 'ON_TRIP' : open ? 'UNDER_MAINTENANCE' : vehicle.assignedDriver ? 'ASSIGNED' : 'AVAILABLE',
    } });
  }

  static async createMaintenance(data: any) { return this.saveMaintenance(data); }
  static async updateMaintenance(id: string, data: any) { return this.saveMaintenance(data, id); }

  static async getCostSummary() {
    const records = await prisma.maintenanceRecord.findMany({
      select: { cost: true, maintenanceType: true, serviceDate: true },
    });

    const totalCost = records.reduce((sum, r) => sum + Number(r.cost), 0);
    const byType = records.reduce((acc: any, r) => {
      acc[r.maintenanceType] = (acc[r.maintenanceType] || 0) + Number(r.cost);
      return acc;
    }, {});

    return { totalCost, byType, totalRecords: records.length };
  }

  static async deleteMaintenanceRecord(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;
      const record = await tx.maintenanceRecord.findUnique({ where: { id } });
      if (!record) throw new NotFoundError('Maintenance record not found');
      if (record.status !== 'SCHEDULED') throw new ConflictError('Keep started and completed maintenance for service history.');
      await tx.maintenanceRecord.delete({ where: { id } });
      await this.syncVehicle(tx, record.vehicleId);
      return record;
    });
  }
}
