import type { InvoiceRequest, InvoiceResponse } from "@/lib/api-contract";
import { createAndSendInvoice } from "@/lib/paypal";

// POST handlers are never cached; with cacheComponents enabled, `dynamic` and
// `runtime` segment exports are not allowed, so none are declared here.

const CURRENCIES = ["USD", "EUR", "GBP"];

function validate(body: Partial<InvoiceRequest> | null): string | null {
  if (!body || typeof body !== "object") return "Request body must be a JSON object";
  if (!body.currency || !CURRENCIES.includes(body.currency)) return "currency must be one of USD, EUR, GBP";
  if (!body.recipientEmail || typeof body.recipientEmail !== "string") return "recipientEmail is required";
  if (!body.recipientName || typeof body.recipientName !== "string") return "recipientName is required";
  if (!body.lineItem || typeof body.lineItem !== "string") return "lineItem is required";
  if (typeof body.amountMinor !== "number" || !Number.isInteger(body.amountMinor) || body.amountMinor <= 0) {
    return "amountMinor must be a positive integer (cents)";
  }
  if (typeof body.note !== "string") return "note is required";
  if (typeof body.dueInDays !== "number" || !Number.isFinite(body.dueInDays) || body.dueInDays < 0) {
    return "dueInDays must be a non-negative number";
  }
  return null;
}

export async function POST(request: Request) {
  let body: Partial<InvoiceRequest> | null;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const problem = validate(body);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  try {
    const invoice = await createAndSendInvoice(body as InvoiceRequest);
    const response: InvoiceResponse = { invoice };
    return Response.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create invoice";
    return Response.json({ error: message }, { status: 500 });
  }
}
