import { prisma } from '../../prisma.js';
import { NotFoundError, ValidationError } from '../../types/index.js';
import { TripConflictEngine } from './trip.conflict-engine.js';
import { TripStatus, ShiftType, VehicleStatus, DutyStatus } from '@prisma/client';
import { AccountingService } from '../accounting/accounting.service.js';

export class TripService {
  static async getAllTrips(params?: {
    date?: string;
    clientId?: string;
    status?: TripStatus;
    shift?: ShiftType;
    driverId?: string;
    vehicleId?: string;
    limit?: number;
    page?: number;
  }) {
    const where: any = {};
    if (params?.date) {
      const dateObj = new Date(params.date);
      where.tripDate = dateObj;
    }
    if (params?.clientId) where.clientId = params.clientId;
    if (params?.status) where.tripStatus = params.status;
    if (params?.shift) where.shift = params.shift;
    if (params?.driverId) where.driverId = params.driverId;
    if (params?.vehicleId) where.vehicleId = params.vehicleId;

    const limit = params?.limit ? Math.max(1, Number(params.limit)) : undefined;
    const page = params?.page ? Math.max(1, Number(params.page)) : 1;
    const skip = limit && page ? (page - 1) * limit : undefined;

    return prisma.trip.findMany({
      where,
      take: limit,
      skip,
      include: {
        client: { select: { id: true, companyName: true } },
        contract: { select: { id: true, contractNumber: true } },
        supplier: { select: { id: true, name: true, phone: true } },
        route: {
          select: {
            id: true,
            routeName: true,
            startLocation: true,
            finalDestination: true,
            clientPricePerTrip: true,
            supplierCostPerTrip: true,
            driverTripAllowance: true,
            executionType: true,
            supplierId: true,
            supplier: { select: { id: true, name: true } },
          },
        },
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true, capacity: true, supplierId: true } },
        driver: { select: { id: true, fullName: true, phoneNumber: true, supplierId: true } },
      },
      orderBy: { scheduledDeparture: 'desc' },
    });
  }

  static async getTripById(id: string) {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        client: true,
        contract: true,
        supplier: true,
        route: {
          include: {
            stops: { orderBy: { stopOrder: 'asc' } },
            supplier: true,
          },
        },
        vehicle: true,
        driver: true,
      },
    });

    if (!trip) throw new NotFoundError('Trip not found');
    return trip;
  }

  static async createTrip(data: any) {
    const tripDate = new Date(data.tripDate);
    const scheduledDeparture = new Date(data.scheduledDeparture);
    const expectedArrival = new Date(data.expectedArrival);

    if (expectedArrival <= scheduledDeparture) {
      throw new ValidationError('Expected arrival time must be after scheduled departure time');
    }

    // Run Conflict Detection & 1:1 Pairing Validation
    await TripConflictEngine.validateTripAssignment({
      driverId: data.driverId,
      vehicleId: data.vehicleId,
      tripDate,
      scheduledDeparture,
      expectedArrival,
    });

    // Fetch Route, Vehicle, Driver details for pricing and supplier linkage
    const [route, vehicle, driver] = await Promise.all([
      prisma.route.findUnique({ where: { id: data.routeId } }),
      prisma.vehicle.findUnique({ where: { id: data.vehicleId } }),
      prisma.driver.findUnique({ where: { id: data.driverId } }),
    ]);

    const saleAmount = data.saleAmount !== undefined ? Number(data.saleAmount) : Number(route?.clientPricePerTrip || 0);
    const costAmount = data.costAmount !== undefined ? Number(data.costAmount) : Number(route?.supplierCostPerTrip || 0);
    const executionType = data.executionType || route?.executionType || (data.supplierId || vehicle?.supplierId || driver?.supplierId ? 'SUPPLIER' : 'COMPANY');
    const supplierId = data.supplierId || route?.supplierId || vehicle?.supplierId || driver?.supplierId || null;
    const driverAllowance = data.driverAllowance !== undefined ? Number(data.driverAllowance) : Number(route?.driverTripAllowance || 0);
    const vehicleCost = data.vehicleCost !== undefined ? Number(data.vehicleCost) : Number(route?.vehicleRentalCost || 0);
    const contractId = data.contractId || null;

    // Generate unique Trip Number: TRIP-YYYYMMDD-XXXX
    let tripNumber = data.tripNumber;
    if (!tripNumber) {
      const countToday = await prisma.trip.count({ where: { tripDate } });
      const dateCode = tripDate.toISOString().slice(0, 10).replace(/-/g, '');
      tripNumber = `TRIP-${dateCode}-${String(countToday + 1).padStart(3, '0')}`;
    }

    const trip = await prisma.trip.create({
      data: {
        tripNumber,
        clientId: data.clientId,
        contractId,
        routeId: data.routeId,
        driverId: data.driverId,
        vehicleId: data.vehicleId,
        executionType,
        supplierId,
        saleAmount,
        costAmount,
        driverAllowance,
        vehicleCost,
        tripDate,
        shift: data.shift,
        scheduledDeparture,
        expectedArrival,
        notes: data.notes,
        tripStatus: data.tripStatus || TripStatus.SCHEDULED,
      },
      include: {
        client: true,
        route: true,
        vehicle: true,
        driver: true,
      },
    });

    if (trip.tripStatus === TripStatus.COMPLETED && !data.skipFinancialSync) {
      await AccountingService.syncTripToFinancials(trip.id).catch(console.error);
    }

    return trip;
  }

  static async updateTrip(id: string, data: any) {
    const current = await this.getTripById(id);

    const tripDate = data.tripDate ? new Date(data.tripDate) : current.tripDate;
    const scheduledDeparture = data.scheduledDeparture ? new Date(data.scheduledDeparture) : current.scheduledDeparture;
    const expectedArrival = data.expectedArrival ? new Date(data.expectedArrival) : current.expectedArrival;
    const driverId = data.driverId || current.driverId;
    const vehicleId = data.vehicleId || current.vehicleId;

    if (expectedArrival <= scheduledDeparture) {
      throw new ValidationError('Expected arrival must be after scheduled departure');
    }

    // Validate conflicts and pairing
    await TripConflictEngine.validateTripAssignment({
      driverId,
      vehicleId,
      tripDate,
      scheduledDeparture,
      expectedArrival,
      excludeTripId: id,
    });

    const updated = await prisma.trip.update({
      where: { id },
      data: {
        ...data,
        tripDate,
        scheduledDeparture,
        expectedArrival,
      },
      include: {
        client: true,
        route: true,
        vehicle: true,
        driver: true,
      },
    });

    if (updated.tripStatus === TripStatus.COMPLETED) {
      await AccountingService.syncTripToFinancials(id).catch(console.error);
    }

    return updated;
  }

  static async updateTripStatus(id: string, data: { tripStatus: TripStatus; actualDeparture?: any; actualArrival?: any; notes?: string }) {
    const current = await this.getTripById(id);

    const updateData: any = {
      tripStatus: data.tripStatus,
      notes: data.notes !== undefined ? data.notes : current.notes,
    };

    if (data.actualDeparture) updateData.actualDeparture = new Date(data.actualDeparture);
    if (data.actualArrival) updateData.actualArrival = new Date(data.actualArrival);

    // Auto timestamp on status transitions if not provided
    if (data.tripStatus === TripStatus.IN_PROGRESS && !updateData.actualDeparture && !current.actualDeparture) {
      updateData.actualDeparture = new Date();
    }
    if (data.tripStatus === TripStatus.COMPLETED && !updateData.actualArrival && !current.actualArrival) {
      updateData.actualArrival = new Date();
    }

    const updated = await prisma.trip.update({
      where: { id },
      data: updateData,
      include: { client: true, route: true, vehicle: true, driver: true },
    });

    // Update fleet & driver real-time status
    if (data.tripStatus === TripStatus.IN_PROGRESS) {
      await prisma.vehicle.update({ where: { id: current.vehicleId }, data: { status: VehicleStatus.ON_TRIP } });
      await prisma.driver.update({ where: { id: current.driverId }, data: { dutyStatus: DutyStatus.ON_DUTY } });
    } else if (data.tripStatus === TripStatus.COMPLETED || data.tripStatus === TripStatus.CANCELLED) {
      await prisma.vehicle.update({ where: { id: current.vehicleId }, data: { status: VehicleStatus.ASSIGNED } });
      await prisma.driver.update({ where: { id: current.driverId }, data: { dutyStatus: DutyStatus.AVAILABLE } });
    }

    // Real-time synchronization to Accounting ledger (DailyOperation & Client/Supplier Ledgers)
    if (data.tripStatus === TripStatus.COMPLETED) {
      await AccountingService.syncTripToFinancials(id).catch(console.error);
    } else if (data.tripStatus === TripStatus.CANCELLED || (current.tripStatus as string) === 'COMPLETED') {
      await AccountingService.removeTripFromFinancials(id).catch(console.error);
    }

    return updated;
  }

  static async batchGenerateTrips(params: {
    routeId: string;
    startDate: Date;
    endDate: Date;
    shifts: ShiftType[];
    departureTime: string; // "HH:MM"
    durationMinutes: number;
  }) {
    const route = await prisma.route.findUnique({
      where: { id: params.routeId },
      include: { defaultVehicle: true, defaultDriver: { include: { assignedVehicle: true } }, client: { include: { contracts: true } } },
    });

    if (!route) throw new NotFoundError('Route not found');
    if (!route.defaultDriverId || !route.defaultVehicleId) {
      throw new ValidationError('Route must have a default driver and vehicle assigned to generate recurring trips.');
    }

    const activeContract = route.client.contracts?.find((c) => c.status === 'ACTIVE');

    const createdTrips: any[] = [];
    const skippedDays: any[] = [];

    const [depHour, depMin] = params.departureTime.split(':').map(Number);
    const curr = new Date(params.startDate);
    const end = new Date(params.endDate);

    while (curr <= end) {
      for (const shift of params.shifts) {
        const tripDate = new Date(curr);
        const depTime = new Date(curr);
        depTime.setHours(depHour, depMin, 0, 0);

        const arrTime = new Date(depTime.getTime() + params.durationMinutes * 60000);

        try {
          const trip = await this.createTrip({
            clientId: route.clientId,
            contractId: activeContract?.id || null,
            routeId: route.id,
            driverId: route.defaultDriverId,
            vehicleId: route.defaultVehicleId,
            tripDate,
            shift,
            scheduledDeparture: depTime,
            expectedArrival: arrTime,
            notes: `Auto-generated recurring trip for shift ${shift}`,
          });
          createdTrips.push(trip);
        } catch (err: any) {
          skippedDays.push({
            date: curr.toISOString().split('T')[0],
            shift,
            reason: err.message,
          });
        }
      }
      curr.setDate(curr.getDate() + 1);
    }

    return {
      generatedCount: createdTrips.length,
      skippedCount: skippedDays.length,
      skippedDetails: skippedDays,
    };
  }

  static async generateDailyTripsFromTemplates(params: {
    date: string | Date;
    clientId?: string;
    shifts?: ShiftType[];
    shift?: ShiftType;
    departureTime?: string;
    tripStatus?: TripStatus;
    routeOverrides?: Array<{
      routeId: string;
      selected?: boolean;
      driverId?: string;
      vehicleId?: string;
      shift?: ShiftType;
      departureTime?: string;
      saleAmount?: number;
      costAmount?: number;
      driverAllowance?: number;
      vehicleCost?: number;
      executionType?: string;
    }>;
  }) {
    const targetDate = new Date(params.date);
    const defaultTripStatus = params.tripStatus || TripStatus.COMPLETED;
    const shiftsToGenerate: ShiftType[] = params.shifts && params.shifts.length > 0
      ? params.shifts
      : (params.shift ? [params.shift] : [ShiftType.MORNING]);

    // High performance batch pre-fetching
    const [routes, existingTrips, initialTodayCount] = await Promise.all([
      prisma.route.findMany({
        where: {
          isActive: true,
          ...(params.clientId ? { clientId: params.clientId } : {}),
        },
        include: {
          client: true,
          defaultVehicle: true,
          defaultDriver: true,
          supplier: true,
        },
      }),
      prisma.trip.findMany({
        where: {
          tripDate: targetDate,
          tripStatus: { not: TripStatus.CANCELLED },
        },
        select: { routeId: true, shift: true },
      }),
      prisma.trip.count({ where: { tripDate: targetDate } }),
    ]);

    const existingSet = new Set(existingTrips.map((t) => `${t.routeId}_${t.shift}`));
    const dateCode = targetDate.toISOString().slice(0, 10).replace(/-/g, '');
    let currentCount = initialTodayCount;

    const createdTrips: any[] = [];
    const skippedRoutes: any[] = [];

    for (const route of routes) {
      const override = params.routeOverrides?.find((o) => o.routeId === route.id);
      if (override && override.selected === false) {
        // User explicitly unchecked / excluded this route from today's run
        continue;
      }

      const effectiveDriverId = override?.driverId || route.defaultDriverId;
      const effectiveVehicleId = override?.vehicleId || route.defaultVehicleId;

      if (!effectiveDriverId || !effectiveVehicleId) {
        skippedRoutes.push({
          routeId: route.id,
          routeName: route.routeName,
          reason: 'Route does not have a valid driver or vehicle assigned',
        });
        continue;
      }

      const shiftsForRoute = override?.shift ? [override.shift] : shiftsToGenerate;

      for (const shift of shiftsForRoute) {
        const tripKey = `${route.id}_${shift}`;
        if (existingSet.has(tripKey)) {
          skippedRoutes.push({
            routeId: route.id,
            routeName: route.routeName,
            shift,
            reason: `Trip already exists for date ${targetDate.toISOString().split('T')[0]} and shift ${shift}`,
          });
          continue;
        }

        let depHour = 7;
        let depMin = 0;

        const effectiveDepartureTime = override?.departureTime || params.departureTime;
        if (effectiveDepartureTime) {
          const [h, m] = effectiveDepartureTime.split(':').map(Number);
          depHour = isNaN(h) ? 7 : h;
          depMin = isNaN(m) ? 0 : m;
        } else {
          switch (shift) {
            case ShiftType.MORNING:
              depHour = 7;
              depMin = 0;
              break;
            case ShiftType.AFTERNOON:
              depHour = 15;
              depMin = 0;
              break;
            case ShiftType.NIGHT:
              depHour = 23;
              depMin = 0;
              break;
            default:
              depHour = 8;
              depMin = 0;
          }
        }

        const scheduledDeparture = new Date(targetDate);
        scheduledDeparture.setHours(depHour, depMin, 0, 0);

        const durationMinutes = route.estimatedDurationMin || 60;
        const expectedArrival = new Date(scheduledDeparture.getTime() + durationMinutes * 60000);

        const saleAmount = override?.saleAmount !== undefined ? Number(override.saleAmount) : Number(route.clientPricePerTrip || 0);
        const costAmount = override?.costAmount !== undefined ? Number(override.costAmount) : Number(route.supplierCostPerTrip || 0);
        const driverAllowance = override?.driverAllowance !== undefined ? Number(override.driverAllowance) : Number(route.driverTripAllowance || 0);
        const vehicleCost = override?.vehicleCost !== undefined ? Number(override.vehicleCost) : Number(route.vehicleRentalCost || 0);
        const executionType = override?.executionType || route.executionType;

        currentCount++;
        const tripNumber = `TRIP-${dateCode}-${String(currentCount).padStart(3, '0')}`;

        try {
          const trip = await this.createTrip({
            tripNumber,
            clientId: route.clientId,
            contractId: null,
            routeId: route.id,
            driverId: effectiveDriverId,
            vehicleId: effectiveVehicleId,
            executionType,
            supplierId: route.supplierId,
            saleAmount,
            costAmount,
            driverAllowance,
            vehicleCost,
            tripDate: targetDate,
            shift,
            scheduledDeparture,
            expectedArrival,
            notes: `Auto-generated from route template: ${route.routeName}`,
            tripStatus: defaultTripStatus,
            skipFinancialSync: true, // Will batch sync below for speed
          });

          existingSet.add(tripKey);
          createdTrips.push(trip);
        } catch (err: any) {
          currentCount--; // Revert count increment on failure
          skippedRoutes.push({
            routeId: route.id,
            routeName: route.routeName,
            shift,
            reason: err.message || 'Failed to create trip due to conflict or validation error',
          });
        }
      }
    }

    // High speed batch financial synchronization
    if (defaultTripStatus === TripStatus.COMPLETED && createdTrips.length > 0) {
      await Promise.allSettled(
        createdTrips.map((trip) => AccountingService.syncTripToFinancials(trip.id))
      );
    }

    return {
      totalRoutes: routes.length,
      generatedCount: createdTrips.length,
      skippedCount: skippedRoutes.length,
      trips: createdTrips,
      skippedDetails: skippedRoutes,
    };
  }

  static async deleteTrip(id: string) {
    const trip = await this.getTripById(id);
    if (trip.tripStatus === TripStatus.IN_PROGRESS) {
      await prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { status: VehicleStatus.ASSIGNED } }).catch(() => {});
      await prisma.driver.update({ where: { id: trip.driverId }, data: { dutyStatus: DutyStatus.AVAILABLE } }).catch(() => {});
    }
    await AccountingService.removeTripFromFinancials(id).catch(console.error);
    return prisma.trip.delete({ where: { id } });
  }
}