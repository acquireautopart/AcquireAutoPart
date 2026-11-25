import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Photo search needs GOOGLE_VISION_API_KEY in the client server environment." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type) || file.size < 1 || file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Upload a JPEG, PNG, or WebP image up to 5 MB." }, { status: 400 });
    }

    const content = Buffer.from(await file.arrayBuffer()).toString("base64");
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ image: { content }, features: [{ type: "LABEL_DETECTION", maxResults: 8 }, { type: "TEXT_DETECTION", maxResults: 1 }] }] }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.responses?.[0]?.error) {
      return NextResponse.json({ error: "Photo recognition could not identify this image. Try a clearer image or search by part number." }, { status: 502 });
    }

    const result = payload.responses[0] || {};
    const labels = (result.labelAnnotations || []).map((item) => item.description).filter(Boolean);
    const text = (result.textAnnotations?.[0]?.description || "").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
    const query = [text, ...labels].join(" ").replace(/\s+/g, " ").trim().slice(0, 180);
    if (!query) return NextResponse.json({ error: "No part clues found. Try a photo that shows the part label or shape clearly." }, { status: 422 });
    return NextResponse.json({ query, labels });
  } catch {
    return NextResponse.json({ error: "Photo search is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
