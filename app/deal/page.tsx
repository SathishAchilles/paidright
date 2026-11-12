import { Suspense } from "react";
import { BrowserOnly } from "@/components/BrowserOnly";
import { DealWorkspace } from "@/components/DealWorkspace";

export default function DealPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-soft">Loading deal…</p>}>
      <BrowserOnly>
        <DealWorkspace />
      </BrowserOnly>
    </Suspense>
  );
}
