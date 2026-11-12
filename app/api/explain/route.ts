import type { ExplainRequest, ExplainResponse } from "@/lib/api-contract";
import { explainGap } from "@/lib/llm";

export async function POST(request: Request) {
  let body: Partial<ExplainRequest>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { deal, deliverableId, gap } = body ?? {};
  if (!deal || !Array.isArray(deal.deliverables) || !deal.terms) {
    return Response.json({ error: "deal is required" }, { status: 400 });
  }
  if (typeof deliverableId !== "string" || deliverableId === "") {
    return Response.json({ error: "deliverableId is required" }, { status: 400 });
  }
  if (!gap || typeof gap.gapClass !== "string" || typeof gap.dueMinor !== "number") {
    return Response.json({ error: "gap is required" }, { status: 400 });
  }
  if (!deal.deliverables.some((d) => d.id === deliverableId)) {
    return Response.json({ error: `Unknown deliverableId: ${deliverableId}` }, { status: 400 });
  }

  try {
    const result: ExplainResponse = await explainGap(deal, deliverableId, gap);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Explanation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
