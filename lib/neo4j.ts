import neo4j, { Driver } from "neo4j-driver";
import { EventResult, PersonResult } from "./types";

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
    );
  }
  return driver;
}

export async function runQuery<T>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const session = getDriver().session({
    database: process.env.NEO4J_DATABASE || "neo4j",
  });
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject() as T);
  } finally {
    await session.close();
  }
}

export async function getEventsInRange(
  start: string,
  end: string
): Promise<EventResult[]> {
  const cypher = `
    MATCH (e:Event)-[:ON_DATE]->(d:Date)
    WHERE d.date >= $start_date AND d.date <= $end_date
    OPTIONAL MATCH (e)-[:IN_CITY]->(c:City)
    OPTIONAL MATCH (e)-[:HOSTED_BY]->(h:Host)
    OPTIONAL MATCH (p:Person)-[:ATTENDS]->(e)
    RETURN e, c.name AS city, collect(DISTINCT h.name) AS hosts, count(DISTINCT p) AS attendee_count
    ORDER BY attendee_count DESC
  `;
  const rows = await runQuery<Record<string, unknown>>(cypher, {
    start_date: start,
    end_date: end,
  });

  return rows.map((row) => {
    const e = row.e as Record<string, unknown>;
    const props = (e as { properties: Record<string, unknown> }).properties || e;
    return {
      slug: (props.slug as string) || "",
      api_id: (props.api_id as string) || "",
      title: (props.title as string) || "",
      description: (props.description as string) || "",
      date: (props.date as string) || "",
      start: (props.start as string) || "",
      end: (props.end as string) || "",
      venue: (props.venue as string) || "",
      city: (row.city as string) || "",
      url: (props.url as string) || "",
      cover_url: (props.cover_url as string) || "",
      hosts: (row.hosts as string[]) || [],
      attendee_count: toNumber(row.attendee_count),
      calendar_name: (props.calendar_name as string) || "",
    };
  });
}

export async function getPeopleWithMatchingSkills(
  skills: string[],
  start: string,
  end: string
): Promise<Record<string, unknown>[]> {
  if (skills.length === 0) return [];
  const cypher = `
    MATCH (e:Event)-[:ON_DATE]->(d:Date)
    WHERE d.date >= $start_date AND d.date <= $end_date
    MATCH (p:Person)-[:ATTENDS]->(e)
    MATCH (p)-[:HAS_SKILL]->(s:Skill)
    WHERE s.name IN $user_skills
    WITH p, collect(DISTINCT s.name) AS matching_skills, collect(DISTINCT e.title) AS events, count(DISTINCT s) AS skill_overlap
    OPTIONAL MATCH (p)-[:WORKS_AT]->(co:Company)
    RETURN p.luma_id AS luma_id, p.name AS name, p.headline AS headline, p.about AS about,
           co.name AS company, p.job_title AS job_title, p.linkedin_url AS linkedin_url,
           p.profile_pic AS profile_pic, p.connections AS connections, p.followers AS followers,
           p.twitter AS twitter, p.website AS website, p.email AS email,
           matching_skills, events, skill_overlap
    ORDER BY skill_overlap DESC
    LIMIT 50
  `;
  return runQuery<Record<string, unknown>>(cypher, {
    user_skills: skills,
    start_date: start,
    end_date: end,
  });
}

export async function getPeopleFromCompanies(
  companies: string[],
  start: string,
  end: string
): Promise<Record<string, unknown>[]> {
  if (companies.length === 0) return [];
  const cypher = `
    MATCH (p:Person)-[:HAS_EXPERIENCE]->(exp:Experience)-[:AT_COMPANY]->(c:Company)
    WHERE c.name IN $user_companies
    MATCH (p)-[:ATTENDS]->(e:Event)-[:ON_DATE]->(d:Date)
    WHERE d.date >= $start_date AND d.date <= $end_date
    OPTIONAL MATCH (p)-[:WORKS_AT]->(co:Company)
    RETURN p.luma_id AS luma_id, p.name AS name, p.headline AS headline, p.about AS about,
           co.name AS company, p.job_title AS job_title, p.linkedin_url AS linkedin_url,
           p.profile_pic AS profile_pic, p.connections AS connections,
           c.name AS shared_company, exp.title AS their_role,
           collect(DISTINCT e.title) AS events
  `;
  return runQuery<Record<string, unknown>>(cypher, {
    user_companies: companies,
    start_date: start,
    end_date: end,
  });
}

