"use client";

import { useEffect, useState } from "react";

const CONFIRMATION_MS = 2000;

export function CopyButton({
  value,
  label = "Copy",
  ariaLabel
}: {
  value: string;
  label?: string;
  /** Describes what gets copied, e.g. "Copy contract address". Required when `label` is an icon. */
  ariaLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeout = setTimeout(() => setCopied(false), CONFIRMATION_MS);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={ariaLabel ?? (label === "Copy" ? "Copy to clipboard" : undefined)}
        className="text-xs font-medium text-gray-600 hover:underline"
      >
        {label}
      </button>
      <span
        role="status"
        aria-live="polite"
        className={`pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white transition-opacity ${
          copied ? "opacity-100" : "opacity-0"
        }`}
      >
        {copied ? "Copied!" : ""}
      </span>
    </span>
  );
}
