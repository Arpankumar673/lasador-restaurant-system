import { NextResponse } from "next/server";
import { validateEnv } from "@/lib/validations/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const envCheck = validateEnv();

  return NextResponse.json(
    {
      status: "healthy",
      restaurant: "L'Asador – Grill & Brew",
      location: "Mohali, Punjab, India",
      architecture: "single-restaurant-dedicated",
      timestamp: new Date().toISOString(),
      environment: {
        isValid: envCheck.isValid,
        isConfigured: !Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder")
        ),
      },
    },
    { status: 200 }
  );
}
