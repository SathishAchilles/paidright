"use client";

import { useState } from "react";
import { toMajor, toMinor } from "@/lib/format";
import type { Minor } from "@/lib/types";
import { inputClass } from "./ui";

export function MoneyInput({
  value,
  onChange,
  prefix,
  className = "",
}: {
  value: Minor | null;
  onChange: (minor: Minor | null) => void;
  prefix?: string;
  className?: string;
}) {
  const [text, setText] = useState(toMajor(value));
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {prefix && <span className="text-sm text-ink-soft">{prefix}</span>}
      <input
        inputMode="decimal"
        className={`${inputClass} w-full text-right tabular-nums`}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          onChange(v.trim() === "" ? null : toMinor(v));
        }}
      />
    </div>
  );
}
