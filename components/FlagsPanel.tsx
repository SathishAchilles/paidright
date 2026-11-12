"use client";

import type { Flag } from "@/lib/types";
import { Card, CopyButton } from "./ui";

export function FlagsPanel({ flags }: { flags: Flag[] }) {
  if (flags.length === 0) return null;
  return (
    <Card title={`Contract flags (${flags.length})`}>
      <ul className="flex flex-col gap-4">
        {flags.map((f, i) => (
          <li key={i} className="border-l-2 border-warn pl-3">
            <p className="font-medium text-ink">{f.issue}</p>
            {f.sourceQuote && <p className="mt-1 text-xs text-ink-soft italic">&ldquo;{f.sourceQuote}&rdquo;</p>}
            <div className="mt-2 rounded-md bg-muted-bg p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Suggested clause</span>
                <CopyButton text={f.suggestedClause} />
              </div>
              <p className="text-ink">{f.suggestedClause}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
