"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

export function CopyButton({
  value,
  label = "نسخ",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={className ?? "btn-ghost btn-sm"}
      aria-live="polite"
    >
      {copied ? (
        <>
          <CheckIcon className="h-4 w-4 text-accent" />
          تم النسخ
        </>
      ) : (
        <>
          <CopyIcon className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}
