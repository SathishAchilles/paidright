"use client";

import Link from "next/link";
import { useState } from "react";
import { SITE } from "@/lib/site";

function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com") || u.hostname.endsWith("youtube-nocookie.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/);
      return m ? m[1] : null;
    }
  } catch {
    return null;
  }
  return null;
}

const frame = "relative aspect-video w-full overflow-hidden rounded-2xl border border-hairline";

export function HomeVideo() {
  const [playing, setPlaying] = useState(false);
  const id = SITE.videoUrl ? youTubeId(SITE.videoUrl) : null;

  if (!id) {
    return (
      <div className={`${frame} flex flex-col items-center justify-center gap-6 bg-navy px-6 text-center on-dark`}>
        <p className="font-display text-2xl font-semibold text-white sm:text-3xl">Demo video coming soon</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={SITE.demoPath}
            className="inline-flex h-11 items-center justify-center rounded-[10px] bg-blue px-5 text-sm font-semibold text-white hover:bg-blue-strong"
          >
            Try it yourself
          </Link>
          <a
            href={SITE.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-[10px] border border-white/30 px-5 text-sm font-semibold text-white hover:border-white"
          >
            Explore the source code<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    );
  }

  if (playing) {
    return (
      <div className={frame}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`}
          title="PaidRight 3-minute demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={`${frame} group flex flex-col items-center justify-center gap-4 bg-navy text-white on-dark`}
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue group-hover:bg-blue-strong" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
      <span className="font-display text-xl font-semibold">Play the 3-minute demo</span>
      <span className="text-sm text-white/70">Loads YouTube when you press play</span>
    </button>
  );
}
