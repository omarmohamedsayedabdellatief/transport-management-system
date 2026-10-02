import { prisma } from '../../prisma.js';
import { NotFoundError, ConflictError, ValidationError } from '../../types/index.js';
import { DutyStatus, EmploymentStatus, VehicleStatus } from '@prisma/client';

export class DriverService {
  static async getAllDrivers(params?: {
    dutyStatus?: DutyStatus;
    employmentStatus?: EmploymentStatus;
    search?: string;
    supplierId?: string;
    ownership?: 'COMPANY' | 'SUPPLIER';
  }) {
    const where: any = {};
    if (params?.dutyStatus) where.dutyStatus = params.dutyStatus;
    if (params?.employmentStatus) where.employmentStatus = params.employmentStatus;
    if (params?.supplierId) where.supplierId = params.supplierId;
    else if (params?.ownership === 'COMPANY') where.supplierId = null;
    else if (params?.ownership === 'SUPPLIER') where.supplierId = { not: null };

    if (params?.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { phoneNumber: { contains: params.search, mode: 'insensitive' } },
        { licenseNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return prisma.driver.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true, kind: true, phone: true },
        },
        assignedVehicle: true,
        _count: {
          select: { trips: true, documents: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  static async getDriverById(id: string) {
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        supplier: true,
        assignedVehicle: {
          include: {
            maintenanceRecords: { take: 5, orderBy: { serviceDate: 'desc' } },
          },
        },
        documents: { orderBy: { createdAt: 'desc' } },
        trips: {
          take: 10,
          orderBy: { scheduledDeparture: 'desc' },
          include: { route: true, vehicle: true },
        },
      },
    });

    if (!driver) throw new NotFoundError('Driver not found');
    return driver;
  }

  static async createDriver(data: any) {
    // Check uniqueness
    const existingNational = await prisma.driver.findUnique({
      where: { nationalId: data.nationalId.trim() },
    });
    if (existingNational) throw new ConflictError('National ID already registered');

    const existingLicense = await prisma.driver.findUnique({
      where: { licenseNumber: data.licenseNumber.trim() },
    });
    if (existingLicense) throw new ConflictError('License number already registered');

    // If assigning vehicle, ensure vehicle is available and not assigned to another driver
    if (data.assignedVehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: data.assignedVehicleId },
        include: { assignedDriver: true },
      });
      if (!vehicle) throw new NotFoundError('Assigned vehicle not found');
      if (vehicle.assignedDriver) {
        throw new ConflictError(
          `Vehicle ${vehicle.plateNumber} is already permanently assigned to driver ${vehicle.assignedDriver.fullName}`
        );
      }
    }

    const { supplierId, ...rest } = data;

    const created = await prisma.driver.create({
      data: {
        ...rest,
        supplierId: supplierId || null,
        licenseExpirationDate: new Date(data.licenseExpirationDate),
      },
      include: { assignedVehicle: true, supplier: true },
    });

    // If assigned a vehicle, mark vehicle status as ASSIGNED if it was AVAILABLE
    if (data.assignedVehicleId) {
      await prisma.vehicle.update({
        where: { id: data.assignedVehicleId },
        data: { status: VehicleStatus.ASSIGNED },
      });
    }

    return created;
  }

  static async updateDriver(id: string, data: any) {
    const current = await this.getDriverById(id);
    const updateData = { ...data };

    if (updateData.licenseExpirationDate) {
      updateData.licenseExpirationDate = new Date(updateData.licenseExpirationDate);
    }

    if ('supplierId' in updateData) {
      updateData.supplierId = updateData.supplierId || null;
    }

    // Vehicle re-assignment check
    if (updateData.assignedVehicleId !== undefined && updateData.assignedVehicleId !== current.assignedVehicleId) {
      if (updateData.assignedVehicleId) {
        const vehicle = await prisma.vehicle.findUnique({
          where: { id: updateData.assignedVehicleId },
          include: { assignedDriver: true },
        });
        if (!vehicle) throw new NotFoundError('Assigned vehicle not found');
        if (vehicle.assignedDriver && vehicle.assignedDriver.id !== id) {
          throw new ConflictError(
            `Vehicle ${vehicle.plateNumber} is already assigned to driver ${vehicle.assignedDriver.fullName}`
          );
        }
      }

      // If driver previously had a vehicle, set old vehicle back to AVAILABLE
      if (current.assignedVehicleId && current.assignedVehicleId !== updateData.assignedVehicleId) {
        await prisma.vehicle.update({
          where: { id: current.assignedVehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });
      }

      // If new vehicle assigned, mark it ASSIGNED
      if (updateData.assignedVehicleId) {
        await prisma.vehicle.update({
          where: { id: updateData.assignedVehicleId },
          data: { status: VehicleStatus.ASSIGNED },
        });
      }
    }

    return prisma.driver.update({
      where: { id },
      data: updateData,
      include: { assignedVehicle: true, supplier: true },
    });
  }

  static async assignVehicle(driverId: string, vehicleId: string | null) {
    return this.updateDriver(driverId, { assignedVehicleId: vehicleId });
  }

  static async addDocument(driverId: string, docData: any) {
    await this.getDriverById(driverId);
    return prisma.driverDocument.create({
      data: {
        driverId,
        documentType: docData.documentType,
        documentNumber: docData.documentNumber,
        issueDate: docData.issueDate ? new Date(docData.issueDate) : null,
        expiryDate: docData.expiryDate ? new Date(docData.expiryDate) : null,
        fileUrl: docData.fileUrl,
      },
    });
  }

  static async deleteDriver(id: string) {
    const driver = await this.getDriverById(id);

    // If driver had an assigned vehicle, return vehicle to AVAILABLE
    if (driver.assignedVehicleId) {
      await prisma.vehicle.update({
        where: { id: driver.assignedVehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });
    }

    // Clear route default driver references
    await prisma.route.updateMany({
      where: { defaultDriverId: id },
      data: { defaultDriverId: null },
    });

    // Delete driver documents
    await prisma.driverDocument.deleteMany({
      where: { driverId: id },
    });

    // Delete any associated trips
    await prisma.trip.deleteMany({
      where: { driverId: id },
    });

    return prisma.driver.delete({
      where: { id },
    });
  }

  static async getExpiringLicenses() {
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

    return prisma.driver.findMany({
      where: {
        licenseExpirationDate: { lte: thirtyDaysAhead },
      },
      include: { assignedVehicle: true },
      orderBy: { licenseExpirationDate: 'asc' },
    });
  }
}