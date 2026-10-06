import { prisma } from '../../prisma.js';
import { NotFoundError, ConflictError } from '../../types/index.js';

export class RouteService {
  static async getAllRoutes(params?: { clientId?: string; isActive?: boolean; summary?: boolean }) {
    const where: any = {};
    if (params?.clientId) where.clientId = params.clientId;
    if (params?.isActive !== undefined) where.isActive = params.isActive;

    if (params?.summary) {
      return prisma.route.findMany({
        where,
        select: {
          id: true,
          routeName: true,
          rates: {include:{billingType:true}},
          startLocation: true,
          finalDestination: true,
          clientPricePerTrip: true,
          supplierCostPerTrip: true,
          driverTripAllowance: true,
          vehicleRentalCost: true,
          executionType: true,
          clientId: true,
          supplierId: true,
          defaultVehicleId: true,
          defaultDriverId: true,
          isActive: true,
          client: { select: { id: true, companyName: true } },
          supplier: { select: { id: true, name: true } },
          defaultVehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
          defaultDriver: { select: { id: true, fullName: true, phoneNumber: true } },
          _count: { select: { stops: true, trips: true } },
        },
        orderBy: { routeName: 'asc' },
      });
    }

    return prisma.route.findMany({
      where,
      include: {
        rates: {include:{billingType:true}},
        client: { select: { id: true, companyName: true } },
        supplier: { select: { id: true, name: true, phone: true } },
        defaultVehicle: { include: { supplier: true } },
        defaultDriver: { include: { supplier: true } },
        stops: { orderBy: { stopOrder: 'asc' } },
        _count: { select: { stops: true, trips: true } },
      },
      orderBy: { routeName: 'asc' },
    });
  }

  static async getRouteById(id: string) {
    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        rates: {include:{billingType:true}},
        client: true,
        supplier: true,
        defaultVehicle: { include: { assignedDriver: true, supplier: true } },
        defaultDriver: { include: { assignedVehicle: true, supplier: true } },
        stops: { orderBy: { stopOrder: 'asc' } },
      },
    });

    if (!route) throw new NotFoundError('Route not found');
    return route;
  }

  static async createRoute(data: any) {
    const { stops, ...routeData } = data;

    return prisma.$transaction(async tx => {
    const created = await tx.route.create({
      data: {
        ...routeData,
        stops: stops?.length
          ? {
              create: stops.map((s: any) => ({
                stopOrder: s.stopOrder,
                stopName: s.stopName,
                pickupTimeOffsetMin: s.pickupTimeOffsetMin || 0,
                latitude: s.latitude,
                longitude: s.longitude,
                notes: s.notes,
              })),
            }
          : undefined,
      },
      include: {
        rates: {include:{billingType:true}},
        client: true,
        stops: { orderBy: { stopOrder: 'asc' } },
        defaultVehicle: true,
        defaultDriver: true,
      },
    });
    await tx.routeRate.create({data:{routeId:created.id,billingTypeId:'10000000-0000-4000-a000-000000000001',departureTime:'07:00',saleAmount:created.clientPricePerTrip,costAmount:created.supplierCostPerTrip,driverAllowance:created.driverTripAllowance,vehicleCost:created.vehicleRentalCost}});
    return tx.route.findUnique({where:{id:created.id},include:{rates:{include:{billingType:true}},client:true,stops:{orderBy:{stopOrder:"asc"}},defaultVehicle:true,defaultDriver:true}});
    });
  }

  static async updateRoute(id: string, data: any) {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;
      const current = await tx.route.findUnique({ where: { id }, include: { stops: true } });
      if (!current) throw new NotFoundError('Route not found');
      const { stops, ...routeData } = data;
      if (data.clientId && data.clientId !== current.clientId && (await tx.enrollment.count({ where: { routeId: id } }) || await tx.servicePlan.count({ where: { routeId: id } }) || await tx.trip.count({ where: { routeId: id } })))
        throw new ConflictError('This route has enrollments or services. Create a new route for another client.');
      const stopNames = [...(stops || current.stops).map((s: any) => s.stopName), data.startLocation || current.startLocation, data.finalDestination || current.finalDestination];
      if (await tx.enrollment.count({ where: { routeId: id, active: true, stopName: { notIn: stopNames } } }))
        throw new ConflictError('Move active passenger enrollments before removing their stop.');
      if (stops) {
        await tx.routeStop.deleteMany({ where: { routeId: id } });
        if (stops.length) await tx.routeStop.createMany({ data: stops.map((s: any, index: number) => ({ routeId: id, stopOrder: s.stopOrder || index + 1, stopName: s.stopName, pickupTimeOffsetMin: s.pickupTimeOffsetMin || 0, latitude: s.latitude, longitude: s.longitude, notes: s.notes })) });
      }
      const mapping = {clientPricePerTrip:'saleAmount',supplierCostPerTrip:'costAmount',driverTripAllowance:'driverAllowance',vehicleRentalCost:'vehicleCost'};
      const prices=Object.fromEntries(Object.entries(mapping).filter(([key])=>routeData[key]!==undefined).map(([key,target])=>[target,routeData[key]]));
      if(Object.keys(prices).length) await tx.routeRate.updateMany({where:{routeId:id,billingTypeId:'10000000-0000-4000-a000-000000000001'},data:prices});
      return tx.route.update({ where: { id }, data: routeData, include: { rates: {include:{billingType:true}},
        client: true, stops: { orderBy: { stopOrder: 'asc' } }, defaultVehicle: true, defaultDriver: true } });
    });
  }

  static async deleteRoute(id: string) {
    await this.getRouteById(id);
    if (await prisma.trip.count({ where: { routeId: id } }) || await prisma.enrollment.count({ where: { routeId: id } }) || await prisma.servicePlan.count({ where: { routeId: id } })) throw new ConflictError("Keep routes with enrollments or services. Deactivate the route instead.");
    await prisma.routeStop.deleteMany({ where: { routeId: id } });
    return prisma.route.delete({ where: { id } });
  }
}