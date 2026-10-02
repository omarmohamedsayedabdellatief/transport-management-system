import { prisma } from '../../prisma.js';
import { VehicleStatus, DutyStatus, ClientStatus, ContractStatus, TripStatus } from '@prisma/client';

export class DashboardService {
  static async getOverviewKPIs() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const minTripDate = new Date(Math.min(todayStart.getTime(), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)).getTime()));
    const maxTripDate = new Date(Math.max(todayEnd.getTime(), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).getTime()));

    const thirtyDaysAhead = new Date(todayEnd);
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

    const [
      vehicleAgg,
      driverAgg,
      contractAgg,
      clientAgg,
      tripAgg,
    ] = await Promise.all([
      prisma.$queryRaw<Array<{
        total: number;
        available: number;
        assigned: number;
        underMaintenance: number;
        expiredDocs: number;
        expiringDocs: number;
      }>>`
        SELECT 
          COUNT(*)::int AS "total",
          COUNT(CASE WHEN "status" = 'AVAILABLE' THEN 1 END)::int AS "available",
          COUNT(CASE WHEN "status" IN ('ASSIGNED', 'ON_TRIP') THEN 1 END)::int AS "assigned",
          COUNT(CASE WHEN "status" = 'UNDER_MAINTENANCE' THEN 1 END)::int AS "underMaintenance",
          COUNT(CASE WHEN ("insurance_expiry" < ${minTripDate} OR "license_expiry" < ${minTripDate} OR "inspection_expiry" < ${minTripDate}) THEN 1 END)::int AS "expiredDocs",
          COUNT(CASE WHEN NOT ("insurance_expiry" < ${minTripDate} OR "license_expiry" < ${minTripDate} OR "inspection_expiry" < ${minTripDate}) 
                     AND ("insurance_expiry" <= ${thirtyDaysAhead} OR "license_expiry" <= ${thirtyDaysAhead} OR "inspection_expiry" <= ${thirtyDaysAhead}) THEN 1 END)::int AS "expiringDocs"
        FROM "vehicles"
      `,
      prisma.$queryRaw<Array<{
        total: number;
        available: number;
        assigned: number;
        expiredLicenses: number;
        expiringLicenses: number;
      }>>`
        SELECT 
          COUNT(*)::int AS "total",
          COUNT(CASE WHEN "duty_status" = 'AVAILABLE' THEN 1 END)::int AS "available",
          COUNT(CASE WHEN "duty_status" IN ('ASSIGNED', 'ON_DUTY') THEN 1 END)::int AS "assigned",
          COUNT(CASE WHEN "license_expiration_date" < ${minTripDate} THEN 1 END)::int AS "expiredLicenses",
          COUNT(CASE WHEN "license_expiration_date" >= ${minTripDate} AND "license_expiration_date" <= ${thirtyDaysAhead} THEN 1 END)::int AS "expiringLicenses"
        FROM "drivers"
      `,
      prisma.$queryRaw<Array<{
        active: number;
        expiredContracts: number;
        expiringContracts: number;
      }>>`
        SELECT 
          COUNT(CASE WHEN "status" = 'ACTIVE' THEN 1 END)::int AS "active",
          COUNT(CASE WHEN "status" = 'ACTIVE' AND "end_date" < ${minTripDate} THEN 1 END)::int AS "expiredContracts",
          COUNT(CASE WHEN "status" = 'ACTIVE' AND "end_date" >= ${minTripDate} AND "end_date" <= ${thirtyDaysAhead} THEN 1 END)::int AS "expiringContracts"
        FROM "contracts"
      `,
      prisma.$queryRaw<Array<{
        active: number;
      }>>`
        SELECT COUNT(CASE WHEN "status" = 'ACTIVE' THEN 1 END)::int AS "active"
        FROM "clients"
      `,
      prisma.$queryRaw<Array<{
        total: number;
        completed: number;
        inProgress: number;
        scheduled: number;
      }>>`
        SELECT 
          COUNT(*)::int AS "total",
          COUNT(CASE WHEN "trip_status" = 'COMPLETED' THEN 1 END)::int AS "completed",
          COUNT(CASE WHEN "trip_status" = 'IN_PROGRESS' THEN 1 END)::int AS "inProgress",
          COUNT(CASE WHEN "trip_status" = 'SCHEDULED' THEN 1 END)::int AS "scheduled"
        FROM "trips"
        WHERE "trip_date" >= ${minTripDate} AND "trip_date" <= ${maxTripDate}
      `,
    ]);

    const vStats = vehicleAgg[0] || { total: 0, available: 0, assigned: 0, underMaintenance: 0, expiredDocs: 0, expiringDocs: 0 };
    const dStats = driverAgg[0] || { total: 0, available: 0, assigned: 0, expiredLicenses: 0, expiringLicenses: 0 };
    const cStats = contractAgg[0] || { active: 0, expiredContracts: 0, expiringContracts: 0 };
    const clStats = clientAgg[0] || { active: 0 };
    const tStats = tripAgg[0] || { total: 0, completed: 0, inProgress: 0, scheduled: 0 };

    return {
      vehicles: {
        total: Number(vStats.total || 0),
        available: Number(vStats.available || 0),
        assigned: Number(vStats.assigned || 0),
        underMaintenance: Number(vStats.underMaintenance || 0),
      },
      drivers: {
        total: Number(dStats.total || 0),
        available: Number(dStats.available || 0),
        assigned: Number(dStats.assigned || 0),
      },
      clients: {
        active: Number(clStats.active || 0),
      },
      contracts: {
        active: Number(cStats.active || 0),
        expiringSoon: Number(cStats.expiringContracts || 0),
      },
      tripsToday: {
        total: Number(tStats.total || 0),
        completed: Number(tStats.completed || 0),
        inProgress: Number(tStats.inProgress || 0),
        scheduled: Number(tStats.scheduled || 0),
      },
      alerts: {
        expiredDriverLicenses: Number(dStats.expiredLicenses || 0),
        expiringDriverLicenses: Number(dStats.expiringLicenses || 0),
        expiredVehicleDocs: Number(vStats.expiredDocs || 0),
        expiringVehicleDocs: Number(vStats.expiringDocs || 0),
        expiredContracts: Number(cStats.expiredContracts || 0),
        expiringContracts: Number(cStats.expiringContracts || 0),
      },
    };
  }

  static async getWeeklyTripTrends() {
    const now = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push(`${year}-${month}-${day}`);
    }

    const startDateLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const minQueryDate = new Date(Math.min(
      startDateLocal.getTime(),
      new Date(`${days[0]}T00:00:00.000Z`).getTime()
    ));

    const trips = await prisma.trip.findMany({
      where: { tripDate: { gte: minQueryDate } },
      select: { tripDate: true, tripStatus: true },
    });

    const daysMap: Record<string, { date: string; completed: number; scheduled: number; cancelled: number }> = {};
    for (const dStr of days) {
      daysMap[dStr] = { date: dStr, completed: 0, scheduled: 0, cancelled: 0 };
    }

    trips.forEach((t) => {
      const year = t.tripDate.getFullYear();
      const month = String(t.tripDate.getMonth() + 1).padStart(2, '0');
      const day = String(t.tripDate.getDate()).padStart(2, '0');
      const localStr = `${year}-${month}-${day}`;
      const utcStr = t.tripDate.toISOString().split('T')[0];

      const key = daysMap[localStr] ? localStr : (daysMap[utcStr] ? utcStr : null);
      if (key && daysMap[key]) {
        if (t.tripStatus === TripStatus.COMPLETED) daysMap[key].completed++;
        else if (t.tripStatus === TripStatus.CANCELLED) daysMap[key].cancelled++;
        else daysMap[key].scheduled++;
      }
    });

    return Object.values(daysMap);
  }

  static async getFleetUtilizationReport() {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        supplier: { select: { id: true, name: true } },
        assignedDriver: { select: { fullName: true } },
        _count: { select: { trips: true, maintenanceRecords: true } },
        trips: {
          where: { tripStatus: TripStatus.COMPLETED },
          select: { id: true },
        },
        maintenanceRecords: {
          select: { cost: true, downtimeHours: true },
        },
      },
    });

    return vehicles.map((v) => {
      const totalMaintCost = v.maintenanceRecords.reduce((s, m) => s + Number(m.cost), 0);
      const totalDowntime = v.maintenanceRecords.reduce((s, m) => s + Number(m.downtimeHours), 0);

      return {
        vehicleId: v.id,
        plateNumber: v.plateNumber,
        make: v.make,
        model: v.model,
        capacity: v.capacity,
        currentMileage: v.currentMileage,
        status: v.status,
        supplierId: v.supplierId,
        supplierName: v.supplier?.name || null,
        driver: v.assignedDriver?.fullName || 'Unassigned',
        completedTrips: v.trips.length,
        totalMaintenanceCost: totalMaintCost,
        totalDowntimeHours: totalDowntime,
      };
    });
  }

  static async getDriverPerformanceReport() {
    const drivers = await prisma.driver.findMany({
      include: {
        supplier: { select: { id: true, name: true } },
        assignedVehicle: { select: { plateNumber: true } },
        trips: {
          select: { tripStatus: true },
        },
      },
    });

    return drivers.map((d) => {
      const total = d.trips.length;
      const completed = d.trips.filter((t) => t.tripStatus === TripStatus.COMPLETED).length;
      const delayed = d.trips.filter((t) => t.tripStatus === TripStatus.DELAYED).length;
      const cancelled = d.trips.filter((t) => t.tripStatus === TripStatus.CANCELLED).length;

      return {
        driverId: d.id,
        fullName: d.fullName,
        phone: d.phoneNumber,
        dutyStatus: d.dutyStatus,
        supplierId: d.supplierId,
        supplierName: d.supplier?.name || null,
        assignedVehicle: d.assignedVehicle?.plateNumber || 'None',
        totalTrips: total,
        completedTrips: completed,
        delayedTrips: delayed,
        cancelledTrips: cancelled,
      };
    });
  }

  static async getNotifications() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAhead = new Date(today);
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

    const [drivers, vehicles, contracts] = await Promise.all([
      prisma.driver.findMany({
        where: {
          licenseExpirationDate: { lte: thirtyDaysAhead },
        },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          licenseNumber: true,
          licenseExpirationDate: true,
        },
      }),
      prisma.vehicle.findMany({
        where: {
          OR: [
            { insuranceExpiry: { lte: thirtyDaysAhead } },
            { licenseExpiry: { lte: thirtyDaysAhead } },
            { inspectionExpiry: { lte: thirtyDaysAhead } },
          ],
        },
        select: {
          id: true,
          plateNumber: true,
          make: true,
          model: true,
          insuranceExpiry: true,
          licenseExpiry: true,
          inspectionExpiry: true,
        },
      }),
      prisma.contract.findMany({
        where: {
          status: ContractStatus.ACTIVE,
          endDate: { lte: thirtyDaysAhead },
        },
        include: { client: { select: { companyName: true } } },
      }),
    ]);

    const notifications: Array<{
      id: string;
      category: 'DRIVER' | 'VEHICLE' | 'CONTRACT';
      severity: 'CRITICAL' | 'WARNING';
      titleEn: string;
      titleAr: string;
      detailsEn: string;
      detailsAr: string;
      expiryDate: string;
      daysDiff: number;
      targetId: string;
      link: string;
    }> = [];

    // Process drivers
    for (const d of drivers) {
      const expDate = new Date(d.licenseExpirationDate);
      const diffMs = expDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isExpired = daysDiff < 0;

      notifications.push({
        id: `driver-lic-${d.id}`,
        category: 'DRIVER',
        severity: isExpired ? 'CRITICAL' : 'WARNING',
        titleEn: isExpired ? `Driver License Expired: ${d.fullName}` : `Driver License Expiring Soon: ${d.fullName}`,
        titleAr: isExpired ? `رخصة قيادة منتهية: ${d.fullName}` : `رخصة قيادة تنتهي قريباً: ${d.fullName}`,
        detailsEn: isExpired
          ? `License #${d.licenseNumber} expired ${Math.abs(daysDiff)} day(s) ago (${expDate.toISOString().split('T')[0]})`
          : `License #${d.licenseNumber} expires in ${daysDiff} day(s) (${expDate.toISOString().split('T')[0]})`,
        detailsAr: isExpired
          ? `الرخصة رقم ${d.licenseNumber} منتهية منذ ${Math.abs(daysDiff)} يوم (${expDate.toISOString().split('T')[0]})`
          : `الرخصة رقم ${d.licenseNumber} تنتهي خلال ${daysDiff} يوم (${expDate.toISOString().split('T')[0]})`,
        expiryDate: expDate.toISOString().split('T')[0],
        daysDiff,
        targetId: d.id,
        link: '/drivers',
      });
    }

    // Process vehicles
    for (const v of vehicles) {
      // Check Vehicle License
      const licDate = new Date(v.licenseExpiry);
      const licDiff = Math.ceil((licDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (licDiff <= 30) {
        const isExp = licDiff < 0;
        notifications.push({
          id: `veh-lic-${v.id}`,
          category: 'VEHICLE',
          severity: isExp ? 'CRITICAL' : 'WARNING',
          titleEn: isExp ? `Vehicle License Expired: ${v.plateNumber}` : `Vehicle License Expiring: ${v.plateNumber}`,
          titleAr: isExp ? `رخصة تسيير منتهية: الحافلة ${v.plateNumber}` : `رخصة تسيير تنتهي قريباً: الحافلة ${v.plateNumber}`,
          detailsEn: isExp
            ? `${v.make} ${v.model} road license expired ${Math.abs(licDiff)} day(s) ago`
            : `${v.make} ${v.model} road license expires in ${licDiff} day(s)`,
          detailsAr: isExp
            ? `رخصة تسيير ${v.make} ${v.model} منتهية منذ ${Math.abs(licDiff)} يوم`
            : `رخصة تسيير ${v.make} ${v.model} تنتهي خلال ${licDiff} يوم`,
          expiryDate: licDate.toISOString().split('T')[0],
          daysDiff: licDiff,
          targetId: v.id,
          link: '/vehicles',
        });
      }

      // Check Periodic Inspection
      const inspDate = new Date(v.inspectionExpiry);
      const inspDiff = Math.ceil((inspDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (inspDiff <= 30) {
        const isExp = inspDiff < 0;
        notifications.push({
          id: `veh-insp-${v.id}`,
          category: 'VEHICLE',
          severity: isExp ? 'CRITICAL' : 'WARNING',
          titleEn: isExp ? `Periodic Inspection Expired: ${v.plateNumber}` : `Inspection Expiring: ${v.plateNumber}`,
          titleAr: isExp ? `فحص فني منتهي: الحافلة ${v.plateNumber}` : `فحص فني ينتهي قريباً: الحافلة ${v.plateNumber}`,
          detailsEn: isExp
            ? `Periodic technical inspection expired ${Math.abs(inspDiff)} day(s) ago`
            : `Periodic technical inspection due in ${inspDiff} day(s)`,
          detailsAr: isExp
            ? `الفحص الفني الدوري للحافلة منتهي منذ ${Math.abs(inspDiff)} يوم`
            : `الفحص الفني الدوري للحافلة يستحق التجديد خلال ${inspDiff} يوم`,
          expiryDate: inspDate.toISOString().split('T')[0],
          daysDiff: inspDiff,
          targetId: v.id,
          link: '/vehicles',
        });
      }

      // Check Insurance
      const insDate = new Date(v.insuranceExpiry);
      const insDiff = Math.ceil((insDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (insDiff <= 30) {
        const isExp = insDiff < 0;
        notifications.push({
          id: `veh-ins-${v.id}`,
          category: 'VEHICLE',
          severity: isExp ? 'CRITICAL' : 'WARNING',
          titleEn: isExp ? `Vehicle Insurance Expired: ${v.plateNumber}` : `Insurance Expiring: ${v.plateNumber}`,
          titleAr: isExp ? `وثيقة تأمين منتهية: الحافلة ${v.plateNumber}` : `وثيقة تأمين تنتهي قريباً: الحافلة ${v.plateNumber}`,
          detailsEn: isExp
            ? `Insurance policy expired ${Math.abs(insDiff)} day(s) ago`
            : `Insurance policy expires in ${insDiff} day(s)`,
          detailsAr: isExp
            ? `وثيقة تأمين الحافلة منتهية منذ ${Math.abs(insDiff)} يوم`
            : `وثيقة تأمين الحافلة تنتهي خلال ${insDiff} يوم`,
          expiryDate: insDate.toISOString().split('T')[0],
          daysDiff: insDiff,
          targetId: v.id,
          link: '/vehicles',
        });
      }
    }

    // Process contracts
    for (const c of contracts) {
      const cDate = new Date(c.endDate);
      const cDiff = Math.ceil((cDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isExp = cDiff < 0;
      notifications.push({
        id: `contract-${c.id}`,
        category: 'CONTRACT',
        severity: isExp ? 'CRITICAL' : 'WARNING',
        titleEn: isExp ? `Contract Expired: ${c.contractNumber}` : `Contract Expiring Soon: ${c.contractNumber}`,
        titleAr: isExp ? `عقد منتهي: ${c.contractNumber}` : `عقد ينتهي قريباً: ${c.contractNumber}`,
        detailsEn: isExp
          ? `Contract with ${c.client.companyName} expired ${Math.abs(cDiff)} day(s) ago`
          : `Contract with ${c.client.companyName} expires in ${cDiff} day(s)`,
        detailsAr: isExp
          ? `عقد شركة ${c.client.companyName} منتهي منذ ${Math.abs(cDiff)} يوم`
          : `عقد شركة ${c.client.companyName} ينتهي خلال ${cDiff} يوم`,
        expiryDate: cDate.toISOString().split('T')[0],
        daysDiff: cDiff,
        targetId: c.id,
        link: '/contracts',
      });
    }

    // Sort: Critical (expired) first, then by daysDiff ascending
    notifications.sort((a, b) => a.daysDiff - b.daysDiff);

    return {
      totalCount: notifications.length,
      criticalCount: notifications.filter((n) => n.severity === 'CRITICAL').length,
      warningCount: notifications.filter((n) => n.severity === 'WARNING').length,
      notifications,
    };
  }
}