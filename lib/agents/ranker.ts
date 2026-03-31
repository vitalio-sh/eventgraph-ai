import { chatCompletion } from "../llm";
import {
  UserProfile,
  EventResult,
  EventRecommendation,
  MatchedPerson,
} from "../types";
import { GraphCandidates } from "./graphQuery";

const SYSTEM_PROMPT = `You are a graph-powered networking strategist. You use Neo4j knowledge graph analysis to make data-driven recommendations. Each candidate has been scored using real graph algorithms run on a knowledge graph of 7,800+ nodes (people, events, skills, companies) and 53,000+ relationships.

## How the Graph Works

The knowledge graph connects People to Events (ATTENDS), Skills (HAS_SKILL), and Companies (WORKS_AT/HAS_EXPERIENCE). We ran three graph algorithms:

1. **PageRank** (pr 0-1): Network influence via graph structure. High PR = connected to important nodes recursively.

2. **Betweenness Centrality** (bc 0-1): Bridge connector score. High bc = bridges different communities. Can introduce user to new networks.

3. **Louvain Community** (cid): Community cluster ID. Same cid = similar skill/event neighborhood.

## Your Scoring Formula

Combine these signals into your relevance_score:
- 30% skill/interest alignment with user profile
- 25% graph PageRank (network influence)
- 20% graph betweenness (bridge potential — can they connect user to new clusters?)
- 15% "looking_for" match
- 10% role complementarity

## CRITICAL: Reference Graph Data in Your Reasoning

In "why_go": Mention the graph signals — e.g. "This event has 3 high-PageRank attendees and 2 bridge connectors linking AI and e-commerce communities."

In "relevance_reason": Reference the person's graph position — e.g. "Top 5% PageRank in the skill-event graph — a hub connecting AI agent builders across 4 events" or "High betweenness bridges the developer tooling and e-commerce communities."

Return ONLY valid JSON matching this schema:
{
  "recommendations": [
    {
      "event_slug": "string",
      "why_go": "string (2-3 sentences — MUST reference graph insights like PageRank concentration, bridge connectors, or community overlap)",
      "relevance_score": 0.0-1.0,
      "people_to_meet": [
        {
          "luma_id": "string",
          "relevance_score": 0.0-1.0,
          "relevance_reason": "string (1-2 sentences — MUST reference their graph centrality, bridge role, or community position)"
        }
      ]
    }
  ]
}

Return the top events sorted by relevance. Be specific — reference actual graph scores, skills, roles, and companies.`;

interface RankerOutput {
  recommendations: {
    event_slug: string;
    why_go: string;
    relevance_score: number;
    people_to_meet: {
      luma_id: string;
      relevance_score: number;
      relevance_reason: string;
    }[];
  }[];
}

