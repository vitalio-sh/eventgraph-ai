import { chatCompletion } from "../llm";
import { UserProfile } from "../types";

const SYSTEM_PROMPT = `You are a profile extraction agent. Given raw unstructured text about a person (possibly a pasted LinkedIn profile, a bio, or casual description), extract a structured profile. Infer skills and interests from job titles, descriptions, and context. Be generous with skill inference — if someone is a "CTO at an AI startup", infer skills like "AI", "Engineering Management", "Startups".

If no date range is provided, default to start: "2026-03-30", end: "2026-04-05".

Return ONLY valid JSON matching this schema:
{
  "name": "string",
  "current_role": "string",
  "company": "string",
  "skills": ["string"],
  "industries": ["string"],
  "interests": ["string"],
  "looking_for": ["string"],
  "past_companies": ["string"],
  "education": ["string"],
  "location": "string",
  "date_range": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }
}`;

export async function parseProfile(
  profileText: string,
  startDate?: string,
  endDate?: string
): Promise<UserProfile> {
  let userMessage = profileText;
  if (startDate || endDate) {
    userMessage += `\n\nDate range: ${startDate || "2026-03-30"} to ${endDate || "2026-04-05"}`;
  }

  const raw = await chatCompletion(SYSTEM_PROMPT, userMessage, {
    temperature: 0.3,
    model: "fast",
  });

  const jsonStr = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(jsonStr) as UserProfile;

  if (startDate) parsed.date_range.start = startDate;
  if (endDate) parsed.date_range.end = endDate;

  return parsed;
}
