import type { RemindRequest, RemindResponse } from "@/lib/api-contract";
import { remindInvoice } from "@/lib/paypal";

export async function POST(request: Request) {
  let body: Partial<RemindRequest> | null;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body.paypalInvoiceId !== "string" || !body.paypalInvoiceId.trim()) {
    return Response.json({ error: "paypalInvoiceId is required" }, { status: 400 });
  }
  if (typeof body.subject !== "string" || !body.subject.trim()) {
    return Response.json({ error: "subject is required" }, { status: 400 });
  }
  if (typeof body.note !== "string" || !body.note.trim()) {
    return Response.json({ error: "note is required" }, { status: 400 });
  }

  try {
    await remindInvoice(body.paypalInvoiceId.trim(), body.subject, body.note);
    const response: RemindResponse = { ok: true, sentAt: new Date().toISOString() };
    return Response.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reminder";
    return Response.json({ error: message }, { status: 500 });
  }
}
