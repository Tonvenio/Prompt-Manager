"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

export function ImproveModal({ promptText, onClose, onApply, name, status, result, setResult }: { promptText: string; onClose: () => void; onApply: (newText: string) => void; name: string; status: "waiting" | "done" | "error"; result: string; setResult: Dispatch<SetStateAction<string>> }) {

  // Remove internal fetching; the parent now handles the fetch and passes status/result

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[12vh] p-4 modal-container" onClick={onClose}>
      <div className="bg-white w-full max-w-xl md:w-[80vw] md:max-w-[80vw] rounded-2xl shadow-xl border p-5 modal-content overflow-hidden max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">🔧 Improving Prompt</h3>
          <button className="px-2 py-1 border rounded" onClick={onClose}>×</button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-grid">
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-600">Before</div>
              <textarea
                className="w-full h-64 md:h-[40vh] p-2 border rounded font-mono text-sm bg-gray-50 textarea-field box-border"
                value={promptText}
                readOnly
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-600">After {status === "waiting" ? "(loading…)" : "(editable)"}</div>
              <div className="relative">
                <textarea
                  className={`w-full h-64 md:h-[40vh] p-2 border rounded font-mono text-sm textarea-field box-border ${status === "waiting" ? "opacity-50" : ""}`}
                  value={result || (status === "waiting" ? "Loading improved prompt…" : "")}
                  onChange={(e) => setResult(e.target.value)}
                  readOnly={status !== "done"}
                />
                {status === "waiting" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div aria-label="Improving prompt" className="wrench-anim" />
                    <div className="mt-2 text-sm text-[#003145]">Working…</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <button className="px-3 py-2 rounded bg-[#003145] text-white disabled:opacity-60" disabled={status !== "done"} onClick={() => { onApply(result); onClose(); }}>Use new prompt</button>
            <button className="px-3 py-2 rounded border" onClick={onClose}>Disregard new prompt</button>
          </div>
        </div>
      </div>
      <style>{`
        .animate-bounce { animation: bounce 1s infinite; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
        
        /* Wrench animation */
        .wrench-anim {
          width: 96px;
          height: 96px;
          position: relative;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
          background: none;
        }
        .wrench-anim::before,
        .wrench-anim::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 72px;
          height: 72px;
          transform-origin: 50% 50%;
          background: none;
          mask-size: contain;
          -webkit-mask-size: contain;
          mask-repeat: no-repeat;
          -webkit-mask-repeat: no-repeat;
          mask-position: center;
          -webkit-mask-position: center;
        }
        /* Simple wrench silhouette via mask-path (inline SVG path as data URI) */
        .wrench-anim::before {
          background-color: #003145;
          -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>');
          mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>');
          transform: translate(-50%, -50%) rotate(0deg) scale(0.9);
          animation: wrench-rotate 1.8s linear infinite;
        }
        .wrench-anim::after {
          background-color: #FB5A17;
          -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(45,50,50)"><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>');
          mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(45,50,50)"><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>');
          transform: translate(-50%, -50%) rotate(0deg) scale(0.9);
          animation: wrench-rotate-rev 1.8s linear infinite;
          opacity: 0.95;
        }
        @keyframes wrench-rotate { from { transform: translate(-50%, -50%) rotate(0deg) scale(0.9); } to { transform: translate(-50%, -50%) rotate(360deg) scale(0.9); } }
        @keyframes wrench-rotate-rev { from { transform: translate(-50%, -50%) rotate(360deg) scale(0.9); } to { transform: translate(-50%, -50%) rotate(0deg) scale(0.9); } }
        
        /* Base mobile styles */
        .text-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        /* Tablet and larger - side by side */
        @media (min-width: 768px) {
          .text-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 1rem !important;
          }
          .modal-content {
            width: 80vw !important;
            max-width: 80vw !important;
            box-sizing: border-box !important;
          }
        }
        
        /* Landscape orientation - double size */
        @media (orientation: landscape) {
          .modal-container {
            padding-top: 6vh !important;
            padding: 0.5rem !important;
          }
          .modal-content {
            width: 80vw !important;
            max-width: 80vw !important;
            box-sizing: border-box !important;
          }
          .text-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 2rem !important;
          }
          .textarea-field {
            height: 60vh !important;
          }
        }
        
        /* Wide screens - ensure proper layout and larger fields */
        @media (min-width: 1200px) {
          .modal-content {
            width: 80vw !important;
            max-width: 80vw !important;
            box-sizing: border-box !important;
          }
          .text-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 3rem !important;
          }
          .textarea-field {
            height: 50vh !important;
            min-width: 500px !important;
          }
        }
        
        /* Extra wide screens in landscape - maximum size */
        @media (orientation: landscape) and (min-width: 1200px) {
          .modal-content {
            width: 80vw !important;
            max-width: 80vw !important;
          }
          .text-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 4rem !important;
          }
          .textarea-field {
            height: 60vh !important;
            min-width: 700px !important;
          }
        }
      `}</style>
    </div>
  );
}


