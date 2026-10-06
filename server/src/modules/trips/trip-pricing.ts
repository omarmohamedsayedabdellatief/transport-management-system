import { prisma } from "../../prisma.js";
import { ValidationError } from "../../types/index.js";
import { dateOnly, zonedDeparture } from "../operations/operations.logic.js";

export async function prepareTrip(data: any, current?: any, db: any = prisma) {
  const route = await db.route.findUnique({
    where: { id: data.routeId || current?.routeId },
    include: { rates: { include: { billingType: true } } },
  });
  if (!route || !route.isActive)
    throw new ValidationError("Choose an active route.");
  if (data.clientId && data.clientId !== route.clientId)
    throw new ValidationError("Route must belong to the selected client.");
  const typeId = data.billingTypeId || current?.billingTypeId;
  const type = typeId
    ? await db.tripBillingType.findUnique({ where: { id: typeId } })
    : await db.tripBillingType.findFirst({
        where: {
          direction: data.direction || current?.direction || "OUTBOUND",
          active: true,
        },
        orderBy: { createdAt: "asc" },
      });
  const changed =
    !current ||
    route.id !== current.routeId ||
    type?.id !== current.billingTypeId;
  if (!type || ((!type.active || !["OUTBOUND", "RETURN"].includes(type.direction)) && changed))
    throw new ValidationError("Choose an active trip billing type.");
  if (data.direction && data.direction !== type.direction)
    throw new ValidationError("Trip direction must match its billing type.");
  const rate = route.rates.find((r: any) => r.billingTypeId === type.id);
  if (!rate && type.id !== "10000000-0000-4000-a000-000000000001" && changed)
    throw new ValidationError(
      "Configure this trip type’s time and price on the route first.",
    );
  const day =
    typeof data.tripDate === "string"
      ? data.tripDate.slice(0, 10)
      : (data.tripDate || current?.tripDate).toISOString().slice(0, 10);
  const parsedDate = dateOnly(day);
  function parseDeparture(value: any, fallback: string) {
    if (value) {
      if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
      )
        return zonedDeparture(
          value.slice(0, 10),
          value.slice(11),
          "Africa/Cairo",
        );
      const date = new Date(value);
      if (!Number.isFinite(date.getTime()))
        throw new ValidationError("Invalid trip time.");
      return date;
    }
    return zonedDeparture(day, fallback, "Africa/Cairo");
  }
  const scheduledDeparture = parseDeparture(
    data.scheduledDeparture ||
      (!changed && !data.tripDate ? current?.scheduledDeparture : null),
    rate?.departureTime || "07:00",
  );
  const returnDeparture =
    type.direction === "BOTH"
      ? parseDeparture(
          data.returnDeparture ||
            (!changed && !data.tripDate ? current?.returnDeparture : null),
          rate?.returnDepartureTime || "17:00",
        )
      : null;
  const keepArrival =
    current &&
    !changed &&
    !data.tripDate &&
    !data.scheduledDeparture &&
    !data.returnDeparture;
  const expectedArrival = data.expectedArrival
    ? parseDeparture(data.expectedArrival, "08:00")
    : keepArrival
      ? current.expectedArrival
      : new Date(
          (returnDeparture || scheduledDeparture).getTime() +
            route.estimatedDurationMin * 60000,
        );
  if (
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(scheduledDeparture) !== day
  )
    throw new ValidationError(
      "Departure date must match the service date in Cairo.",
    );
  if (returnDeparture && returnDeparture <= scheduledDeparture)
    throw new ValidationError(
      "Return departure must be after outbound departure.",
    );
  if (expectedArrival <= (returnDeparture || scheduledDeparture))
    throw new ValidationError("Arrival must be after the final departure.");
  const contractId =
    data.contractId === undefined ? current?.contractId : data.contractId;
  const contract = contractId
    ? await db.contract.findUnique({ where: { id: contractId } })
    : null;
  if (
    contractId &&
    (!contract ||
      contract.clientId !== route.clientId ||
      contract.status !== "ACTIVE")
  )
    throw new ValidationError("Choose an active contract for this client.");
  if (
    contract &&
    !["PER_TRIP", "MONTHLY_FIXED"].includes(contract.pricingModel)
  )
    throw new ValidationError("Choose a per-trip or monthly contract.");
  const assignmentChanged =
    !current ||
    route.id !== current.routeId ||
    (data.vehicleId && data.vehicleId !== current.vehicleId) ||
    (data.driverId && data.driverId !== current.driverId);
  const assignment: any = {};
  if (assignmentChanged) {
    const [vehicle, driver] = await Promise.all([
      db.vehicle.findUnique({
        where: { id: data.vehicleId || current?.vehicleId },
      }),
      db.driver.findUnique({
        where: { id: data.driverId || current?.driverId },
      }),
    ]);
    assignment.executionType =
      data.executionType ||
      route.executionType ||
      (vehicle?.supplierId || driver?.supplierId ? "SUPPLIER" : "COMPANY");
    assignment.supplierId =
      assignment.executionType === "SUPPLIER"
        ? data.supplierId ||
          route.supplierId ||
          vehicle?.supplierId ||
          driver?.supplierId ||
          null
        : null;
    if (assignment.executionType === "SUPPLIER" && !assignment.supplierId)
      throw new ValidationError(
        "Select a supplier for supplier-operated trips.",
      );
  }
  const price = (key: string, fallback: any) =>
    data[key] !== undefined
      ? data[key]
      : !changed && current
        ? current[key]
        : ((rate as any)?.[key] ?? fallback);
  return {
    ...data,
    ...assignment,
    clientId: route.clientId,
    billingTypeId: type.id,
    billingTypeName: changed ? type.name : current.billingTypeName,
    direction: type.direction,
    tripDate: parsedDate,
    scheduledDeparture,
    returnDeparture,
    expectedArrival,
    saleAmount: price("saleAmount", route.clientPricePerTrip),
    costAmount: price("costAmount", route.supplierCostPerTrip),
    driverAllowance: price("driverAllowance", route.driverTripAllowance),
    vehicleCost: price("vehicleCost", route.vehicleRentalCost),
    billingModel:
      !changed && current
        ? current.billingModel
        : contract?.pricingModel || "PER_TRIP",
    monthlyAmount:
      !changed && current
        ? current.monthlyAmount
        : contract?.pricingModel === "MONTHLY_FIXED"
          ? contract.monthlyValue
          : 0,
    billToClientId:
      !changed && current
        ? current.billToClientId
        : contract?.billToClientId || route.clientId,
  };
}
