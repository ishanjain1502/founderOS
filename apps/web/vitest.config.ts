import path from "node:path";
import { defineConfig } from "vitest/config";

const domainSrc = path.resolve(__dirname, "../../packages/domain/src");
const dbSrc = path.resolve(__dirname, "../../packages/db/src");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@ceo-sandbox/domain/server": path.join(domainSrc, "server.ts"),
      "@ceo-sandbox/domain": path.join(domainSrc, "client.ts"),
      "@ceo-sandbox/db": path.join(dbSrc, "index.ts"),
    },
  },
});
