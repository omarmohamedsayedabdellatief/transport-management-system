import { prisma } from '../../prisma.js';
import { ConflictError, ValidationError } from '../../types/index.js';
import { VehicleStatus, DutyStatus } from '@prisma/client';

export class TripConflictEngine {
  /**
   * Validates pairing, compliance, and temporal overlap for a prospective trip
   */
  static async validateTripAssignment(params: {
    driverId: string;
    vehicleId: string;
    tripDate: Date;
    scheduledDeparture: Date;
    expectedArrival: Date;
    excludeTripId?: string;
  }) {
    const { driverId, vehicleId, tripDate, scheduledDeparture, expectedArrival, excludeTripId } = params;

    // 1. DRIVER-VEHICLE 1:1 PAIRING VALIDATION
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { assignedVehicle: true },
    });

    if (!driver) {
      throw new ValidationError('Driver not found');
    }

    if (!driver.assignedVehicleId) {
      throw new ValidationError(
        `Driver ${driver.fullName} does not have a permanently assigned vehicle. Please assign a vehicle to this driver first.`
      );
    }

    if (driver.assignedVehicleId !== vehicleId) {
      throw new ValidationError(
        `Pairing Mismatch: Driver ${driver.fullName} is dedicated to vehicle ${driver.assignedVehicle?.plateNumber}. Trip must use this assigned vehicle.`
      );
    }

    // 2. DRIVER COMPLIANCE VALIDATION
    if (driver.dutyStatus === DutyStatus.SUSPENDED || driver.dutyStatus === DutyStatus.OFF_DUTY) {
      throw new ValidationError(
        `Driver ${driver.fullName} cannot be assigned (Duty Status: ${driver.dutyStatus}).`
      );
    }

    if (new Date(driver.licenseExpirationDate) < tripDate) {
      throw new ValidationError(
        `Driver ${driver.fullName} has an expired driving license (Expired on: ${new Date(driver.licenseExpirationDate).toISOString().split('T')[0]}).`
      );
    }

    // 3. VEHICLE COMPLIANCE VALIDATION
    const vehicle = driver.assignedVehicle || (await prisma.vehicle.findUnique({ where: { id: vehicleId } }));
    if (!vehicle) {
      throw new ValidationError('Vehicle not found');
    }

    if (
      vehicle.status === VehicleStatus.UNDER_MAINTENANCE ||
      vehicle.status === VehicleStatus.OUT_OF_SERVICE
    ) {
      throw new ValidationError(
        `Vehicle ${vehicle.plateNumber} is currently ${vehicle.status.replace('_', ' ')} and cannot be dispatched.`
      );
    }

    if (new Date(vehicle.insuranceExpiry) < tripDate) {
      throw new ValidationError(`Vehicle ${vehicle.plateNumber} has expired insurance.`);
    }

    if (new Date(vehicle.inspectionExpiry) < tripDate) {
      throw new ValidationError(`Vehicle ${vehicle.plateNumber} has overdue periodic inspection.`);
    }

    // 4. TEMPORAL OVERLAP CHECK (with 20-minute turnaround buffer)
    const BUFFER_MS = 20 * 60 * 1000;
    const effectiveStart = new Date(scheduledDeparture.getTime() - BUFFER_MS);
    const effectiveEnd = new Date(expectedArrival.getTime() + BUFFER_MS);

    const conflictingTrip = await prisma.trip.findFirst({
      where: {
        tripStatus: { not: 'CANCELLED' },
        id: excludeTripId ? { not: excludeTripId } : undefined,
        OR: [{ driverId }, { vehicleId }],
        AND: [
          { scheduledDeparture: { lt: effectiveEnd } },
          { expectedArrival: { gt: effectiveStart } },
        ],
      },
      include: {
        driver: { select: { fullName: true } },
        vehicle: { select: { plateNumber: true } },
      },
    });

    if (conflictingTrip) {
      throw new ConflictError(
        `Temporal Conflict: Vehicle ${conflictingTrip.vehicle.plateNumber} / Driver ${conflictingTrip.driver.fullName} is already assigned to active Trip #${conflictingTrip.tripNumber} between ${conflictingTrip.scheduledDeparture.toISOString().substring(11, 16)} and ${conflictingTrip.expectedArrival.toISOString().substring(11, 16)} (including 20m buffer).`,
        { conflictingTripId: conflictingTrip.id }
      );
    }

    return true;
  }
}