import { z } from "zod";

export const restaurantSettingsSchema = z.object({
  name: z.string().min(2, "Restaurant name is required"),
  tagline: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  address_line1: z.string().min(3, "Address is required"),
  address_line2: z.string().optional().nullable(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Must be a valid 6-digit Indian PIN code"),
  country: z.string().default("India"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Must be a valid email address"),
  gst_number: z.string().optional().nullable(),
  fssai_license: z.string().optional().nullable(),
  currency: z.string().default("INR"),
  currency_symbol: z.string().default("₹"),
  timezone: z.string().default("Asia/Kolkata"),
  is_ordering_enabled: z.boolean().default(true),
  qr_scan_countdown_seconds: z.coerce.number().int().min(30, "Countdown must be at least 30 seconds").max(3600, "Countdown cannot exceed 3600 seconds (60 mins)").default(300),
});

export const businessHoursSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  day_name: z.string(),
  open_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be a valid time format (HH:MM:SS)"),
  close_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be a valid time format (HH:MM:SS)"),
  is_closed: z.boolean().default(false),
});

export const taxSettingSchema = z.object({
  name: z.string().min(2, "Tax name is required"),
  code: z.string().min(2, "Tax code is required"),
  rate_percentage: z.number().min(0, "Tax rate cannot be negative"),
  is_active: z.boolean().default(true),
  is_mandatory: z.boolean().default(true),
  is_inclusive: z.boolean().default(false),
  display_order: z.number().int().default(0),
});
