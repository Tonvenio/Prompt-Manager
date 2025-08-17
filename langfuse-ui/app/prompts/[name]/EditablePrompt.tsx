"use client";

import { useEffect, useRef, useState } from "react";
import { UsePromptButton } from "./UsePromptButton";
import { ImproveClientMount } from "./ImproveClientMount";
import { SharePromptButton } from "./SharePromptButton";
import { CompareModal } from "./CompareModal";

export function EditablePrompt({ name, initialText, exposeSetText, hideLabel, tags = [] }: { name: string; initialText: string; exposeSetText?: (setter: (v: string) => void) => void; hideLabel?: boolean; tags?: string[] }) {
  const [text, setText] = useState<string>(initialText);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  function autoresize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    autoresize();
  }, []);

  useEffect(() => {
    exposeSetText?.((v: string) => setText(v));
  }, [exposeSetText]);

  useEffect(() => {
    autoresize();
  }, [text]);

  const [showCompare, setShowCompare] = useState(false);
  const [originalText, setOriginalText] = useState<string>(initialText);

  async function onSend() {
    // Open modal and kick off background compare; do not save immediately
    setShowCompare(true);
  }

  return (
    <div className="space-y-2">
      {!hideLabel && (
        <div className="font-semibold">Prompt</div>
      )}
      <textarea
        ref={taRef}
        className="w-full p-2 border rounded font-mono text-sm resize-none overflow-hidden"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter prompt content"
      />
      {!message && (
        <div className="text-sm italic text-gray-600">Modify a prompt before usage at any time. To save it, hit the 'update' button.</div>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <UsePromptButton text={text} tags={tags} />
        <button className="px-3 py-2 border rounded" onClick={onSend} disabled={saving}>
          {saving ? "Saving…" : "💾 Update Prompt"}
        </button>
        <ImproveClientMount promptText={text} name={name} />
        <SharePromptButton />
        {message ? <span className="text-sm text-gray-600">{message}</span> : null}
      </div>
      {showCompare && (
        <CompareModal
          promptOld={originalText}
          promptNew={text}
          name={name}
          onClose={() => { setShowCompare(false); setOriginalText(text); setMessage('Saved as new version.'); }}
        />
      )}
    </div>
  );
}


