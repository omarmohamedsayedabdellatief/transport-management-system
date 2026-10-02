import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../prisma.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../types/index.js';
import { dateOnly } from './operations.logic.js';

const router = Router();
const uuid=z.string().uuid(), text=z.string().trim().min(1).max(250);
const amount=z.coerce.number().finite().min(0).max(99999999).refine(v=>Math.abs(v*100-Math.round(v*100))<.00001,'Use at most two decimal places.');
const day=z.string().transform(dateOnly);
const notes=z.string().trim().max(2000).default('');
const financial=['ADMIN','ACCOUNTANT'], internal=[...financial,'OPERATIONS_MANAGER','VIEWER'];
const wrap=(fn:any)=>(req:any,res:any,next:any)=>Promise.resolve(fn(req,res)).catch(next);
const permit=(req:any,roles:string[])=>{if(!roles.includes(req.user?.role))throw new ForbiddenError();};
const ok=(res:any,data:any)=>res.json({success:true,data});
export async function treasuryTx<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>) {
  return prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;return fn(tx);},{timeout:20000});
}
const audit=(tx:Prisma.TransactionClient,actorId:string,action:string,entityId:string,detail:any)=>tx.auditEvent.create({data:{actorId,action,entity:'treasury',entityId,detail:JSON.stringify(detail)}});
export const fingerprint=(data:any)=>JSON.stringify(data);
async function retry(tx:Prisma.TransactionClient,key:string,hash:string) {
  const entry=await tx.treasuryEntry.findUnique({where:{requestKey:key}});
  if(entry&&entry.fingerprint!==hash)throw new ConflictError('This request was already used with different details.');
  return entry;
}
export async function postEntry(tx:Prisma.TransactionClient,data:Prisma.TreasuryEntryUncheckedCreateInput) {
  const account=await tx.treasuryAccount.findUnique({where:{id:data.accountId}});
  if(!account)throw new NotFoundError('Treasury account not found.');
  if(!account.active)throw new ConflictError('Choose an active treasury account.');
  const date=new Date(data.date);
  const today=dateOnly(new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
  if(date<account.openingDate)throw new ValidationError('Movement date is before the account opening date. Review the historical opening balance first.');
  if(date>today)throw new ValidationError('Actual money movements cannot have a future date.');
  const value=new Prisma.Decimal(data.amount as any);
  if(value.lt(0)) {
    // Reject a withdrawal that would make any later end-of-entry balance negative.
    const rows=await tx.treasuryEntry.findMany({where:{accountId:account.id},orderBy:[{date:'asc'},{createdAt:'asc'},{id:'asc'}]});
    let balance=new Prisma.Decimal(0), applied=false;
    for(const row of rows) {
      if(!applied&&row.date>date){balance=balance.plus(value);applied=true;if(balance.lt(0))throw new ConflictError('Insufficient balance on this date.');}
      balance=balance.plus(row.amount);
      if(applied&&balance.lt(0))throw new ConflictError('This backdated movement would create a negative balance.');
    }
    if(!applied)balance=balance.plus(value);
    if(balance.lt(0))throw new ConflictError('Insufficient treasury balance.');
  }
  return tx.treasuryEntry.create({data:{...data,createdAt:new Date()}});
}
export async function postDocumentPayment(tx:Prisma.TransactionClient,payment:any,document:any,accountId:string,actorId:string) {
  return postEntry(tx,{accountId,paymentId:payment.id,date:payment.date,amount:document.kind==='INVOICE'?payment.amount:new Prisma.Decimal(payment.amount).negated(),kind:document.kind==='INVOICE'?'RECEIPT':'SUPPLIER_PAYMENT',reference:payment.reference,notes:document.number,actorId,requestKey:'payment:'+payment.id,fingerprint:fingerprint({paymentId:payment.id,accountId}),sourceKey:'payment:'+payment.id});
}
router.get('/',wrap(async(req:any,res:any)=>{
  permit(req,internal);
  const [accounts,entries,payments,documents,clients]=await Promise.all([
    prisma.treasuryAccount.findMany({orderBy:{createdAt:'asc'}}),
    prisma.treasuryEntry.findMany({include:{account:true,payment:{include:{document:{select:{id:true,number:true,clientId:true,partnerId:true}}}}},orderBy:[{date:'asc'},{createdAt:'asc'},{id:'asc'}]}),
    prisma.payment.findMany({where:{treasuryEntry:null},include:{document:{include:{client:true,partner:true}}},orderBy:{date:'desc'}}),
    prisma.financeDocument.findMany({where:{kind:'INVOICE',status:{in:['ISSUED','PAID']}},include:{payments:true},orderBy:{createdAt:'asc'}}),
    prisma.client.findMany({select:{id:true,companyName:true},orderBy:{companyName:'asc'}}),
  ]);
  const balances=new Map<string,Prisma.Decimal>();
  const ledger=entries.map(e=>{const b=(balances.get(e.accountId)||new Prisma.Decimal(0)).plus(e.amount);balances.set(e.accountId,b);return {...e,balance:b};});
  const companies=clients.map(client=>{const docs=documents.filter(d=>d.clientId===client.id),billed=docs.reduce((s,d)=>s.plus(d.total),new Prisma.Decimal(0)),paid=docs.flatMap(d=>d.payments).reduce((s,p)=>s.plus(p.amount),new Prisma.Decimal(0));return {...client,billed,paid,outstanding:billed.minus(paid),documents:docs};});
  ok(res,{accounts:accounts.map(a=>({...a,balance:balances.get(a.id)||new Prisma.Decimal(0)})),entries:ledger.reverse(),unallocated:payments,companies});
}));
router.get('/clients/:id',wrap(async(req:any,res:any)=>{
  permit(req,internal);
  const client=await prisma.client.findUniqueOrThrow({where:{id:uuid.parse(req.params.id)}});
  const documents=await prisma.financeDocument.findMany({where:{clientId:client.id,kind:'INVOICE',status:{in:['ISSUED','PAID']}},include:{payments:{include:{treasuryEntry:{include:{account:true}}}}},orderBy:{createdAt:'desc'}});
  ok(res,{client,documents});
}));
router.post('/accounts',wrap(async(req:any,res:any)=>{
  permit(req,['ADMIN']);
  const d=z.object({name:text,kind:z.enum(['BANK','CASH']),bankName:z.string().trim().max(250).default(''),reference:z.string().trim().max(100).default(''),openingDate:day,openingBalance:amount,requestKey:uuid}).parse(req.body);
  ok(res,await treasuryTx(async tx=>{
    const hash=fingerprint(d),old=await retry(tx,d.requestKey,hash);if(old)return tx.treasuryAccount.findUniqueOrThrow({where:{id:old.accountId}});
    const {openingBalance,requestKey,...account}=d;
    const row=await tx.treasuryAccount.create({data:account});
    await postEntry(tx,{accountId:row.id,date:d.openingDate,amount:openingBalance,kind:'OPENING',reference:'Opening balance',actorId:req.user.userId,requestKey,fingerprint:hash});
    await audit(tx,req.user.userId,'OPEN_TREASURY_ACCOUNT',row.id,d);return row;
  }));
}));
router.post('/accounts/:id/status',wrap(async(req:any,res:any)=>{
  permit(req,['ADMIN']);const active=z.boolean().parse(req.body.active);
  ok(res,await treasuryTx(async tx=>{
    const id=uuid.parse(req.params.id);
    const sum=await tx.treasuryEntry.aggregate({where:{accountId:id},_sum:{amount:true}});
    if(!active&&sum._sum.amount&&!sum._sum.amount.isZero())throw new ConflictError('Transfer the remaining balance before archiving this account.');
    const row=await tx.treasuryAccount.update({where:{id},data:{active}});await audit(tx,req.user.userId,'TREASURY_STATUS',id,{active});return row;
  }));
}));
router.post('/transfers',wrap(async(req:any,res:any)=>{
  permit(req,financial);
  const d=z.object({fromAccountId:uuid,toAccountId:uuid,amount:amount.refine(v=>v>0),date:day,reference:text,notes,requestKey:uuid}).parse(req.body);
  if(d.fromAccountId===d.toAccountId)throw new ValidationError('Choose two different accounts.');
  ok(res,await treasuryTx(async tx=>{
    const hash=fingerprint(d),old=await retry(tx,d.requestKey,hash);if(old)return old;
    const transferId=randomUUID(), common={date:d.date,reference:d.reference,notes:d.notes,actorId:req.user.userId,transferId,fingerprint:hash};
    const debit=await postEntry(tx,{...common,accountId:d.fromAccountId,amount:-d.amount,kind:'TRANSFER_OUT',requestKey:d.requestKey});
    await postEntry(tx,{...common,accountId:d.toAccountId,amount:d.amount,kind:'TRANSFER_IN',requestKey:d.requestKey+':in'});
    await audit(tx,req.user.userId,'TREASURY_TRANSFER',transferId,d);return debit;
  }));
}));
router.post('/adjustments',wrap(async(req:any,res:any)=>{
  permit(req,['ADMIN']);
  const d=z.object({accountId:uuid,direction:z.enum(['IN','OUT']),amount:amount.refine(v=>v>0),date:day,reference:text,notes:z.string().trim().min(5).max(2000),requestKey:uuid}).parse(req.body);
  ok(res,await treasuryTx(async tx=>{
    const hash=fingerprint(d),old=await retry(tx,d.requestKey,hash);if(old)return old;
    const row=await postEntry(tx,{accountId:d.accountId,date:d.date,reference:d.reference,notes:d.notes,amount:d.direction==='IN'?d.amount:-d.amount,kind:'ADJUSTMENT_'+d.direction,actorId:req.user.userId,requestKey:d.requestKey,fingerprint:hash});
    await audit(tx,req.user.userId,'TREASURY_ADJUSTMENT',row.id,d);return row;
  }));
}));
router.post('/payments/:id/allocate',wrap(async(req:any,res:any)=>{
  permit(req,['ADMIN']);const accountId=uuid.parse(req.body.accountId);
  ok(res,await treasuryTx(async tx=>{
    const payment=await tx.payment.findUniqueOrThrow({where:{id:uuid.parse(req.params.id)},include:{document:true,treasuryEntry:true}});
    if(payment.treasuryEntry){if(payment.treasuryEntry.accountId!==accountId)throw new ConflictError('This payment is already assigned to another account.');return payment.treasuryEntry;}
    const row=await postDocumentPayment(tx,payment,payment.document,accountId,req.user.userId);
    await audit(tx,req.user.userId,'ALLOCATE_HISTORICAL_PAYMENT',row.id,{paymentId:payment.id,accountId});return row;
  }));
}));
router.post('/record-payments',wrap(async(req:any,res:any)=>{
  permit(req,financial);
  const d=z.object({sourceType:z.enum(['expenses','payroll','installments']),sourceId:uuid,accountId:uuid,date:day,reference:text,requestKey:uuid}).parse(req.body);
  ok(res,await treasuryTx(async tx=>{
    const hash=fingerprint(d),old=await retry(tx,d.requestKey,hash);if(old)return old;
    const sourceKey=d.sourceType+':'+d.sourceId;
    if(await tx.treasuryEntry.findUnique({where:{sourceKey}}))throw new ConflictError('This cost has already been paid from treasury.');
    const model:any={expenses:tx.expense,payroll:tx.staffPayroll,installments:tx.installment}[d.sourceType];
    const source=await model.findUniqueOrThrow({where:{id:d.sourceId}});
    if(d.sourceType==='installments'&&source.status==='PAID')throw new ConflictError('This installment was marked paid previously. Reconcile its opening balance before recording it again.');
    const value=new Prisma.Decimal(source.amount??source.netSalary??source.bankAmount);
    if(!value.gt(0))throw new ValidationError('The payable amount must be positive.');
    const row=await postEntry(tx,{accountId:d.accountId,date:d.date,amount:value.negated(),kind:'COST_PAYMENT',reference:d.reference,notes:d.sourceType+': '+(source.category||source.employeeName||source.assetName),actorId:req.user.userId,sourceKey,requestKey:d.requestKey,fingerprint:hash});
    if(d.sourceType==='installments')await tx.installment.update({where:{id:source.id},data:{status:'PAID'}});
    await audit(tx,req.user.userId,'TREASURY_COST_PAYMENT',row.id,d);return row;
  }));
}));
export default router;
