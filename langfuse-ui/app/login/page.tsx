"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trackClient } from "../components/ClientAnalytics";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/prompts";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      try { trackClient("login_success", { username }); } catch {}
      router.push(next);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 p-6 border rounded bg-white">
        <h1 className="text-xl font-semibold text-[#003145]">Sign in</h1>
        <p className="text-sm text-gray-600">Use first.last and password "password"</p>
        {error ? <div className="p-2 bg-red-50 border border-red-200 text-sm text-red-700 rounded">{error}</div> : null}
        <div className="space-y-1">
          <label className="text-sm">Username</label>
          <input className="w-full px-3 py-2 border rounded" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="first.last" />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input className="w-full px-3 py-2 border rounded" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="w-full px-3 py-2 rounded bg-[#003145] text-white" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}