export async function getSuperConnectors(
  start: string,
  end: string
): Promise<Record<string, unknown>[]> {
  const cypher = `
    MATCH (p:Person)-[:ATTENDS]->(e:Event)-[:ON_DATE]->(d:Date)
    WHERE d.date >= $start_date AND d.date <= $end_date
    WITH p, collect(DISTINCT e) AS events, count(DISTINCT e) AS event_count
    WHERE event_count >= 3
    OPTIONAL MATCH (p)-[:WORKS_AT]->(co:Company)
    RETURN p.name AS name, p.headline AS headline, p.about AS about,
           p.linkedin_url AS linkedin_url, p.profile_pic AS profile_pic,
           co.name AS company, event_count,
           [ev IN events | ev.title] AS event_names
    ORDER BY event_count DESC
  `;
  return runQuery<Record<string, unknown>>(cypher, {
    start_date: start,
    end_date: end,
  });
}

export async function getEventBySlug(slug: string): Promise<{
  event: EventResult;
  attendees: PersonResult[];
} | null> {
  const cypher = `
    MATCH (e:Event {slug: $slug})
    OPTIONAL MATCH (e)-[:IN_CITY]->(c:City)
    OPTIONAL MATCH (e)-[:HOSTED_BY]->(h:Host)
    OPTIONAL MATCH (p:Person)-[:ATTENDS]->(e)
    OPTIONAL MATCH (p)-[:WORKS_AT]->(co:Company)
    RETURN e, c.name AS city, collect(DISTINCT h.name) AS hosts,
           collect(DISTINCT {
             luma_id: p.luma_id, name: p.name, headline: p.headline,
             about: p.about, company: co.name, job_title: p.job_title,
             linkedin_url: p.linkedin_url, profile_pic: p.profile_pic,
             connections: p.connections, followers: p.followers,
             twitter: p.twitter, website: p.website, email: p.email
           }) AS attendees
  `;
  const rows = await runQuery<Record<string, unknown>>(cypher, { slug });
  if (rows.length === 0) return null;

  const row = rows[0];
  const e = row.e as Record<string, unknown>;
  const props = (e as { properties: Record<string, unknown> }).properties || e;
  const event: EventResult = {
    slug: (props.slug as string) || "",
    api_id: (props.api_id as string) || "",
    title: (props.title as string) || "",
    description: (props.description as string) || "",
    date: (props.date as string) || "",
    start: (props.start as string) || "",
    end: (props.end as string) || "",
    venue: (props.venue as string) || "",
    city: (row.city as string) || "",
    url: (props.url as string) || "",
    cover_url: (props.cover_url as string) || "",
    hosts: (row.hosts as string[]) || [],
    attendee_count: 0,
    calendar_name: (props.calendar_name as string) || "",
  };

  const attendees = ((row.attendees as Record<string, unknown>[]) || [])
    .filter((a) => a.luma_id)
    .map((a) => ({
      luma_id: (a.luma_id as string) || "",
      name: (a.name as string) || "",
      headline: (a.headline as string) || "",
      about: (a.about as string) || "",
      company: (a.company as string) || "",
      job_title: (a.job_title as string) || "",
      linkedin_url: (a.linkedin_url as string) || "",
      profile_pic: (a.profile_pic as string) || "",
      connections: toNumber(a.connections),
      followers: toNumber(a.followers),
      twitter: (a.twitter as string) || "",
      website: (a.website as string) || "",
      email: (a.email as string) || "",
    }));

  event.attendee_count = attendees.length;
  return { event, attendees };
}

export async function getPersonByLumaId(
  lumaId: string
): Promise<Record<string, unknown> | null> {
  const cypher = `
    MATCH (p:Person {luma_id: $lumaId})
    OPTIONAL MATCH (p)-[:WORKS_AT]->(co:Company)
    OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
    OPTIONAL MATCH (p)-[:HAS_EXPERIENCE]->(exp:Experience)-[:AT_COMPANY]->(ec:Company)
    OPTIONAL MATCH (p)-[:ATTENDS]->(e:Event)
    RETURN p, co.name AS company,
           collect(DISTINCT s.name) AS skills,
           collect(DISTINCT {title: exp.title, company: ec.name}) AS experiences,
           collect(DISTINCT {title: e.title, slug: e.slug}) AS events
  `;
  const rows = await runQuery<Record<string, unknown>>(cypher, { lumaId });
  if (rows.length === 0) return null;

  const row = rows[0];
  const p = row.p as Record<string, unknown>;
  const props = (p as { properties: Record<string, unknown> }).properties || p;
  return {
    luma_id: (props.luma_id as string) || "",
    name: (props.name as string) || "",
    headline: (props.headline as string) || "",
    about: (props.about as string) || "",
    company: (row.company as string) || "",
    job_title: (props.job_title as string) || "",
    linkedin_url: (props.linkedin_url as string) || "",
    profile_pic: (props.profile_pic as string) || "",
    connections: toNumber(props.connections),
    followers: toNumber(props.followers),
    twitter: (props.twitter as string) || "",
    website: (props.website as string) || "",
    email: (props.email as string) || "",
    skills: row.skills,
    experiences: row.experiences,
    events: row.events,
  };
}

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (val && typeof val === "object" && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || 0;
}

