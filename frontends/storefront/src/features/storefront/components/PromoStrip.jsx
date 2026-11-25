"use client";

import { useEffect, useState } from "react";
import { authApiBase } from "@/lib/authApi";

export default function PromoStrip() {
  const [content, setContent] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${authApiBase}/admin/public/content`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(data?.message || "Unable to load marketplace announcements.");
        return data;
      })
      .then((data) => {
        setContent(data);
        setError("");
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      });
    return () => controller.abort();
  }, []);

  const banner = content?.banners?.[0];
  const announcement = banner?.message || content?.announcement;
  return (
    <div className="bg-ink text-white">
      {announcement && (
        <a
          href="/parts"
          className="block bg-brand px-4 py-2 text-center text-xs font-bold text-white"
        >
          {banner?.title ? `${banner.title}: ` : ""}
          {announcement}
        </a>
      )}
      {error && (
        <p className="bg-red-900 px-4 py-1 text-center text-xs text-white" role="status">
          {error}
        </p>
      )}
      <div className="hidden md:block">
        <div className="site-container flex min-h-[40px] flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2 text-[11px] font-semibold">
          <div className="flex items-center gap-x-4">
            <a href="#" className="transition-colors text-[14px] hover:underline ">
              Shop JC Whitney Performance
            </a>
            <span className="text-white/40">|</span>
            <a href="#" className="transition-colors text-[14px] hover:underline">
              Shop CarParts Euro
            </a>
          </div>
          <div className="flex items-center gap-x-4">
            <span>Guaranteed to Fit</span>
            <span className="text-white/40">|</span>
            <span>Fast Shipping</span>
            <span className="text-white/40">|</span>
            <span>Hassle-Free Returns</span>
          </div>
        </div>
      </div>
    </div>
  );
}
