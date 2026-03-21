import type { NextConfig } from "next";

/** Next.js config — `standalone` output is required for the production Dockerfile (`node server.js`). */
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