// ─── Real Graph-Powered Queries ─────────────────────────────────────────────

/**
 * 2nd-degree skill discovery: Find people who share skills with people
 * who share skills with the user. Pure graph traversal — can't do this in SQL.
 * Path: User Skills → Skill ← HAS_SKILL ← Person → ATTENDS → Event
 *                                              ↓
 *                                         HAS_SKILL → Skill (new skills!)
 */
export async function getSecondDegreeConnections(
  skills: string[],
  start: string,
  end: string
): Promise<Record<string, unknown>[]> {
  if (skills.length === 0) return [];
  const cypher = `
    // Find "skill neighbors" — people who share skills with user's skill-matches
    MATCH (s1:Skill)<-[:HAS_SKILL]-(bridge:Person)-[:HAS_SKILL]->(s2:Skill)
    WHERE s1.name IN $user_skills AND NOT s2.name IN $user_skills
    WITH bridge, collect(DISTINCT s1.name) AS shared_with_user, collect(DISTINCT s2.name) AS new_skills
    WHERE size(shared_with_user) >= 2

    // Only people attending events in range
    MATCH (bridge)-[:ATTENDS]->(e:Event)-[:ON_DATE]->(d:Date)
    WHERE d.date >= $start_date AND d.date <= $end_date

    OPTIONAL MATCH (bridge)-[:WORKS_AT]->(co:Company)
    RETURN bridge.luma_id AS luma_id, bridge.name AS name, bridge.headline AS headline,
           bridge.about AS about, co.name AS company, bridge.job_title AS job_title,
           bridge.linkedin_url AS linkedin_url, bridge.profile_pic AS profile_pic,
           bridge.connections AS connections, bridge.followers AS followers,
           bridge.twitter AS twitter, bridge.website AS website, bridge.email AS email,
           shared_with_user AS matching_skills, new_skills,
           collect(DISTINCT e.title) AS events,
           size(shared_with_user) AS overlap
    ORDER BY overlap DESC
    LIMIT 20
  `;
  return runQuery<Record<string, unknown>>(cypher, {
    user_skills: skills,
    start_date: start,
    end_date: end,
  });
}

/**
 * Co-attendance network: Find events where the SAME high-value people cluster.
 * Uses graph pattern to find events connected by shared attendees.
 * Path: Event1 ← ATTENDS ← Person → ATTENDS → Event2
 */
export async function getEventClusters(
  start: string,
  end: string
): Promise<Record<string, unknown>[]> {
  const cypher = `
    MATCH (e1:Event)-[:ON_DATE]->(d1:Date)
    WHERE d1.date >= $start_date AND d1.date <= $end_date
    MATCH (e2:Event)-[:ON_DATE]->(d2:Date)
    WHERE d2.date >= $start_date AND d2.date <= $end_date AND e1.slug < e2.slug

    // Find people attending both events (graph bridge)
    MATCH (p:Person)-[:ATTENDS]->(e1), (p)-[:ATTENDS]->(e2)

    WITH e1, e2, count(p) AS shared_attendees, collect(p.name)[0..5] AS sample_people
    WHERE shared_attendees >= 5

    RETURN e1.slug AS event1_slug, e1.title AS event1,
           e2.slug AS event2_slug, e2.title AS event2,
           shared_attendees,
           sample_people
    ORDER BY shared_attendees DESC
    LIMIT 20
  `;
  return runQuery<Record<string, unknown>>(cypher, {
    start_date: start,
    end_date: end,
  });
}

/**
 * Graph-based event scoring: Score events by the quality of their attendee network.
 * Uses multi-hop traversal to count skill diversity and cross-company connections.
 */
