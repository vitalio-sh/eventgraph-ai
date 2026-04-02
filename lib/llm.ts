import OpenAI from "openai";

let client: OpenAI | null = null;

export function getLLMClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return client;
}

// Model tiers for different tasks
const MODELS = {
  fast: "gpt-4o-mini",   // Profile parsing — simple extraction
  balanced: "gpt-4o",    // Ice-breakers — creative but not complex
  powerful: "gpt-4o",    // Ranking — complex graph reasoning
} as const;

export type ModelTier = keyof typeof MODELS;

export async function chatCompletion(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; max_tokens?: number; model?: ModelTier }
): Promise<string> {
  const modelTier = options?.model || "powerful";
  const model = MODELS[modelTier];

  try {
    const response = await getLLMClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 4096,
    });
    return response.choices[0]?.message?.content || "";
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM API error (${model}): ${msg}`);
  }
}
