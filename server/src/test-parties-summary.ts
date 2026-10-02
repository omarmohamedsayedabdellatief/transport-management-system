import { prisma } from './prisma.js';

async function testPartiesSummary() {
  console.log('=== TESTING PARTIES SUMMARY & TRIPS LOG ===\n');

  try {
    const clients = await prisma.client.findMany();
    const suppliers = await prisma.partner.findMany({ where: { kind: { in: ['TRANSPORT', 'BOTH'] } } });

    console.log(`Found ${clients.length} clients and ${suppliers.length} suppliers.`);

    const trips = await prisma.trip.findMany({ take: 5, include: { client: true, supplier: true } });
    console.log(`Found ${trips.length} sample trips.`);

    for (const t of trips) {
      console.log(`- Trip: ${t.tripNumber}, Date: ${t.tripDate.toISOString().slice(0, 10)}, Client: ${t.client?.companyName || '-'}, Supplier: ${t.supplier?.name || '-'}, Sale: ${t.saleAmount}, Cost: ${t.costAmount}`);
    }

    console.log('\n=== TEST SUCCESSFUL ===');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPartiesSummary();
