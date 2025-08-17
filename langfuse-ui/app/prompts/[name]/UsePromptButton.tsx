"use client";

import { useState } from "react";
import { UsePromptModal } from "./UsePromptModal";

export function UsePromptButton({ text, tags = [], name }: { text: string; tags?: string[]; name?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="px-3 py-2 rounded bg-[#FB5A17] text-white hover:opacity-90"
        onClick={() => setOpen(true)}
        title="Use this prompt"
      >
        🖊️ Use Prompt
      </button>
      {open && <UsePromptModal text={text} tags={tags} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}


