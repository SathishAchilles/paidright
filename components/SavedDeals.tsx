"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { money } from "@/lib/format";
import { parseDeals, readDealsRaw, subscribeDeals } from "@/lib/store";
import { Card } from "./ui";

export function SavedDeals() {
  const raw = useSyncExternalStore(subscribeDeals, readDealsRaw, () => null);
  const deals = useMemo(() => parseDeals(raw), [raw]);
  return (
    <Card title="Saved deals">
      {deals.length === 0 ? (
        <p className="text-sm text-ink-soft">No deals yet. Extract a contract above to start one.</p>
      ) : (
        <ul className="divide-y divide-line">
          {deals.map((d) => (
            <li key={d.id}>
              <Link href={`/deal?id=${d.id}`} className="flex items-center justify-between py-3 hover:text-accent">
                <span>
                  <span className="font-medium">{d.brand || "Untitled brand"}</span>
                  <span className="ml-2 text-sm text-ink-soft">
                    {d.deliverables.length} deliverable{d.deliverables.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="tabular-nums">{money(d.totalMinor, d.currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
