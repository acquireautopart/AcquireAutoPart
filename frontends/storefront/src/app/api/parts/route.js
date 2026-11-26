import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/apiBase";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const incoming = new URL(request.url).searchParams;
  const searchTerms = [
    incoming.get("q"),
    incoming.get("make"),
    incoming.get("model"),
    incoming.get("trim"),
    incoming.get("engine"),
  ]
    .map((value) => value?.trim())
    .filter(Boolean);
  const params = new URLSearchParams({
    country: (incoming.get("country") || "US").toUpperCase(),
    page: incoming.get("page") || "1",
    pageSize: incoming.get("pageSize") || "24",
    sort: incoming.get("sort") || "featured",
  });
  if (searchTerms.length) params.set("q", searchTerms.join(" "));

  for (const key of ["year", "make", "model", "trim", "engine", "brand", "category", "searchAny", "minPrice", "maxPrice", "condition"]) {
    const value = incoming.get(key);
    if (value) params.set(key, value);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/catalog/products?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || "Unable to load marketplace products." },
        { status: response.status },
      );
    }

    return NextResponse.json({
      ...data,
      products: (data.products || []).map((product) => ({
        ...product,
        image: product.images?.[0] || "",
        oldPrice: product.compareAtPrice || null,
        tag: product.storeName || "AcquireAuto seller",
        variant: product.variants?.[0]?.name || "",
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "The marketplace catalog is unavailable. Please try again." },
      { status: 502 },
    );
  }
}
