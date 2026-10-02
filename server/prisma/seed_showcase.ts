import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedShowcase } from './showcase.js';
if(process.env.DEMO_MODE !== 'true' || process.env.NODE_ENV === 'production') throw new Error('Demo seeding requires DEMO_MODE=true and a non-production environment.');
const db=new PrismaClient();
try {
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  console.log(await seedShowcase(db,day));
  console.log('Additive fictional showcase ready. Existing records and account passwords were preserved.');
} finally { await db.$disconnect(); }
