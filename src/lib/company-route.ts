import { z } from "zod";

const optionalString = z.string().trim().max(255).optional();
const optionalDateTime = z
  .string()
  .trim()
  .max(40)
  .optional()
  .refine((value) => !value || Number.isFinite(Date.parse(value)), {
    message: "Invalid date-time value.",
  });

export const companyRouteStopSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  label: z.string().trim().min(2).max(120),
  address: optionalString,
  city: z.string().trim().max(120).optional(),
  zipCode: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(500).optional(),
  availableFrom: optionalDateTime,
  availableTo: optionalDateTime,
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

export const companyRouteStopsSchema = z
  .array(companyRouteStopSchema)
  .max(20, "You can save up to 20 route stops.")
  .superRefine((stops, ctx) => {
    stops.forEach((stop, index) => {
      if (!stop.address?.trim() && !stop.city?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "address"],
          message: "Route stop requires an address or city.",
        });
      }
    });
  });

function normalizeDateTime(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function serializeDateTime(value: string | Date | null) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export type CompanyRouteStopInput = z.infer<typeof companyRouteStopSchema>;

export function normalizeCompanyRouteStops(stops: CompanyRouteStopInput[]) {
  return stops.map((stop, index) => ({
    id: stop.id?.trim() || undefined,
    label: stop.label.trim(),
    address: stop.address?.trim() || null,
    city: stop.city?.trim() || null,
    zip_code: stop.zipCode?.trim() || null,
    notes: stop.notes?.trim() || null,
    available_from: normalizeDateTime(stop.availableFrom),
    available_to: normalizeDateTime(stop.availableTo),
    lat: stop.lat,
    lng: stop.lng,
    sort_order: index,
  }));
}

export function serializeCompanyRouteStops(
  stops: Array<{
    id: string;
    label: string;
    address: string | null;
    city: string | null;
    zip_code: string | null;
    notes: string | null;
    available_from: string | Date | null;
    available_to: string | Date | null;
    lat: number | { toString(): string };
    lng: number | { toString(): string };
  }>,
) {
  return stops.map((stop) => ({
    id: stop.id,
    label: stop.label,
    address: stop.address ?? "",
    city: stop.city ?? "",
    zipCode: stop.zip_code ?? "",
    notes: stop.notes ?? "",
    availableFrom: serializeDateTime(stop.available_from),
    availableTo: serializeDateTime(stop.available_to),
    lat: typeof stop.lat === "number" ? stop.lat : Number(stop.lat.toString()),
    lng: typeof stop.lng === "number" ? stop.lng : Number(stop.lng.toString()),
  }));
}