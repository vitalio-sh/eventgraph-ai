import { NextRequest } from "next/server";
import { getEventsInRange } from "@/lib/neo4j";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return Response.json(
      { error: "start and end query parameters are required" },
      { status: 400 }
    );
  }

  try {
    const events = await getEventsInRange(start, end);
    return Response.json({ events, count: events.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
