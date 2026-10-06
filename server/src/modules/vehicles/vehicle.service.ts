import { companyScope } from '../../company-scope.js';
import { prisma } from '../../prisma.js';
import { NotFoundError, ConflictError, ValidationError } from '../../types/index.js';
import { VehicleStatus, VehicleType } from '@prisma/client';

export class VehicleService {
  static async getAllVehicles(params?: {
    status?: VehicleStatus;
    vehicleType?: string;
    search?: string;
    supplierId?: string;
    ownership?: 'COMPANY' | 'SUPPLIER';
  }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.vehicleType) where.vehicleType = params.vehicleType;
    if (params?.supplierId) where.supplierId = params.supplierId;
    else if (params?.ownership === 'COMPANY') where.supplierId = null;
    else if (params?.ownership === 'SUPPLIER') where.supplierId = { not: null };

    if (params?.search) {
      where.OR = [
        { plateNumber: { contains: params.search, mode: 'insensitive' } },
        { make: { contains: params.search, mode: 'insensitive' } },
        { model: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return prisma.vehicle.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true, kind: true, phone: true },
        },
        assignedDriver: {
          select: { id: true, fullName: true, phoneNumber: true, dutyStatus: true },
        },
        _count: {
          select: { trips: true, maintenanceRecords: true },
        },
      },
      orderBy: { plateNumber: 'asc' },
    });
  }

  static async getUnassignedVehicles() {
    return prisma.vehicle.findMany({
      where: {
        assignedDriver: null,
        status: { notIn: [VehicleStatus.UNDER_MAINTENANCE, VehicleStatus.OUT_OF_SERVICE] },
      },
      include: {
        supplier: {
          select: { id: true, name: true, kind: true },
        },
      },
      orderBy: { plateNumber: 'asc' },
    });
  }

  static async getVehicleById(id: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        supplier: true,
        assignedDriver: true,
        contractVehicles: {
          where: { isActive: true },
          include: { contract: { include: { client: true } } },
        },
        maintenanceRecords: {
          orderBy: { serviceDate: 'desc' },
          take: 10,
        },
        trips: {
          take: 10,
          orderBy: { scheduledDeparture: 'desc' },
          include: { route: true, driver: true },
        },
      },
    });

    if (!vehicle) throw new NotFoundError('Vehicle not found');
    return vehicle;
  }

  static async validateType(code: string, current?: string) {
    const category = await prisma.vehicleCategory.findUnique({where:{code}});
    if (!category || (!category.active && code !== current)) throw new ValidationError('Choose an active vehicle type from settings.');
  }
  static async createVehicle(data: any) {
    await this.validateType(data.vehicleType);
    const existing = await prisma.vehicle.findUnique({
      where: { plateNumber: data.plateNumber.trim() },
    });
    if (existing) {
      throw new ConflictError(`Vehicle with plate ${data.plateNumber} already exists`);
    }

    const { supplierId, ...rest } = data;

    return prisma.vehicle.create({
      data: {
        ...rest,
        supplierId: supplierId || null,
        insuranceExpiry: new Date(data.insuranceExpiry),
        licenseExpiry: new Date(data.licenseExpiry),
        inspectionExpiry: new Date(data.inspectionExpiry),
      },
      include: {
        supplier: true,
        assignedDriver: true,
      },
    });
  }

  static async updateVehicle(id: string, data: any) {
    const current = await this.getVehicleById(id);
    if (data.vehicleType) await this.validateType(data.vehicleType, current.vehicleType);
    if (companyScope.getStore() && data.supplierId && !(await prisma.partner.findUnique({ where: { id: data.supplierId } }))) throw new ValidationError('Choose a supplier assigned to your companies.');
    const updateData = { ...data };
    if (updateData.insuranceExpiry) updateData.insuranceExpiry = new Date(updateData.insuranceExpiry);
    if (updateData.licenseExpiry) updateData.licenseExpiry = new Date(updateData.licenseExpiry);
    if (updateData.inspectionExpiry) updateData.inspectionExpiry = new Date(updateData.inspectionExpiry);
    if ('supplierId' in updateData) {
      updateData.supplierId = updateData.supplierId || null;
    }

    return prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: { assignedDriver: true, supplier: true },
    });
  }

  static async deleteVehicle(id: string) {
    await this.getVehicleById(id);

    // Decouple assigned driver
    await prisma.driver.updateMany({
      where: { assignedVehicleId: id },
      data: { assignedVehicleId: null },
    });

    // Decouple route default vehicle
    await prisma.route.updateMany({
      where: { defaultVehicleId: id },
      data: { defaultVehicleId: null },
    });

    // Remove contract allocations
    await prisma.contractVehicle.deleteMany({
      where: { vehicleId: id },
    });

    // Remove maintenance records
    await prisma.maintenanceRecord.deleteMany({
      where: { vehicleId: id },
    });

    // Remove any associated trips
    await prisma.trip.deleteMany({
      where: { vehicleId: id },
    });

    return prisma.vehicle.delete({
      where: { id },
    });
  }

  static async getExpiringDocuments() {
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

    return prisma.vehicle.findMany({
      where: {
        OR: [
          { insuranceExpiry: { lte: thirtyDaysAhead } },
          { licenseExpiry: { lte: thirtyDaysAhead } },
          { inspectionExpiry: { lte: thirtyDaysAhead } },
        ],
      },
      include: { assignedDriver: true },
      orderBy: { licenseExpiry: 'asc' },
    });
  }
}