import { parseProfile } from "@/lib/agents/profileParser";
import { queryGraphForCandidates } from "@/lib/agents/graphQuery";
import { rankCandidates } from "@/lib/agents/ranker";
import { generateIceBreakers } from "@/lib/agents/iceBreaker";
import { findConnectionPaths } from "@/lib/neo4j";
import { SuperConnector } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const body = await request.json();
  const {
    profile_text,
    start_date,
    end_date,
    max_events = 5,
    max_people_per_event = 5,
  } = body;

  if (!profile_text) {
    return new Response(JSON.stringify({ error: "profile_text is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      function send(type: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
        );
      }

      try {
        // Step 1: Parse profile
        const profile = await parseProfile(profile_text, start_date, end_date);
        send("profile_parsed", profile);

        const startDate = profile.date_range.start;
        const endDate = profile.date_range.end;

        // Step 2: Query graph for candidates
        const graphData = await queryGraphForCandidates(
          profile,
          startDate,
          endDate
        );
        send("events_found", {
          event_count: graphData.events.length,
          candidate_count: graphData.candidates.length,
        });

        // Step 3: Rank candidates
        let recommendations = await rankCandidates(
          profile,
          graphData,
          max_events,
          max_people_per_event
        );
        send("ranking_complete", recommendations);

        // Step 4: Generate ice-breakers + connection paths IN PARALLEL
        const allPeopleLumaIds = recommendations.flatMap((r) =>
          r.people_to_meet.map((p) => p.luma_id)
        );
        const eventSlugs = recommendations.map((r) => r.event.slug);

        const [iceBreakerResult, connectionPaths] = await Promise.all([
          generateIceBreakers(profile, recommendations),
          findConnectionPaths(eventSlugs, allPeopleLumaIds),
        ]);
        recommendations = iceBreakerResult;
        send("ice_breakers_complete", recommendations);

        const connectionPathsArray = recommendations.flatMap((r) =>
          r.people_to_meet
            .filter((p) => connectionPaths.has(p.luma_id))
            .map((p) => {
              const cp = connectionPaths.get(p.luma_id)!;
              return {
                personName: p.name,
                personLumaId: p.luma_id,
                hops: cp.hops,
                via: cp.path,
              };
            })
        );

        send("graph_data", {
          nodeCount: graphData.graphScores.nodeCount,
          relCount: graphData.graphScores.relCount,
          communityCount: graphData.graphScores.communityCount,
          connectionPaths: connectionPathsArray,
          rocketRide: graphData.rocketRideResult,
        });

        // Step 6: Super connectors
        const superConnectors: SuperConnector[] = graphData.superConnectors
          .slice(0, 10)
          .map((sc) => ({
            name: (sc.name as string) || "",
            headline: (sc.headline as string) || "",
            linkedin_url: (sc.linkedin_url as string) || "",
            profile_pic: (sc.profile_pic as string) || "",
            event_count: Number(sc.event_count) || 0,
            events: (sc.event_names as string[]) || [],
            why_connect: `Attending ${sc.event_count} events — a key connector in the Bay Area tech scene.`,
          }));
        send("super_connectors", superConnectors);

        send("done", {
          user_profile: profile,
          recommendations,
          super_connectors: superConnectors,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        send("error", { message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
