import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ceo-sandbox/domain", "@ceo-sandbox/db"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
