"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setLoading(false);
      router.push("/login");
    }
  }

  return (
    <button
      onClick={logout}
      className="px-3 py-2 rounded text-[#003145] hover:bg-[#003145]/5"
      disabled={loading}
      title="Sign out"
      type="button"
    >
      {loading ? "Signing out…" : "Logout"}
    </button>
  );
}


