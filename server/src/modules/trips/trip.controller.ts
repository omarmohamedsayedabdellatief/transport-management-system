import { Request, Response, NextFunction } from 'express';
import { TripService } from './trip.service.js';
import { TripConflictEngine } from './trip.conflict-engine.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { sendSuccess } from '../../utils/response.js';

export class TripController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, clientId, status, shift, driverId, vehicleId, limit, page } = req.query;
      const trips = await TripService.getAllTrips({
        date: date as string,
        clientId: clientId as string,
        status: status as any,
        shift: shift as any,
        driverId: driverId as string,
        vehicleId: vehicleId as string,
        limit: limit ? Number(limit) : undefined,
        page: page ? Number(page) : undefined,
      });
      sendSuccess(res, trips);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const trip = await TripService.getTripById(id);
      sendSuccess(res, trip);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trip = await TripService.createTrip(req.body);
      sendSuccess(res, trip, 'Trip scheduled successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await TripService.updateTrip(id, req.body);
      sendSuccess(res, updated, 'Trip updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await TripService.updateTripStatus(id, req.body);
      sendSuccess(res, updated, 'Trip status updated');
    } catch (err) {
      next(err);
    }
  }

  static async checkConflict(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { driverId, vehicleId, tripDate, scheduledDeparture, expectedArrival, excludeTripId } = req.body;
      await TripConflictEngine.validateTripAssignment({
        driverId,
        vehicleId,
        tripDate: new Date(tripDate),
        scheduledDeparture: new Date(scheduledDeparture),
        expectedArrival: new Date(expectedArrival),
        excludeTripId,
      });
      sendSuccess(res, { hasConflict: false, message: 'Vehicle and Driver are available with no conflicts.' });
    } catch (err) {
      next(err);
    }
  }

  static async batchGenerate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { routeId, startDate, endDate, shifts, departureTime, durationMinutes } = req.body;
      const result = await TripService.batchGenerateTrips({
        routeId, billingTypeId:req.body.billingTypeId, direction:req.body.direction,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        shifts,
        departureTime,
        durationMinutes: durationMinutes || 60,
      });
      sendSuccess(res, result, 'Batch generation completed');
    } catch (err) {
      next(err);
    }
  }

  static async generateDailyFromTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, clientId, shifts, shift, departureTime, tripStatus, routeOverrides } = req.body;
      const result = await TripService.generateDailyTripsFromTemplates({
        date: new Date(date),
        clientId,
        shifts,
        shift,
        departureTime,
        tripStatus,
        routeOverrides,
        actorId: (req as AuthenticatedRequest).user!.userId,
      });
      sendSuccess(res, result, 'Daily trips generation from route templates completed');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await TripService.deleteTrip(id);
      sendSuccess(res, null, 'Trip deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}