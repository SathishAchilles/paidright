import type { Metadata } from "next";
import { Suspense } from "react";
import { BrowserOnly } from "@/components/BrowserOnly";
import { NewDealForm } from "@/components/NewDealForm";
import { SavedDeals } from "@/components/SavedDeals";

export const metadata: Metadata = {
  title: "New deal · Paidright",
};

export default function NewDealPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Create a deal from your own contract</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Paste a brand-deal contract. Paidright finds the deliverables, amounts, and deadlines, turns approved work into
          PayPal invoices, and shows exactly what the brand still owes.
        </p>
      </div>
      <NewDealForm />
      <Suspense fallback={<p className="text-sm text-ink-soft">Loading saved deals…</p>}>
        <BrowserOnly>
          <SavedDeals />
        </BrowserOnly>
      </Suspense>
    </div>
  );
}
