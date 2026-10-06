import { ValidationError } from "../../types/index.js";
export function expenseType(
  value: unknown,
  category: string = "",
): "FUEL" | "MAINTENANCE" | "OTHER" {
  if (value !== undefined) {
    if (value === "FUEL" || value === "MAINTENANCE" || value === "OTHER")
      return value;
    throw new ValidationError(
      "اختر نوع المصروف: سولار، صيانة، أو مصروفات أخرى.",
    );
  }
  // Compatibility for older clients that send only a free-text description.
  if (/سولار|وقود|بنزين|diesel|fuel|petrol|gasoline/i.test(category))
    return "FUEL";
  if (/صيانة|صيانه|تصليح|maintenance|repair/i.test(category))
    return "MAINTENANCE";
  return "OTHER";
}
