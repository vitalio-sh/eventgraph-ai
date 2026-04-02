import { RocketRideClient } from "rocketride";

let client: RocketRideClient | null = null;
let pipelineToken: string | null = null;

async function getClient(): Promise<RocketRideClient> {
  if (client && client.isConnected()) return client;

  client = new RocketRideClient({
    uri: process.env.ROCKETRIDE_URI || "http://localhost:5565",
    auth: process.env.ROCKETRIDE_APIKEY || "",
    persist: false,
    requestTimeout: 15000,
  });

  await client.connect();
  return client;
}

async function ensurePipeline(): Promise<string> {
  if (pipelineToken) return pipelineToken;
  const c = await getClient();
  const result = await c.use({
    filepath: "pipelines/neo4j_query.pipe",
    token: "neo4j-query-" + Date.now(),
  });
  pipelineToken = result.token;
  return pipelineToken;
}

/**
 * Query the Neo4j graph database via RocketRide using a natural-language question.
 * RocketRide translates the question to Cypher via an LLM, executes it against
 * Neo4j Aura, and returns results as text.
 */
export async function queryNeo4jGraph(question: string): Promise<{
  success: boolean;
  text?: string;
  error?: string;
}> {
  try {
    const token = await ensurePipeline();
    const c = await getClient();

    const result = await c.send(
      token,
      question,
      { name: "query.txt" },
      "text/plain"
    );

    const raw = result?.text;
    const text = Array.isArray(raw) ? raw.join("\n") : String(raw ?? "");
    return { success: true, text };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Reset stale pipeline token so the next call creates a fresh one
    if (msg.includes("Pipeline") || msg.includes("running")) {
      pipelineToken = null;
    }
    return { success: false, error: msg };
  }
}

export async function isRocketRideAvailable(): Promise<boolean> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 3000)
    );
    const c = await Promise.race([getClient(), timeout]);
    await Promise.race([c.ping(), timeout]);
    return true;
  } catch {
    client = null;
    return false;
  }
}
