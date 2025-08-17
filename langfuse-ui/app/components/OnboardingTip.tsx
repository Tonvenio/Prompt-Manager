"use client";

import { useEffect, useState } from "react";

export function OnboardingTip({ openUserMenu }: { openUserMenu: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function run() {
      // If cookie already set, skip
      const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("onboarded_v1="));
      if (cookie) return;
      // Fetch profile; if missing language or area, show the tip
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = res.ok ? await res.json() : { profile: { language: "", area: "" } };
        const needsSetup = !data?.profile?.language || !data?.profile?.area;
        if (needsSetup && mounted) {
          await new Promise((r) => setTimeout(r, 300));
          if (mounted) setShow(true);
        }
      } catch {
        // If we can't load, still attempt to show once
        await new Promise((r) => setTimeout(r, 300));
        if (mounted) setShow(true);
      }
    }
    run();
    return () => { mounted = false; };
  }, []);

  async function dismiss() {
    setShow(false);
    try { await fetch("/api/auth/onboarded", { method: "POST" }); } catch {}
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-[15vh] p-6 pointer-events-none bg-black/40">
      <div
        className="pointer-events-auto bg-white border rounded shadow-lg p-6 w-full max-w-lg animate-[fadeIn_300ms_ease-out]"
        style={{
          animationName: "fadeIn",
          animationDuration: "300ms",
          animationTimingFunction: "ease-out",
        }}
      >
        <div className="text-xl font-semibold mb-2">Welcome!</div>
        <p className="text-base text-gray-700 mb-4">
          Please take a moment to set your main language and practice area. Open the user menu in the header and save your preferences.
        </p>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-[#003145] text-white" onClick={() => { openUserMenu(); dismiss(); }}>Open user menu</button>
          <button className="px-4 py-2 rounded border" onClick={dismiss}>Dismiss</button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}


