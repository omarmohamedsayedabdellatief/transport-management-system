import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import type { BillingType, VehicleCategory } from "../../types";
export function useCatalog() {
  return useQuery<{
    vehicleTypes: VehicleCategory[];
    billingTypes: BillingType[];
  }>({
    queryKey: ["configuration"],
    queryFn: async () => (await api.get("/configuration")).data.data,
  });
}
export const directionLabel = (d: string, ar: boolean) =>
  d === "RETURN"
    ? ar
      ? "عودة"
      : "Return"
    : d === "BOTH"
      ? ar
        ? "ذهاب وعودة"
        : "Round trip"
      : ar
        ? "ذهاب"
        : "Outbound";
