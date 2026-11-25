"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

/* Small toast used by the profile sub-pages (wishlist, vehicles, addresses, payments). */
export function useSectionNotice() {
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  return [notice, setNotice];
}

export function SectionNotice({ message }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="pf-card pf-shadow fixed inset-x-4 bottom-4 z-[95] mx-auto flex max-w-sm items-center gap-2 px-4 py-3 text-sm font-semibold sm:inset-x-auto sm:right-6"
    >
      <CheckCircle2 size={17} className="shrink-0 text-[var(--pf-brand)]" />
      <span className="min-w-0">{message}</span>
    </div>
  );
}
