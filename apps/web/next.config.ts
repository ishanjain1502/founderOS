import type { NextConfig } from "next";
import path from "node:path";

const domainSrc = path.join(__dirname, "../../packages/domain/src");

const domainResolve = {
  "@ceo-sandbox/domain/server": path.join(domainSrc, "server.ts"),
  "@ceo-sandbox/domain$": path.join(domainSrc, "client.ts"),
} as const;

const nextConfig: NextConfig = {
  transpilePackages: ["@ceo-sandbox/domain", "@ceo-sandbox/db"],
  serverExternalPackages: ["better-sqlite3"],
  webpack(config, { isServer }) {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...domainResolve,
    };
    if (isServer) {
      config.externals = config.externals ?? [];
      if (Array.isArray(config.externals)) {
        config.externals.push(
          ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
            if (request === "better-sqlite3") {
              callback(null, `commonjs ${request}`);
              return;
            }
            callback();
          },
        );
      }
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      "@ceo-sandbox/domain/server": path.join(domainSrc, "server.ts"),
      "@ceo-sandbox/domain": path.join(domainSrc, "client.ts"),
    },
  },
};

export default nextConfig;
