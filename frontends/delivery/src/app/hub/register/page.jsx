import Link from "next/link";
import HubRegistrationForm from "@/features/delivery/components/HubRegistrationForm";

export default function HubRegistrationPage() {
  return (
    <main className="min-h-screen bg-[#f4f5f6] px-5 py-8 text-[#17212b] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-extrabold tracking-tight">
            Acquire<span className="text-orange-600">Auto</span> Delivery
          </Link>
          <Link href="/dashboard" className="text-xs font-bold text-orange-700">
            Hub staff login
          </Link>
        </div>
        <HubRegistrationForm />
      </div>
    </main>
  );
}
