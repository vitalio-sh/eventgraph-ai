import { RocketRideClient } from "rocketride";

let client: RocketRideClient | null = null;
let pipelineToken: string | null = null;

async function getClient(): Promise<RocketRideClient> {
  if (client && client.isConnected()) return client;

  client = new RocketRideClient({
    uri: process.env.ROCKETRIDE_URI || "http://host.docker.internal:5565",
    auth: process.env.ROCKETRIDE_APIKEY || "",
    persist: false,
    requestTimeout: 5000,
  });

  await client.connect();
  return client;
}

async function ensurePipeline(): Promise<string> {
  if (pipelineToken) return pipelineToken;
  const c = await getClient();
  const result = await c.use({
    filepath: "pipelines/profile_enrichment.pipe",
    token: "enrichment-" + Date.now(),
  });
  pipelineToken = result.token;
  return pipelineToken;
}

/**
 * Process profile text through the RocketRide pipeline.
 * Currently runs a webhook → response pipeline.
 * When NER models are installed, this will extract named entities
 * (persons, organizations, locations) via C++ BERT models.
 */
export async function processProfileViaRocketRide(
  profileText: string
): Promise<{
  success: boolean;
  text?: string[];
  error?: string;
}> {
  try {
    const token = await ensurePipeline();
    const c = await getClient();

    const result = await c.send(
      token,
      profileText,
      { name: "profile.txt" },
      "text/plain"
    );

    const text = result ? (result.text as string[]) || [profileText] : [profileText];
    return { success: true, text };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // If pipeline is stale, reset token so next call creates a new one
    if (msg.includes("Pipeline") || msg.includes("running")) {
      pipelineToken = null;
    }
    return { success: false, error: msg };
  }
}

export async function isRocketRideAvailable(): Promise<boolean> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 3000)
    );
    const c = await Promise.race([getClient(), timeoutPromise]);
    await Promise.race([c.ping(), timeoutPromise]);
    return true;
  } catch {
    client = null; // reset so next attempt doesn't use stale client
    return false;
  }
}

export async function disconnectRocketRide(): Promise<void> {
  if (client) {
    if (pipelineToken) {
      try {
        await client.terminate(pipelineToken);
      } catch {}
      pipelineToken = null;
    }
    await client.disconnect();
    client = null;
  }
}
