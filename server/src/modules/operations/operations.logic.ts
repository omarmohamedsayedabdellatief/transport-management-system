import { ValidationError } from "../../types/index.js";

export function dateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new ValidationError("Use a valid date (YYYY-MM-DD).");
  const result = new Date(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(result.getTime()) ||
    result.toISOString().slice(0, 10) !== value
  )
    throw new ValidationError("Invalid calendar date.");
  return result;
}

// Convert a wall-clock service time to UTC without relying on the server timezone.
export function zonedDeparture(
  day: string,
  time: string,
  timezone: string,
): Date {
  dateOnly(day);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new ValidationError("Departure time must use HH:mm.");
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new ValidationError("Unknown time zone.");
  }
  const wall = Date.parse(`${day}T${time}:00Z`);
  const asWall = (instant: number) => {
    const p = Object.fromEntries(
      fmt.formatToParts(new Date(instant)).map((x) => [x.type, x.value]),
    );
    return Date.parse(
      `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`,
    );
  };
  let guess = wall;
  for (let i = 0; i < 4; i++) guess += wall - asWall(guess);
  if (asWall(guess) !== wall)
    throw new ValidationError(
      "This departure time does not exist because of a daylight-saving change.",
    );
  if (asWall(guess - 3600000) === wall || asWall(guess + 3600000) === wall)
    throw new ValidationError(
      "This departure time is ambiguous during a daylight-saving change. Choose a different time.",
    );
  return new Date(guess);
}

export const transitions: Record<string, string[]> = {
  SCHEDULED: ["IN_PROGRESS", "DELAYED", "CANCELLED"],
  DELAYED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "DELAYED"],
  COMPLETED: [],
  CANCELLED: [],
};
