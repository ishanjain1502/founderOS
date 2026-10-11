import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const clientSource = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "client.ts"),
  "utf8",
);

describe("client entry", () => {
  it("does not import Node built-ins or server-only modules", () => {
    expect(clientSource).not.toMatch(/node:crypto/);
    expect(clientSource).not.toMatch(/demo-card-to-draft/);
    expect(clientSource).not.toMatch(/from\s+["']\.\/server["']/);
    expect(clientSource).not.toMatch(/from\s+["']\.\/index["']/);
  });
});
