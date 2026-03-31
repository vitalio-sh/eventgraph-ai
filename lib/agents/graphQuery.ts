import {
  getEventsInRange,
  getPeopleWithMatchingSkills,
  getPeopleFromCompanies,
  getSuperConnectors,
  computeGraphScores,
  getSecondDegreeConnections,
  scoreEventsByGraphDensity,
} from "../neo4j";
import { UserProfile, EventResult, PersonResult } from "../types";

interface CandidatePerson extends PersonResult {
  matching_skills: string[];
  shared_companies: string[];
  events: string[];
  pagerank_score: number;
  betweenness_score: number;
  community_id: number;
  graph_composite_score: number; // Pre-computed graph ranking score
  discovery_type: "skill_match" | "company_match" | "2nd_degree" | "combined";
}

export interface GraphCandidates {
  events: EventResult[];
  candidates: CandidatePerson[];
  superConnectors: Record<string, unknown>[];
  graphScores: {
    pageRank: Map<string, number>;
    betweenness: Map<string, number>;
    communities: Map<string, number>;
    nodeCount: number;
    relCount: number;
    communityCount: number;
  };
  eventGraphScores: Map<string, { skillRelevance: number; networkDensity: number; crossCompany: number }>;
}

export async function queryGraphForCandidates(
  profile: UserProfile,
  startDate: string,
  endDate: string
): Promise<GraphCandidates> {
  const companies = [profile.company, ...profile.past_companies].filter(Boolean);

  // Run ALL queries in parallel — including graph algorithms and 2nd-degree discovery
  const [events, skillMatches, companyMatches, secondDegree, superConnectors, graphScores, eventGraphScores] =
    await Promise.all([
      getEventsInRange(startDate, endDate),
      getPeopleWithMatchingSkills(profile.skills, startDate, endDate),
      getPeopleFromCompanies(companies, startDate, endDate),
      getSecondDegreeConnections(profile.skills, startDate, endDate),
      getSuperConnectors(startDate, endDate),
      computeGraphScores(startDate, endDate),
      scoreEventsByGraphDensity(profile.skills, startDate, endDate),
    ]);

  const candidateMap = new Map<string, CandidatePerson>();

  // Helper to create or update a candidate
  function upsertCandidate(
    row: Record<string, unknown>,
    discoveryType: CandidatePerson["discovery_type"],
    skills: string[],
    sharedCompanies: string[],
    events: string[]
  ) {
    const id = row.luma_id as string;
    if (!id) return;

    const existing = candidateMap.get(id);
    if (existing) {
      for (const s of skills) {
        if (!existing.matching_skills.includes(s)) existing.matching_skills.push(s);
      }
      for (const c of sharedCompanies) {
        if (c && !existing.shared_companies.includes(c)) existing.shared_companies.push(c);
      }
      for (const e of events) {
        if (!existing.events.includes(e)) existing.events.push(e);
      }
      if (discoveryType !== existing.discovery_type) existing.discovery_type = "combined";
    } else {
      candidateMap.set(id, {
        luma_id: id,
        name: (row.name as string) || "",
        headline: (row.headline as string) || "",
        about: (row.about as string) || "",
        company: (row.company as string) || "",
        job_title: (row.job_title as string) || "",
        linkedin_url: (row.linkedin_url as string) || "",
        profile_pic: (row.profile_pic as string) || "",
        connections: toNumber(row.connections),
        followers: toNumber(row.followers),
        twitter: (row.twitter as string) || "",
        website: (row.website as string) || "",
        email: (row.email as string) || "",
        matching_skills: skills,
        shared_companies: sharedCompanies.filter(Boolean),
        events,
        pagerank_score: graphScores.pageRank.get(id) || 0,
        betweenness_score: graphScores.betweenness.get(id) || 0,
        community_id: graphScores.communities.get(id) || 0,
        graph_composite_score: 0, // computed below
        discovery_type: discoveryType,
      });
    }
  }

  // 1. Direct skill matches (1st degree)
  for (const row of skillMatches) {
    upsertCandidate(
      row, "skill_match",
      (row.matching_skills as string[]) || [],
      [],
      (row.events as string[]) || []
    );
  }

  // 2. Company matches (1st degree)
  for (const row of companyMatches) {
    upsertCandidate(
      row, "company_match",
      [],
      [(row.shared_company as string) || ""],
      (row.events as string[]) || []
    );
  }

  // 3. Second-degree connections (graph traversal discovery!)
  for (const row of secondDegree) {
    upsertCandidate(
      row, "2nd_degree",
      (row.matching_skills as string[]) || [],
      [],
      (row.events as string[]) || []
    );
  }

  // 4. Compute graph composite score for pre-ranking
  //    This uses REAL graph signals, not just simple counts
  const maxPR = Math.max(...Array.from(graphScores.pageRank.values()), 0.001);
  const maxBC = Math.max(...Array.from(graphScores.betweenness.values()), 0.001);
  const maxSkills = Math.max(...Array.from(candidateMap.values()).map(c => c.matching_skills.length), 1);

  for (const [, candidate] of candidateMap) {
    const prNorm = (candidate.pagerank_score / maxPR);          // Graph influence
    const bcNorm = (candidate.betweenness_score / maxBC);       // Bridge potential
    const skillNorm = candidate.matching_skills.length / maxSkills; // Skill overlap
    const companyBonus = candidate.shared_companies.length > 0 ? 0.15 : 0;
    const secondDegreeBonus = candidate.discovery_type === "2nd_degree" ? 0.1 : 0;

    // Weighted composite: graph signals dominate
    candidate.graph_composite_score =
      0.30 * skillNorm +       // Skill alignment
      0.25 * prNorm +          // PageRank (graph)
      0.20 * bcNorm +          // Betweenness (graph)
      0.10 * Math.min(candidate.events.length / 3, 1) + // Multi-event presence
      companyBonus +           // Company overlap
      secondDegreeBonus;       // Discovered via graph traversal
  }

  // 5. Sort by graph composite score — LLM gets pre-ranked candidates
  const sortedCandidates = Array.from(candidateMap.values())
    .sort((a, b) => b.graph_composite_score - a.graph_composite_score);

  return {
    events,
    candidates: sortedCandidates,
    superConnectors,
    graphScores,
    eventGraphScores,
  };
}

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (val && typeof val === "object" && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || 0;
}
