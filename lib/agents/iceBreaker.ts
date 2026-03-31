import { chatCompletion } from "../llm";
import { UserProfile, EventRecommendation } from "../types";

const SYSTEM_PROMPT = `You generate personalized ice-breaker messages for networking events. For each person, generate a short, natural ice-breaker (2-3 sentences).

Rules:
- Reference something SPECIFIC about the person: a shared skill, past company overlap, their current project, or something from their headline/about section
- If the person has high graph centrality (pagerank_score or betweenness_score), you can naturally reference their connectedness — e.g. "I noticed you're at like 5 events this week" or "you seem to know everyone in the agent tooling space"
- Tone: casual, direct, peer-to-peer. You're equals meeting at a tech event
- NOT salesy, NOT corporate, NOT "I'd love to pick your brain"
- Make it feel like something a real person would naturally say

Return ONLY valid JSON as an array:
[
  {
    "luma_id": "string",
    "ice_breaker": "string"
  }
]`;

interface IceBreakerResult {
  luma_id: string;
  ice_breaker: string;
}

export async function generateIceBreakers(
  profile: UserProfile,
  recommendations: EventRecommendation[]
): Promise<EventRecommendation[]> {
  const allPeople = recommendations.flatMap((r) => r.people_to_meet);
  if (allPeople.length === 0) return recommendations;

  const batchSize = 10;
  const batches: typeof allPeople[] = [];
  for (let i = 0; i < allPeople.length; i += batchSize) {
    batches.push(allPeople.slice(i, i + batchSize));
  }

  const iceBreakerMap = new Map<string, string>();

  for (const batch of batches) {
    const peopleSummaries = batch.map((p) => ({
      luma_id: p.luma_id,
      name: p.name,
      headline: p.headline,
      about: p.about?.slice(0, 200),
      company: p.company,
      job_title: p.job_title,
      matching_skills: p.matching_skills,
      shared_companies: p.shared_companies,
      relevance_reason: p.relevance_reason,
      pagerank_score: p.pagerank_score,
      betweenness_score: p.betweenness_score,
    }));

    const userMessage = JSON.stringify({
      your_profile: {
        name: profile.name,
        current_role: profile.current_role,
        company: profile.company,
        skills: profile.skills.slice(0, 10),
        interests: profile.interests,
      },
      people: peopleSummaries,
    });

    const raw = await chatCompletion(SYSTEM_PROMPT, userMessage, {
      temperature: 0.8,
      max_tokens: 2048,
      model: "balanced",
    });

    const jsonStr = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const results = JSON.parse(jsonStr) as IceBreakerResult[];

    for (const result of results) {
      iceBreakerMap.set(result.luma_id, result.ice_breaker);
    }
  }

  return recommendations.map((rec) => ({
    ...rec,
    people_to_meet: rec.people_to_meet.map((p) => ({
      ...p,
      ice_breaker: iceBreakerMap.get(p.luma_id) || p.ice_breaker,
    })),
  }));
}