export async function scoreEventsByGraphDensity(
  skills: string[],
  start: string,
  end: string
): Promise<Map<string, { skillRelevance: number; networkDensity: number; crossCompany: number }>> {
  const cypher = `
    MATCH (e:Event)-[:ON_DATE]->(d:Date)
    WHERE d.date >= $start_date AND d.date <= $end_date
    MATCH (p:Person)-[:ATTENDS]->(e)

    // Count matching skills via graph traversal
    OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
    WHERE s.name IN $user_skills

    // Count unique companies for cross-company diversity
    OPTIONAL MATCH (p)-[:WORKS_AT]->(co:Company)

    WITH e,
         count(DISTINCT p) AS attendees,
         count(DISTINCT s) AS total_skill_matches,
         count(DISTINCT co) AS unique_companies,
         count(DISTINCT CASE WHEN s IS NOT NULL THEN p END) AS people_with_overlap

    RETURN e.slug AS slug,
           toFloat(people_with_overlap) / CASE WHEN attendees = 0 THEN 1 ELSE attendees END AS skill_relevance,
           toFloat(unique_companies) / CASE WHEN attendees = 0 THEN 1 ELSE attendees END AS cross_company,
           attendees AS network_size
    ORDER BY skill_relevance DESC
  `;
  const rows = await runQuery<Record<string, unknown>>(cypher, {
    user_skills: skills,
    start_date: start,
    end_date: end,
  });

  const result = new Map<string, { skillRelevance: number; networkDensity: number; crossCompany: number }>();
  for (const row of rows) {
    result.set(row.slug as string, {
      skillRelevance: toNumber(row.skill_relevance),
      networkDensity: toNumber(row.network_size),
      crossCompany: toNumber(row.cross_company),
    });
  }
  return result;
}

// ─── GDS Graph Algorithm Functions ───────────────────────────────────────────

// In-memory cache for GDS scores — the graph doesn't change between requests
let gdsCache: {
  pageRank: Map<string, number>;
  betweenness: Map<string, number>;
  communities: Map<string, number>;
  nodeCount: number;
  relCount: number;
  communityCount: number;
  cachedAt: number;
} | null = null;

