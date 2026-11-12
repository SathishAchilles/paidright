"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";

export const TABS = [
  { id: "overview", label: "Overview" },
  { id: "deals", label: "My Deals" },
  { id: "payments", label: "Payments" },
  { id: "agent", label: "AI Agent" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

function isTab(v: string | null): v is TabId {
  return TABS.some((t) => t.id === v);
}

// Reads the active tab from ?tab= and updates it with history.pushState, which
// Next.js syncs into useSearchParams without a server round trip. Other params
// (id, guide) are preserved, so refresh, back and direct links all behave.
export function useWorkspaceTab(): [TabId, (tab: TabId) => void] {
  const raw = useSearchParams().get("tab");
  const tab: TabId = isTab(raw) ? raw : "overview";
  const setTab = useCallback((next: TabId) => {
    const params = new URLSearchParams(window.location.search);
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    window.history.pushState(null, "", `?${params.toString()}`);
  }, []);
  return [tab, setTab];
}

export function tabId(tab: TabId): string {
  return `workspace-tab-${tab}`;
}

export function panelId(tab: TabId): string {
  return `workspace-panel-${tab}`;
}

export function WorkspaceTabs({
  active,
  onSelect,
  badges = {},
}: {
  active: TabId;
  onSelect: (tab: TabId) => void;
  badges?: Partial<Record<TabId, string>>;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const id = TABS[next].id;
    onSelect(id);
    refs.current[id]?.focus();
  };

  return (
    <div
      id="workspace-tabs"
      role="tablist"
      aria-label="Deal workspace"
      onKeyDown={onKeyDown}
      className="grid scroll-mt-20 grid-cols-4 gap-1 rounded-card border border-line bg-paper p-1"
    >
      {TABS.map((t) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            id={tabId(t.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(t.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(t.id)}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue sm:px-3 sm:text-sm ${
              selected ? "bg-navy text-white" : "text-ink hover:bg-muted-bg"
            }`}
          >
            <span className="truncate">{t.label}</span>
            {badges[t.id] && (
              <span
                className={`hidden rounded-full px-1.5 text-[11px] font-semibold tabular-nums sm:inline ${
                  selected ? "bg-white/20 text-white" : "bg-amber-bg text-amber-ink"
                }`}
              >
                {badges[t.id]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
