import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["neo4j-driver", "rocketride", "ws"],
};

export default nextConfig;
