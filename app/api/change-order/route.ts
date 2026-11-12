import type { ChangeOrderRequest, ChangeOrderResponse } from "@/lib/api-contract";
import { changeOrder } from "@/lib/llm";

export async function POST(request: Request) {
  let body: Partial<ChangeOrderRequest>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { deal, event } = body ?? {};
  if (!deal || !Array.isArray(deal.deliverables) || !deal.terms) {
    return Response.json({ error: "deal is required" }, { status: 400 });
  }
  if (
    !event ||
    (event.kind !== "USAGE_EXPIRED" && event.kind !== "REVISIONS_EXCEEDED") ||
    !Number.isInteger(event.suggestedAmountMinor)
  ) {
    return Response.json({ error: "event with kind and suggestedAmountMinor is required" }, { status: 400 });
  }

  try {
    const result: ChangeOrderResponse = { changeOrder: await changeOrder(deal, event) };
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Change order failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
