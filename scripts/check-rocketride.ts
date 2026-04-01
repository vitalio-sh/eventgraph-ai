import { RocketRideClient } from "rocketride";

async function main() {
  console.log("Checking RocketRide connection...");
  console.log(
    "URI:",
    process.env.ROCKETRIDE_URI || "ws://host.docker.internal:5565"
  );

  const client = new RocketRideClient({
    uri: process.env.ROCKETRIDE_URI || "ws://host.docker.internal:5565",
    auth: process.env.ROCKETRIDE_APIKEY || "",
  });

  try {
    await client.connect();
    console.log("Connected to RocketRide engine");

    await client.ping();
    console.log("Ping successful");

    // Try to start the pipeline
    const result = await client.use({
      filepath: "pipelines/profile_enrichment.pipe",
    });
    console.log("Pipeline started, token:", result.token);

    await client.terminate(result.token);
    console.log("Pipeline terminated");

    await client.disconnect();
    console.log("Disconnected");
    console.log("\nAll checks passed! RocketRide is ready.");
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main();
