import { NextResponse } from "next/server";

const LOCATIONS_API = "https://countriesnow.space/api/v0.1/countries";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim();
  const state = searchParams.get("state")?.trim();

  if (!country || country.length > 100 || (state && state.length > 120)) {
    return NextResponse.json(
      { message: "Choose a valid country and state." },
      { status: 400 },
    );
  }

  const endpoint = state ? "state/cities" : "states";
  const body = state ? { country, state } : { country };
  try {
    const response = await fetch(`${LOCATIONS_API}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);
    const entries = state ? result?.data : result?.data?.states;
    if (!response.ok || result?.error || !Array.isArray(entries)) {
      return NextResponse.json(
        { message: "The global location list is temporarily unavailable." },
        { status: 502 },
      );
    }

    const locations = entries
      .map((item) => (typeof item === "string" ? item : item?.name))
      .filter(
        (name) => typeof name === "string" && name.trim() && name.length <= 120,
      )
      .map((name) => name.trim());
    return NextResponse.json({ locations });
  } catch {
    return NextResponse.json(
      { message: "Could not load global locations. Please try again." },
      { status: 502 },
    );
  }
}
