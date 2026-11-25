import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const vin = (new URL(request.url).searchParams.get("vin") || "").trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    return NextResponse.json({ error: "Enter a valid 17-character VIN." }, { status: 400 });
  }

  try {
    const endpoint = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`;
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    const payload = await response.json().catch(() => null);
    const result = payload?.Results?.[0];
    if (!response.ok || !result || (result.ErrorCode && !String(result.ErrorCode).startsWith("0"))) {
      return NextResponse.json({ error: "We could not decode this VIN. Check it and try again." }, { status: 422 });
    }

    return NextResponse.json({
      vehicle: {
        year: result.ModelYear || "",
        make: result.Make || "",
        model: result.Model || "",
        trim: result.Trim || "",
        displacement: result.DisplacementL || "",
      },
    });
  } catch {
    return NextResponse.json({ error: "VIN lookup is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
