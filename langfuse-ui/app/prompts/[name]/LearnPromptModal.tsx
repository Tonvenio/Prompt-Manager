"use client";

import { useEffect } from "react";
import { trackClient } from "../../components/ClientAnalytics";

function isYouTube(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {}
  return url;
}

export default function LearnPromptModal({ name, videoUrl, onClose }: { name: string; videoUrl: string; onClose: () => void }) {
  useEffect(() => {
    try { trackClient("tutorial_open", { name, videoUrl }); } catch {}
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [name, videoUrl, onClose]);

  const yt = isYouTube(videoUrl) ? toYouTubeEmbed(videoUrl) : "";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[10vh] p-6" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Learn this prompt</h3>
          <button className="px-2 py-1 border rounded" onClick={onClose}>×</button>
        </div>
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
          {yt ? (
            <iframe src={yt} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : (
            <video className="w-full h-full" src={videoUrl} controls />
          )}
        </div>
        <div className="text-xs text-[#003145]/60 mt-2">Tip: After the video, try the prompt and share your improvements.</div>
      </div>
    </div>
  );
}



