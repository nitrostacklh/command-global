"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="flex h-screen w-screen bg-[#020617] items-center justify-center text-slate-400 font-mono text-xs">
      Redirecting to Tangent Hub...
    </div>
  );
}
