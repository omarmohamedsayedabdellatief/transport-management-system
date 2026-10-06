import { z } from "zod";
import { prisma } from "../../prisma.js";
import { ValidationError, NotFoundError } from "../../types/index.js";
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const money = z
  .number()
  .finite()
  .min(0)
  .max(99999999)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
    "Use at most two decimal places.",
  );
const schema = z.object({
  rates: z
    .array(
      z.object({
        billingTypeId: z.string().uuid(),
        departureTime: time,
        returnDepartureTime: time.nullable().optional(),
        saleAmount: money,
        costAmount: money,
        driverAllowance: money,
        vehicleCost: money,
      }),
    )
    .max(100),
});
export async function saveRouteRates(routeId: string, input: unknown) {
  const { rates } = schema.parse(input);
  if (new Set(rates.map((r) => r.billingTypeId)).size !== rates.length)
    throw new ValidationError("Duplicate billing type.");
  return prisma.$transaction(async (tx) => {
    if (!(await tx.route.findUnique({ where: { id: routeId } })))
      throw new NotFoundError("Route not found");
    for (const rate of rates) {
      const type = await tx.tripBillingType.findUnique({
        where: { id: rate.billingTypeId },
      });
      if (!type?.active || !["OUTBOUND", "RETURN"].includes(type.direction))
        throw new ValidationError("Choose an active billing type.");
      const data = { ...rate, returnDepartureTime: null };
      if (rate.billingTypeId === "10000000-0000-4000-a000-000000000001")
        await tx.route.update({
          where: { id: routeId },
          data: {
            clientPricePerTrip: rate.saleAmount,
            supplierCostPerTrip: rate.costAmount,
            driverTripAllowance: rate.driverAllowance,
            vehicleRentalCost: rate.vehicleCost,
          },
        });
      await tx.routeRate.upsert({
        where: {
          routeId_billingTypeId: { routeId, billingTypeId: rate.billingTypeId },
        },
        create: { ...data, routeId },
        update: data,
      });
    }
    return tx.routeRate.findMany({
      where: { routeId },
      include: { billingType: true },
    });
  });
}
