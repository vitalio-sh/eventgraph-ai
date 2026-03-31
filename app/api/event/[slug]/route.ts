import { NextRequest } from "next/server";
import { getEventBySlug } from "@/lib/neo4j";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const result = await getEventBySlug(slug);
    if (!result) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    return Response.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
