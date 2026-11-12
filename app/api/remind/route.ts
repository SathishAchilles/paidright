import type { RemindRequest, RemindResponse } from "@/lib/api-contract";
import { getInvoice, remindInvoice } from "@/lib/paypal";
import type { PayPalInvoiceStatus } from "@/lib/types";

const PAID: PayPalInvoiceStatus[] = ["PAID", "MARKED_AS_PAID"];
const NOT_REMINDABLE: PayPalInvoiceStatus[] = [
  "DRAFT",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "MARKED_AS_REFUNDED",
];

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

  const id = body.paypalInvoiceId.trim();
  try {
    const current = await getInvoice(id);
    if (PAID.includes(current.status) || (current.totalMinor > 0 && current.paidMinor >= current.totalMinor)) {
      const response: RemindResponse = { ok: false, reason: "ALREADY_PAID", invoice: current };
      return Response.json(response);
    }
    if (NOT_REMINDABLE.includes(current.status)) {
      const response: RemindResponse = { ok: false, reason: "NOT_REMINDABLE", invoice: current };
      return Response.json(response);
    }

    await remindInvoice(id, body.subject, body.note);
    const sentAt = new Date().toISOString();
    const invoice = await getInvoice(id).catch(() => current);
    const response: RemindResponse = { ok: true, sentAt, invoice: { ...invoice, lastReminderAt: sentAt } };
    return Response.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reminder";
    return Response.json({ error: message }, { status: 500 });
  }
}
