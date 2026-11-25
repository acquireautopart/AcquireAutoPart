"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sellerApi } from "@/features/seller/lib/sellerApi";
import { SignIn } from "@/features/seller/shared/components/SignIn";

export default function SellerPortalEntry({ initialMode = "login" }) {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    sellerApi.me()
      .then(() => {
        if (active) router.replace("/seller");
      })
      .catch((sessionError) => {
        if (!active) return;
        if (sessionError.status !== 401) setError(sessionError.message);
        setCheckingSession(false);
      });
    return () => { active = false; };
  }, [router]);

  if (checkingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] text-sm text-neutral-500 dark:bg-[#090909]">
        Opening your AcquireAuto seller account…
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] dark:bg-[#090909]">
      {error && (
        <p className="mx-auto max-w-md px-5 pt-5 text-center text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <SignIn
        initialMode={initialMode}
        onSuccess={(_seller, meta) =>
          router.replace(meta?.isNew ? "/seller/onboarding" : "/seller")
        }
      />
    </div>
  );
}
