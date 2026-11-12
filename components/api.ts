export async function post<Req, Res>(path: string, body: Req): Promise<Res> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : `${path} failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
  if (json === null) throw new Error(`${path} returned an invalid response`);
  return json as Res;
}
