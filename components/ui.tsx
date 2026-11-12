"use client";

import { useState, type ButtonHTMLAttributes } from "react";
import type { GapClass } from "@/lib/types";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong border-accent",
  secondary: "bg-paper text-ink border-line hover:border-ink",
  ghost: "bg-transparent text-ink-soft border-transparent hover:text-ink underline underline-offset-4",
};

export function Button({
  variant = "secondary",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading && <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-danger">
      {error}
    </p>
  );
}

export function Card({ title, children, className = "" }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-paper p-5 ${className}`}>
      {title && <h2 className="mb-3 font-serif text-lg text-ink">{title}</h2>}
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none";

const gapStyles: Record<GapClass, string> = {
  PAID: "bg-ok-bg text-ok",
  UNDERPAID: "bg-danger-bg text-danger",
  UNPAID: "bg-warn-bg text-warn",
  NOT_INVOICED: "bg-accent-bg text-accent-strong",
  NOT_DUE: "bg-muted-bg text-ink-soft",
};

const gapLabels: Record<GapClass, string> = {
  PAID: "Paid",
  UNDERPAID: "Underpaid",
  UNPAID: "Unpaid",
  NOT_INVOICED: "Not invoiced",
  NOT_DUE: "Not due",
};

export function GapBadge({ gapClass }: { gapClass: GapClass }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide uppercase ${gapStyles[gapClass]}`}>
      {gapLabels[gapClass]}
    </span>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      className="px-0 py-0"
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
