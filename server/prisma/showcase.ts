import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { dateOnly, zonedDeparture } from '../src/modules/operations/operations.logic.js';
export const demoId = (key: string) => {
  const h = createHash('sha256').update('ontime-showcase-v1:' + key).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
};
export async function seedShowcase(db: PrismaClient, day: string) {
  const base = dateOnly(day);
  const date = (offset: number) => new Date(base.getTime() + offset * 86400000);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;
    const put = (model: string,key: string,data: any) => (tx as any)[model].upsert({ where: { id: demoId(key) }, update: {}, create: { id: demoId(key), ...data } });
    const supplier = await put('partner','supplier',{ name:'مسار للنقل — تجريبي',kind:'TRANSPORT',notes:'Fictional DEMO dataset. No real supplier.' });
    const staffing = await put('partner','staffing',{ name:'فريق للتوظيف — تجريبي',kind:'STAFFING',notes:'Fictional DEMO staffing employer.' });
    const clients = [];
    for (const [i,name] of ['مصانع الأفق','شركة مدار للتقنية','مركز رعاية'].entries()) {
      clients.push(await put('client',`client:${i}`,{companyName:name+' — تجريبي',contactPerson:'مسؤول النقل — تجريبي',phone:'DEMO',email:`transport${i}@example.invalid`,address:'القاهرة — عنوان توضيحي',notes:'Fictional DEMO company; no real customer data.'}));
      await put('contract',`contract:${i}`,{clientId:clients[i].id,contractNumber:`DEMO-OT-CONTRACT-${i+1}`,startDate:date(-365),endDate:date(365),pricingModel:'PER_TRIP',monthlyValue:900+i*200,notes:'Illustrative per-trip agreement only.'});
      await put('site',`site:${i}`,{clientId:clients[i].id,name:'موقع العمل الرئيسي — تجريبي',address:'موقع توضيحي بالقاهرة'});
    }
    const names=['أحمد','سارة','عمر','مريم','كريم','نور','يوسف','ليلى','خالد','هنا','علي','دينا'];
    for (let r=0;r<4;r++) {
      const ci=r%3, outsourced=r>=2, supplierId=outsourced?supplier.id:null;
      const vehicle=await put('vehicle',`vehicle:${r}`,{plateNumber:`DEMO-OT-${r+1}`,make:r%2?'Toyota':'Mercedes',model:r%2?'Hiace':'Sprinter',manufacturingYear:2025,vehicleType:r%2?'VAN_14_SEATER':'MINIBUS_30_SEATER',capacity:r%2?14:30,currentMileage:12000+r*7000,licenseExpiry:date(300),insuranceExpiry:date(240),inspectionExpiry:date(180),supplierId});
      const driver=await put('driver',`driver:${r}`,{fullName:['حسام فتحي','محمود سالم','أشرف نبيل','كريم فؤاد'][r]+' — تجريبي',phoneNumber:'DEMO',nationalId:`DEMO-OT-NATIONAL-${r}`,licenseNumber:`DEMO-OT-LICENSE-${r}`,licenseExpirationDate:date(300),assignedVehicleId:vehicle.id,supplierId});
      const origin=['مدينة نصر','المعادي','شبرا','الهرم'][r];
      const route=await put('route',`route:${r}`,{routeName:origin+' ← '+['العاشر من رمضان','القاهرة الجديدة','مدينة نصر','العاشر من رمضان'][r]+' — تجريبي',clientId:clients[ci].id,startLocation:origin,finalDestination:'موقع العمل',estimatedDistanceKm:25+r*8,estimatedDurationMin:60,defaultVehicleId:vehicle.id,defaultDriverId:driver.id,stops:{create:[{stopOrder:1,stopName:origin,pickupTimeOffsetMin:0},{stopOrder:2,stopName:'محطة التجمع',pickupTimeOffsetMin:15}]}});
      const passengers=[];
      for(let n=0;n<12;n++) {
        const passenger=await put('passenger',`passenger:${r}:${n}`,{employeeCode:`DEMO-OT-${r}-${n}`,fullName:`${names[n]} ${['حسن','محمود','عادل','إبراهيم'][r]} — تجريبي`,clientId:clients[ci].id,siteId:demoId(`site:${ci}`),employerId:n%3===0?staffing.id:null,notes:'Fictional passenger; not a real employee.'});
        passengers.push(passenger);
        await put('enrollment',`enrollment:${r}:${n}`,{passengerId:passenger.id,routeId:route.id,stopName:n%2?'محطة التجمع':origin,direction:'BOTH',shift:'MORNING',startDate:date(-365),endDate:date(365)});
      }
      for (let direction=0;direction<2;direction++) {
        const time=direction?'17:00':`0${6+r%2}:00`;
        const plan=await put('servicePlan',`plan:${r}:${direction}`,{name:`${origin} · ${direction?'عودة':'ذهاب'} — تجريبي`,routeId:route.id,contractId:demoId(`contract:${ci}`),vehicleId:vehicle.id,driverId:driver.id,supplierId,direction:direction?'RETURN':'OUTBOUND',shift:'MORNING',departureTime:time,durationMinutes:60,weekdays:[0,1,2,3,4,5,6],startDate:date(-365),endDate:date(365),saleRate:900+ci*200,supplierRate:outsourced?550+r*50:0});
        for(let offset=-29;offset<=6;offset++) {
          const serviceDay=date(offset).toISOString().slice(0,10);
          const departure=zonedDeparture(serviceDay,time,'Africa/Cairo');
          const cancelled=offset<0 && (Math.abs(offset)+r+direction)%19===0;
          const completed=offset<0&&!cancelled;
          const tripStatus=cancelled?'CANCELLED':completed?'COMPLETED':offset===0&&r===3&&direction===0?'DELAYED':'SCHEDULED';
          const lag=(Math.abs(offset)+r+direction)%7===0?12:2;
          const trip=await put('trip',`trip:${serviceDay}:${r}:${direction}`,{tripNumber:`DEMO-OT-${serviceDay}-${r}-${direction}`,clientId:clients[ci].id,billToClientId:clients[ci].id,contractId:plan.contractId,routeId:route.id,vehicleId:vehicle.id,driverId:driver.id,supplierId,servicePlanId:plan.id,generationKey:`${plan.id}:${serviceDay}`,direction:plan.direction,shift:'MORNING',tripDate:date(offset),scheduledDeparture:departure,expectedArrival:new Date(departure.getTime()+3600000),actualDeparture:completed?new Date(departure.getTime()+lag*60000):null,actualArrival:completed?new Date(departure.getTime()+(60+lag)*60000):null,tripStatus,billingModel:'PER_TRIP',saleAmount:plan.saleRate,costAmount:plan.supplierRate,notes:'DEMO: fictional transport service for product walkthrough.',manifest:{create:passengers.map((p,n)=>({passengerId:p.id,passengerName:p.fullName,employerName:p.employerId?staffing.name:clients[ci].companyName,stopName:n%2?'محطة التجمع':origin,status:cancelled?'CANCELLED':completed?((Math.abs(offset)+n+r)%11===0?'NO_SHOW':'BOARDED'):'EXPECTED',recordedAt:completed?departure:null}))},events:{create:{type:tripStatus,description:cancelled?'DEMO: client cancelled shift':tripStatus==='DELAYED'?'DEMO: dispatcher reviewing departure':'DEMO: illustrative service history',actorId:'DEMO-SEED'}}});
        }
      }
      await put('maintenanceRecord',`maintenance:${r}`,{vehicleId:vehicle.id,maintenanceType:'OIL_CHANGE',serviceDate:date(-40),completionDate:date(-40),cost:1800+r*200,mileageAtService:10000,status:'COMPLETED',description:'تغيير زيت وفحص — بيانات تجريبية',serviceProvider:'ورشة تجريبية'});
    }
    // Prepare closed-period service into drafts and issued/paid examples with matching line keys.
    for(let ci=0;ci<3;ci++) {
      const rows=await tx.trip.findMany({where:{clientId:clients[ci].id,tripNumber:{startsWith:'DEMO-OT-'},tripStatus:'COMPLETED',tripDate:{gte:date(-29),lt:date(-7)}}});
      for(const period of [...new Set(rows.map(t=>t.tripDate.toISOString().slice(0,7)))]) {
        const existing=await tx.financeDocument.findUnique({where:{id:demoId(`invoice:${ci}:${period}`)}});
        if(existing) continue;
        const selected=rows.filter(t=>t.tripDate.toISOString().slice(0,7)===period);
        const total=selected.reduce((s,t)=>s.plus(t.saleAmount),new Prisma.Decimal(0));
        const status=ci===0?'ISSUED':ci===1?'PAID':'DRAFT';
        const invoice=await put('financeDocument',`invoice:${ci}:${period}`,{number:`DEMO-OT-INV-${period}-${ci}`,kind:'INVOICE',clientId:clients[ci].id,period,status,dueDate:date(ci===0?-2:10),total,notes:'DEMO: illustrative billing, not a tax invoice.',lines:{create:selected.map(t=>({sourceKey:`INVOICE:TRIP:${t.id}`,tripId:t.id,description:t.tripNumber,amount:t.saleAmount}))}});
        if(status!=='DRAFT') await put('payment',`receipt:${ci}:${period}`,{documentId:invoice.id,amount:ci===1?total:total.div(2).toDecimalPlaces(2),date:date(-3-ci),reference:'DEMO receipt',requestKey:demoId(`receipt-key:${ci}:${period}`)});
      }
    }
    const supplierTrips=await tx.trip.findMany({where:{supplierId:supplier.id,tripNumber:{startsWith:'DEMO-OT-'},tripStatus:'COMPLETED',tripDate:{gte:date(-29),lt:date(-7)}}});
    for(const period of [...new Set(supplierTrips.map(t=>t.tripDate.toISOString().slice(0,7)))]) {
      if(await tx.financeDocument.findUnique({where:{id:demoId(`settlement:${period}`)}})) continue;
      const rows=supplierTrips.filter(t=>t.tripDate.toISOString().slice(0,7)===period),total=rows.reduce((s,t)=>s.plus(t.costAmount),new Prisma.Decimal(0));
      const doc=await put('financeDocument',`settlement:${period}`,{number:`DEMO-OT-SET-${period}`,kind:'SETTLEMENT',partnerId:supplier.id,period,status:'ISSUED',dueDate:date(5),total,notes:'DEMO: illustrative supplier settlement.',lines:{create:rows.map(t=>({sourceKey:`SETTLEMENT:TRIP:${t.id}`,tripId:t.id,description:t.tripNumber,amount:t.costAmount}))}});
      await put('payment',`payout:${period}`,{documentId:doc.id,amount:total.div(3).toDecimalPlaces(2),date:date(-2),reference:'DEMO supplier payment',requestKey:demoId(`payout-key:${period}`)});
    }
    return {clients:3,passengers:48,vehicles:4,drivers:4,routes:4,schedules:8,trips:288};
  },{timeout:120000,maxWait:10000});
}
