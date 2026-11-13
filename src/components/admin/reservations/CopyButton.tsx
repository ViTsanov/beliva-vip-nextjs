"use client";

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyText } from './workflow';

// Малък бутон „копирай“ с потвърждение „Копирано“ за 1,5 секунди.
export default function CopyButton({ text, label, showLabel = false, className = '' }: { text: string; label: string; showLabel?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        if (!text) return;
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
      aria-label={copied ? 'Копирано' : label}
      title={copied ? 'Копирано' : label}
      disabled={!text}
      className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-30 ${copied ? 'text-emerald-600' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-100'} ${className}`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {showLabel && <span>{copied ? 'Копирано' : label}</span>}
    </button>
  );
}