const GDS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function computeGraphScores(
  start: string,
  end: string
): Promise<{
  pageRank: Map<string, number>;
  betweenness: Map<string, number>;
  communities: Map<string, number>;
  nodeCount: number;
  relCount: number;
  communityCount: number;
}> {
  // Return cached scores if fresh
  if (gdsCache && Date.now() - gdsCache.cachedAt < GDS_CACHE_TTL) {
    return gdsCache;
  }

  const graphName = `eg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session = getDriver().session({
    database: process.env.NEO4J_DATABASE || "neo4j",
  });

  const pageRank = new Map<string, number>();
  const betweenness = new Map<string, number>();
  const communities = new Map<string, number>();
  let nodeCount = 0;
  let relCount = 0;
  let communityCount = 0;

  try {
    // 1. Drop existing projection if any (ignore errors)
    try {
      await session.run(`CALL gds.graph.drop($name, false)`, { name: graphName });
    } catch {
      // ignore — projection may not exist
    }

    // 2. Create projection with ATTENDS + HAS_SKILL relationships
    const projResult = await session.run(
      `MATCH (source)-[r:ATTENDS|HAS_SKILL]->(target)
       WITH gds.graph.project($name, source, target, {
         sourceNodeLabels: labels(source),
         targetNodeLabels: labels(target),
         relationshipType: type(r)
       }, {undirectedRelationshipTypes: ['*'], memory: '2GB'}) AS g
       RETURN g.graphName AS graph, g.nodeCount AS nodes, g.relationshipCount AS rels`,
      { name: graphName }
    );
    if (projResult.records.length > 0) {
      nodeCount = toNumber(projResult.records[0].get("nodes"));
      relCount = toNumber(projResult.records[0].get("rels"));
    }

    // 3. Run PageRank
    const prResult = await session.run(
      `CALL gds.pageRank.stream($name)
       YIELD nodeId, score
       WITH gds.util.asNode(nodeId) AS node, score
       WHERE 'Person' IN labels(node) AND node.luma_id IS NOT NULL
       RETURN node.luma_id AS luma_id, score
       ORDER BY score DESC`,
      { name: graphName }
    );
    for (const rec of prResult.records) {
      pageRank.set(rec.get("luma_id") as string, toNumber(rec.get("score")));
    }

    // 4. Run Betweenness Centrality
    const bcResult = await session.run(
      `CALL gds.betweenness.stream($name)
       YIELD nodeId, score
       WITH gds.util.asNode(nodeId) AS node, score
       WHERE 'Person' IN labels(node) AND node.luma_id IS NOT NULL
       RETURN node.luma_id AS luma_id, score
       ORDER BY score DESC`,
      { name: graphName }
    );
    for (const rec of bcResult.records) {
      betweenness.set(rec.get("luma_id") as string, toNumber(rec.get("score")));
    }

    // 5. Run Louvain Community Detection
    const lvResult = await session.run(
      `CALL gds.louvain.stream($name)
       YIELD nodeId, communityId
       WITH gds.util.asNode(nodeId) AS node, communityId
       WHERE 'Person' IN labels(node) AND node.luma_id IS NOT NULL
       RETURN node.luma_id AS luma_id, communityId`,
      { name: graphName }
    );
    const communityIds = new Set<number>();
    for (const rec of lvResult.records) {
      const cid = toNumber(rec.get("communityId"));
      communities.set(rec.get("luma_id") as string, cid);
      communityIds.add(cid);
    }
    communityCount = communityIds.size;
  } finally {
    // 6. Always drop the projection
    try {
      await session.run(`CALL gds.graph.drop($name, false)`, { name: graphName });
    } catch {
      // ignore cleanup errors
    }
    await session.close();
  }

  // Cache the results
  gdsCache = { pageRank, betweenness, communities, nodeCount, relCount, communityCount, cachedAt: Date.now() };
  return gdsCache;
}

export async function findConnectionPaths(
  userEvents: string[],
  personLumaIds: string[]
): Promise<Map<string, { hops: number; path: string[]; relTypes: string[] }>> {
  const result = new Map<string, { hops: number; path: string[]; relTypes: string[] }>();
  if (userEvents.length === 0 || personLumaIds.length === 0) return result;

  const session = getDriver().session({
    database: process.env.NEO4J_DATABASE || "neo4j",
  });

  try {
    const queryResult = await session.run(
      `UNWIND $personIds AS pid
       MATCH (p:Person {luma_id: pid})
       UNWIND $eventSlugs AS slug
       MATCH (e:Event {slug: slug})
       MATCH path = shortestPath((e)-[*..4]-(p))
       WITH pid, path, length(path) AS hops
       ORDER BY hops ASC
       WITH pid, collect(path)[0] AS bestPath, min(hops) AS minHops
       RETURN pid AS luma_id,
              minHops AS hops,
              [n IN nodes(bestPath) | coalesce(n.name, n.title, n.slug)] AS pathNames,
              [r IN relationships(bestPath) | type(r)] AS relTypes`,
      { personIds: personLumaIds, eventSlugs: userEvents }
    );

    for (const rec of queryResult.records) {
      result.set(rec.get("luma_id") as string, {
        hops: toNumber(rec.get("hops")),
        path: (rec.get("pathNames") as string[]) || [],
        relTypes: (rec.get("relTypes") as string[]) || [],
      });
    }
  } catch {
    // If shortest path fails, return empty results gracefully
  } finally {
    await session.close();
  }

  return result;
}

export async function computeNodeSimilarity(
  userSkills: string[],
  candidateLumaIds: string[]
): Promise<Map<string, { jaccard: number; sharedCount: number; personSkills: string[] }>> {
  const result = new Map<string, { jaccard: number; sharedCount: number; personSkills: string[] }>();
  if (userSkills.length === 0 || candidateLumaIds.length === 0) return result;

  const cypher = `
    MATCH (p:Person)-[:HAS_SKILL]->(s:Skill)
    WHERE p.luma_id IN $candidates
    WITH p, collect(s.name) AS personSkills
    WITH p, personSkills,
         size([s IN personSkills WHERE s IN $userSkills]) AS intersection,
         size(personSkills) + size($userSkills) - size([s IN personSkills WHERE s IN $userSkills]) AS union_size
    RETURN p.luma_id AS luma_id,
           CASE WHEN union_size = 0 THEN 0.0 ELSE toFloat(intersection) / union_size END AS jaccard,
           intersection AS sharedCount,
           personSkills
    ORDER BY jaccard DESC
  `;

  const rows = await runQuery<Record<string, unknown>>(cypher, {
    candidates: candidateLumaIds,
    userSkills,
  });

  for (const row of rows) {
    result.set(row.luma_id as string, {
      jaccard: toNumber(row.jaccard),
      sharedCount: toNumber(row.sharedCount),
      personSkills: (row.personSkills as string[]) || [],
    });
  }

  return result;
}
