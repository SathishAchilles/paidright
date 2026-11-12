import type { RefreshRequest, RefreshResponse } from "@/lib/api-contract";
import { getInvoice } from "@/lib/paypal";

export async function POST(request: Request) {
  let body: Partial<RefreshRequest> | null;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body.paypalInvoiceId !== "string" || !body.paypalInvoiceId.trim()) {
    return Response.json({ error: "paypalInvoiceId is required" }, { status: 400 });
  }

  try {
    const invoice = await getInvoice(body.paypalInvoiceId.trim());
    const response: RefreshResponse = { invoice };
    return Response.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to refresh invoice";
    return Response.json({ error: message }, { status: 500 });
  }
}
