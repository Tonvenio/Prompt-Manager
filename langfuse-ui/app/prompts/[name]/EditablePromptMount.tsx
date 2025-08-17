"use client";

import { EditablePrompt } from "./EditablePrompt";

export function EditablePromptMount({ name, initialText, hideLabel, tags = [] }: { name: string; initialText: string; hideLabel?: boolean; tags?: string[] }) {
  return (
    <EditablePrompt
      name={name}
      initialText={initialText}
      tags={tags}
      hideLabel={hideLabel}
      exposeSetText={(setter) => { (window as any).__setPromptText = setter; }}
    />
  );
}