export async function rankCandidates(
  profile: UserProfile,
  graphData: GraphCandidates,
  maxEvents: number = 5,
  maxPeoplePerEvent: number = 5
): Promise<EventRecommendation[]> {
  // ── Graph Pre-Ranking: pick top events and assign people BEFORE LLM ──
  // This uses graph scores to do the heavy lifting — LLM just writes text

  // Score events using graph-computed metrics
  const eventScores = new Map<string, number>();
  for (const e of graphData.events) {
    const gs = graphData.eventGraphScores?.get(e.slug);
    const skillRel = gs?.skillRelevance || 0;
    const crossCo = gs?.crossCompany || 0;
    const sizeFactor = Math.min(e.attendee_count / 200, 1);
    eventScores.set(e.slug, 0.5 * skillRel + 0.3 * crossCo + 0.2 * sizeFactor);
  }

  // Pre-select top events by graph score
  const topEvents = graphData.events
    .filter(e => eventScores.get(e.slug)! > 0)
    .sort((a, b) => (eventScores.get(b.slug) || 0) - (eventScores.get(a.slug) || 0))
    .slice(0, maxEvents + 3); // give LLM a few extra to choose from

  // Pre-assign top candidates to each event (candidates are already sorted by graph_composite_score)
  const eventCandidates = new Map<string, typeof graphData.candidates>();
  for (const e of topEvents) {
    const candidates = graphData.candidates
      .filter(c => c.events.includes(e.title))
      .slice(0, maxPeoplePerEvent + 2);
    eventCandidates.set(e.slug, candidates);
  }

  // Normalize graph scores for the LLM payload
  const maxPR = Math.max(...graphData.candidates.map((c) => c.pagerank_score || 0), 0.001);
  const maxBC = Math.max(...graphData.candidates.map((c) => c.betweenness_score || 0), 0.001);

  // Build slim payload — only pre-selected events with their pre-ranked people
  const preRankedEvents = topEvents.map(e => ({
    slug: e.slug,
    title: e.title,
    description: e.description?.slice(0, 120),
    date: e.date,
    city: e.city,
    attendee_count: e.attendee_count,
    graph_event_score: Math.round((eventScores.get(e.slug) || 0) * 100) / 100,
    top_people: (eventCandidates.get(e.slug) || []).map(c => ({
      luma_id: c.luma_id,
      name: c.name,
      headline: c.headline?.slice(0, 80),
      company: c.company,
      matching_skills: c.matching_skills.slice(0, 5),
      pr: Math.round(((c.pagerank_score || 0) / maxPR) * 100) / 100,
      bc: Math.round(((c.betweenness_score || 0) / maxBC) * 100) / 100,
      cid: c.community_id || 0,
      composite: Math.round(c.graph_composite_score * 100) / 100,
      discovery: c.discovery_type,
    })),
  }));

  const userMessage = JSON.stringify({
    user_profile: {
      name: profile.name,
      role: profile.current_role,
      company: profile.company,
      skills: profile.skills.slice(0, 15),
      interests: profile.interests.slice(0, 8),
      looking_for: profile.looking_for,
    },
    pre_ranked_events: preRankedEvents,
    max_events: maxEvents,
    max_people_per_event: maxPeoplePerEvent,
  });

  const raw = await chatCompletion(SYSTEM_PROMPT, userMessage, {
    temperature: 0.4,
    max_tokens: 4096,
  });

  const jsonStr = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(jsonStr) as RankerOutput;

  const eventMap = new Map<string, EventResult>();
  for (const e of graphData.events) {
    eventMap.set(e.slug, e);
  }

  const candidateMap = new Map<
    string,
    GraphCandidates["candidates"][number]
  >();
  for (const c of graphData.candidates) {
    candidateMap.set(c.luma_id, c);
  }

  const recommendations: EventRecommendation[] = [];

  // Build a lookup for normalized graph scores per candidate
  const normalizedScores = new Map<string, { pr: number; bc: number; cid: number }>();
  for (const c of graphData.candidates) {
    normalizedScores.set(c.luma_id, {
      pr: (c.pagerank_score || 0) / maxPR,
      bc: (c.betweenness_score || 0) / maxBC,
      cid: c.community_id || 0,
    });
  }

  for (const rec of parsed.recommendations.slice(0, maxEvents)) {
    const event = eventMap.get(rec.event_slug);
    if (!event) continue;

    const people: MatchedPerson[] = [];
    for (const pm of rec.people_to_meet.slice(0, maxPeoplePerEvent)) {
      const candidate = candidateMap.get(pm.luma_id);
      if (!candidate) continue;
      const scores = normalizedScores.get(pm.luma_id);
      people.push({
        ...candidate,
        relevance_score: pm.relevance_score,
        relevance_reason: pm.relevance_reason,
        ice_breaker: "",
        pagerank_score: scores ? Math.round(scores.pr * 100) / 100 : 0,
        betweenness_score: scores ? Math.round(scores.bc * 100) / 100 : 0,
        community_id: scores?.cid || 0,
      });
    }

    // Compute graph_score for event based on average pagerank of attendees in people_to_meet
    const avgPR =
      people.length > 0
        ? people.reduce((sum, p) => sum + (p.pagerank_score || 0), 0) / people.length
        : 0;
    const bridgeConnectors = people.filter((p) => (p.betweenness_score || 0) > 0.3).length;

    recommendations.push({
      event,
      why_go: rec.why_go,
      relevance_score: rec.relevance_score,
      people_to_meet: people,
      graph_score: Math.round(avgPR * 100) / 100,
      bridge_connectors: bridgeConnectors,
    });
  }

  return recommendations;
}
