import type { ExtractRequest, ExtractResponse } from "@/lib/api-contract";
import { extract } from "@/lib/llm";

export async function POST(request: Request) {
  let body: Partial<ExtractRequest>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body?.contractText !== "string" || body.contractText.trim() === "") {
    return Response.json({ error: "contractText is required" }, { status: 400 });
  }

  try {
    const result: ExtractResponse = await extract(body.contractText);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
