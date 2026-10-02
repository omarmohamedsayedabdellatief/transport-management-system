/**
 * Dedicated Performance, Latency, Payload Size & Query Benchmark Harness
 * Measures:
 *  - Response Latency (ms) - Mean, Min, Max, P95 over multiple iterations
 *  - Database Query count & execution time
 *  - Payload Size (Bytes & KB)
 *  - Memory footprint during execution
 */

import { prisma } from '../src/prisma.js';
import { DashboardService } from '../src/modules/dashboard/dashboard.service.js';
import { AccountingService } from '../src/modules/accounting/accounting.service.js';
import { TripService } from '../src/modules/trips/trip.service.js';
import { RouteService } from '../src/modules/routes/route.service.js';
import { VehicleService } from '../src/modules/vehicles/vehicle.service.js';
import { DriverService } from '../src/modules/drivers/driver.service.js';
import { ClientService } from '../src/modules/clients/client.service.js';

export interface BenchmarkMetric {
  name: string;
  category: 'API_ENDPOINT' | 'DB_QUERY' | 'AGGREGATION';
  iterations: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p95Ms: number;
  payloadBytes: number;
  recordCount: number;
}

export async function measureBenchmark(
  name: string,
  category: 'API_ENDPOINT' | 'DB_QUERY' | 'AGGREGATION',
  fn: () => Promise<any>,
  iterations = 5
): Promise<BenchmarkMetric> {
  const durations: number[] = [];
  let lastResult: any = null;

  // Warmup run
  await fn();

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    lastResult = await fn();
    const duration = performance.now() - start;
    durations.push(duration);
  }

  durations.sort((a, b) => a - b);
  const minMs = Math.round(durations[0] * 100) / 100;
  const maxMs = Math.round(durations[durations.length - 1] * 100) / 100;
  const avgMs = Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100;
  const p95Idx = Math.floor(durations.length * 0.95);
  const p95Ms = Math.round(durations[p95Idx] * 100) / 100;

  const jsonStr = JSON.stringify(lastResult ?? {});
  const payloadBytes = Buffer.byteLength(jsonStr, 'utf8');
  let recordCount = 0;
  if (Array.isArray(lastResult)) {
    recordCount = lastResult.length;
  } else if (lastResult && Array.isArray(lastResult.items)) {
    recordCount = lastResult.items.length;
  } else if (lastResult && Array.isArray(lastResult.data)) {
    recordCount = lastResult.data.length;
  } else if (lastResult && typeof lastResult === 'object') {
    recordCount = Object.keys(lastResult).length;
  }

  return {
    name,
    category,
    iterations,
    minMs,
    maxMs,
    avgMs,
    p95Ms,
    payloadBytes,
    recordCount,
  };
}

export async function runCompleteBenchmarkSuite(suiteLabel: string): Promise<BenchmarkMetric[]> {
  console.log(`\n===============================================================`);
  console.log(`⏱️  RUNNING PERFORMANCE BENCHMARK SUITE: ${suiteLabel}`);
  console.log(`===============================================================\n`);

  const metrics: BenchmarkMetric[] = [];

  // 1. Dashboard Overview KPIs
  metrics.push(
    await measureBenchmark('DashboardService.getOverviewKPIs()', 'API_ENDPOINT', async () => {
      return DashboardService.getOverviewKPIs();
    })
  );

  // 2. Dashboard Trends (Weekly)
  metrics.push(
    await measureBenchmark('DashboardService.getWeeklyTripTrends()', 'API_ENDPOINT', async () => {
      return DashboardService.getWeeklyTripTrends();
    })
  );

  // 3. Trips Listing (Unpaginated / All Trips vs Paginated)
  metrics.push(
    await measureBenchmark('TripService.getAllTrips() [ALL]', 'API_ENDPOINT', async () => {
      return TripService.getAllTrips();
    })
  );

  metrics.push(
    await measureBenchmark('TripService.getAllTrips({ limit: 5 }) [OPTIMIZED]', 'API_ENDPOINT', async () => {
      return TripService.getAllTrips({ limit: 5 });
    })
  );

  // 4. Daily Operations Listing (Month + Year + Pagination)
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  metrics.push(
    await measureBenchmark('AccountingService.listDailyOperations(page=1, limit=25)', 'API_ENDPOINT', async () => {
      return AccountingService.listDailyOperations({ month: currentMonth, year: currentYear, page: 1, limit: 25 });
    })
  );

  // 5. Daily Operations Summary Aggregation
  metrics.push(
    await measureBenchmark('AccountingService.getDailyOperationsSummary()', 'AGGREGATION', async () => {
      return AccountingService.getDailyOperationsSummary({ month: currentMonth, year: currentYear });
    })
  );

  // 6. Full Income Statement (P&L Multi-Month)
  metrics.push(
    await measureBenchmark('AccountingService.getIncomeStatement(currentYear)', 'AGGREGATION', async () => {
      return AccountingService.getIncomeStatement({ year: currentYear });
    })
  );

  // 7. Monthly Breakdown (12-month metrics)
  metrics.push(
    await measureBenchmark('AccountingService.getMonthlyBreakdown(currentYear)', 'AGGREGATION', async () => {
      return AccountingService.getMonthlyBreakdown(currentYear);
    })
  );

  // 8. Treasury Overview
  metrics.push(
    await measureBenchmark('AccountingService.listTreasuryOverview()', 'API_ENDPOINT', async () => {
      return AccountingService.listTreasuryOverview();
    })
  );

  // 9. Entity Lists (Dropdowns & Selectors)
  metrics.push(
    await measureBenchmark('ClientService.getAllClients()', 'API_ENDPOINT', async () => {
      return ClientService.getAllClients();
    })
  );

  metrics.push(
    await measureBenchmark('DriverService.getAllDrivers()', 'API_ENDPOINT', async () => {
      return DriverService.getAllDrivers();
    })
  );

  metrics.push(
    await measureBenchmark('VehicleService.getAllVehicles()', 'API_ENDPOINT', async () => {
      return VehicleService.getAllVehicles();
    })
  );

  metrics.push(
    await measureBenchmark('RouteService.getAllRoutes() [FULL]', 'API_ENDPOINT', async () => {
      return RouteService.getAllRoutes();
    })
  );

  metrics.push(
    await measureBenchmark('RouteService.getAllRoutes({ summary: true }) [OPTIMIZED]', 'API_ENDPOINT', async () => {
      return RouteService.getAllRoutes({ summary: true });
    })
  );

  // Print results table
  console.log(`\n-------------------------------------------------------------------------------------------------------`);
  console.log(`| Benchmark Target                                       | Avg (ms) | Min (ms) | Max (ms) | Payload (KB) |`);
  console.log(`-------------------------------------------------------------------------------------------------------`);
  for (const m of metrics) {
    const kb = (m.payloadBytes / 1024).toFixed(2);
    console.log(
      `| ${m.name.padEnd(54)} | ${m.avgMs.toString().padStart(8)} | ${m.minMs.toString().padStart(8)} | ${m.maxMs.toString().padStart(8)} | ${kb.padStart(10)} KB |`
    );
  }
  console.log(`-------------------------------------------------------------------------------------------------------\n`);

  return metrics;
}

if (process.argv[1]?.includes('performance_benchmark')) {
  runCompleteBenchmarkSuite('BASELINE EVALUATION')
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error(err);
      prisma.$disconnect();
    });
}
