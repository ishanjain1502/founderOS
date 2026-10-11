import path from "node:path";
import { defineConfig } from "vitest/config";

const domainSrc = path.resolve(__dirname, "../../packages/domain/src");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@ceo-sandbox/domain/server": path.join(domainSrc, "server.ts"),
      "@ceo-sandbox/domain": path.join(domainSrc, "client.ts"),
    },
  },
});
