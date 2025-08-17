"use client";

import { useState } from "react";
import { trackClient } from "../../components/ClientAnalytics";

export function SharePromptButton() {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      try { trackClient("prompt_share", { path: window.location.pathname }); } catch {}
    } catch {
      // Fallback for browsers without clipboard permission
      window.prompt("Copy this link:", window.location.href);
    }
  }

  return (
    <button className="px-3 py-2 border rounded" onClick={onShare} title="Copy link to this prompt">
      {copied ? "👥 Copied!" : "👥 Share prompt"}
    </button>
  );
}


