import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { dateOnly } from './operations.logic.js';

export async function analytics(days: number, database: any = prisma) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const end = dateOnly(today), start = new Date(end.getTime() - (days - 1) * 86400000);
  const [trips, payments, passengers, fleet, counts, documents] = await Promise.all([
    database.trip.findMany({ where: { tripDate: { gte: start, lte: end } }, include: { route: { select: { id: true, routeName: true } }, manifest: { select: { status: true } } }, orderBy: { tripDate: 'asc' } }),
    database.payment.findMany({ where: { date: { gte: start, lte: end }, document: { status: { in: ['ISSUED', 'PAID'] } } }, include: { document: { select: { kind: true } } } }),
    database.passenger.groupBy({ by: ['employerId'], where: { active: true }, _count: true }),
    database.vehicle.groupBy({ by: ['status'], _count: true }),
    Promise.all([database.client.count(), database.contract.count({ where: { status: 'ACTIVE' } }), database.route.count({ where: { isActive: true } }), database.passenger.count({ where: { active: true } }), database.enrollment.count({ where: { active: true } }), database.servicePlan.count({ where: { active: true } }), database.trip.count(), database.financeDocument.count({ where: { status: { not: 'VOID' } } }), database.trip.count({ where: { tripNumber: { startsWith: 'DEMO-OT-' } } })]),
    database.financeDocument.findMany({ where: { status: 'ISSUED' }, include: { payments: true } }),
  ]);
  const daily: any[] = Array.from({ length: days }, (_, i) => ({ date: new Date(start.getTime() + i * 86400000).toISOString().slice(0,10), trips: 0, completed: 0, cancelled: 0, boarded: 0, noShow: 0, receipts: new Prisma.Decimal(0), payouts: new Prisma.Decimal(0) }));
  const indexed = new Map(daily.map(d => [d.date,d]));
  const routes = new Map<string, any>();
  let completed = 0, onTime = 0, timed = 0, boarded = 0, noShow = 0;
  for (const trip of trips) {
    const day = indexed.get(trip.tripDate.toISOString().slice(0,10))!;
    day.trips++;
    if (trip.tripStatus === 'CANCELLED') day.cancelled++;
    if (trip.tripStatus !== 'COMPLETED') continue;
    day.completed++; completed++;
    const route = routes.get(trip.routeId) || { id: trip.routeId, name: trip.route.routeName, completed: 0, boarded: 0, noShow: 0 };
    route.completed++;
    if (trip.actualDeparture) { timed++; if (trip.actualDeparture.getTime() <= trip.scheduledDeparture.getTime() + 5*60000) onTime++; }
    for (const m of trip.manifest) {
      if (m.status === 'BOARDED') { boarded++; day.boarded++; route.boarded++; }
      if (m.status === 'NO_SHOW') { noShow++; day.noShow++; route.noShow++; }
    }
    routes.set(trip.routeId,route);
  }
  for (const payment of payments) {
    const day = indexed.get(payment.date.toISOString().slice(0,10))!;
    const key = payment.document.kind === 'INVOICE' ? 'receipts' : 'payouts';
    day[key] = day[key].plus(payment.amount);
  }
  const unpaid = documents.map((d: any) => ({ ...d, remaining: d.payments.reduce((v: Prisma.Decimal,p: any) => v.minus(p.amount), new Prisma.Decimal(d.total)) })).filter((d: any) => d.remaining.gt(0));
  return {
    start: start.toISOString().slice(0,10), end: today, days,
    daily: daily.map(d=>({ ...d, receipts: Number(d.receipts), payouts: Number(d.payouts) })),
    metrics: { trips: trips.length, completed, boarded, noShow, attendanceRate: boarded + noShow ? Math.round(boarded/(boarded+noShow)*100) : null, onTimeRate: timed ? Math.round(onTime/timed*100) : null, timedTrips: timed, receipts: Number(daily.reduce((s,d)=>s.plus(d.receipts),new Prisma.Decimal(0))), payouts: Number(daily.reduce((s,d)=>s.plus(d.payouts),new Prisma.Decimal(0))) },
    routes: [...routes.values()].sort((a,b)=>b.completed-a.completed),
    passengerMix: { direct: passengers.filter((p: any)=>!p.employerId).reduce((s: number,p: any)=>s+p._count,0), outsourced: passengers.filter((p: any)=>p.employerId).reduce((s: number,p: any)=>s+p._count,0) },
    fleet: fleet.map((f: any)=>({ status:f.status,count:f._count })),
    setup: { clients:counts[0],contracts:counts[1],routes:counts[2],passengers:counts[3],enrollments:counts[4],schedules:counts[5],trips:counts[6],documents:counts[7] },
    demoPresent: counts[8] > 0,
    overdue: { count: unpaid.filter((d: any)=>d.kind==='INVOICE' && d.dueDate<end).length, amount:Number(unpaid.filter((d: any)=>d.kind==='INVOICE' && d.dueDate<end).reduce((s: Prisma.Decimal,d: any)=>s.plus(d.remaining),new Prisma.Decimal(0))) },
  };
}
