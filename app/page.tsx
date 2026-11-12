import { Suspense } from "react";
import { BrowserOnly } from "@/components/BrowserOnly";
import { NewDealForm } from "@/components/NewDealForm";
import { SavedDeals } from "@/components/SavedDeals";

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Paidright — get paid right for every brand deal</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Paste a brand-deal contract. Paidright turns approved deliverables into PayPal invoices, shows exactly what
          the brand still owes, and watches the clauses that earn you more.
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
