"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { SITE } from "@/lib/site";

const LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "How it works", href: "/#how" },
  { label: "Watch demo", href: "/#watch" },
  { label: "GitHub", href: SITE.githubUrl, external: true },
];

const linkClass = "rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-muted-bg hover:text-navy";

function NavLink({ item, className, onClick }: { item: (typeof LINKS)[number]; className: string; onClick?: () => void }) {
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {item.label}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={item.href} className={className} onClick={onClick}>
      {item.label}
    </Link>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-navy" onClick={close}>
          paidright
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((item) => (
            <li key={item.label}>
              <NavLink item={item} className={linkClass} />
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href={SITE.demoPath}
            className="inline-flex h-10 items-center rounded-[10px] bg-blue px-4 text-sm font-semibold text-white hover:bg-blue-strong"
            onClick={close}
          >
            <span className="hidden sm:inline">Try live demo</span>
            <span className="sm:hidden">Try demo</span>
          </Link>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-hairline text-navy hover:bg-muted-bg md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      <div id={menuId} hidden={!open} className="border-t border-hairline bg-canvas md:hidden">
        <ul className="mx-auto flex max-w-[1200px] flex-col gap-1 px-4 py-3">
          {LINKS.map((item) => (
            <li key={item.label}>
              <NavLink item={item} className={`${linkClass} block py-3 text-base`} onClick={close} />
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
