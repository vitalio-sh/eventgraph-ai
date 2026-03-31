import { NextRequest } from "next/server";
import { getPersonByLumaId } from "@/lib/neo4j";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lumaId: string }> }
) {
  const { lumaId } = await params;

  try {
    const person = await getPersonByLumaId(lumaId);
    if (!person) {
      return Response.json({ error: "Person not found" }, { status: 404 });
    }
    return Response.json(person);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
