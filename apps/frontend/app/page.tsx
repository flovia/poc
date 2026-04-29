"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProviders } from "./providers";

export default function RootRedirect() {
  const router = useRouter();
  const { stored, hydrated } = useProviders();

  useEffect(() => {
    if (!hydrated) return;
    if (stored.length > 0) {
      router.replace(`/providers/${stored[0].providerId}/customers`);
    } else {
      router.replace("/setup");
    }
  }, [hydrated, stored, router]);

  return (
    <main style={{ padding: 40 }}>
      <div className="sk" style={{ width: 220, height: 18, marginBottom: 10 }} />
      <div className="sk" style={{ width: 320, height: 14 }} />
    </main>
  );
}
