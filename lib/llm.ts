import OpenAI from "openai";

let client: OpenAI | null = null;

export function getLLMClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.GMI_API_KEY!,
      baseURL: process.env.GMI_BASE_URL || "https://api.gmi-serving.com/v1",
    });
  }
  return client;
}

// Model tiers for different tasks
const MODELS = {
  fast: "anthropic/claude-haiku-4.5",    // Profile parsing — simple extraction
  balanced: "anthropic/claude-sonnet-4.6", // Ice-breakers — creative but not complex
  powerful: "anthropic/claude-opus-4.6",   // Ranking — complex graph reasoning
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
