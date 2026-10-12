import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SyntheticPanel mount", () => {
  it("is mounted from the session page and uses the shared copy", () => {
    const page = readFileSync(
      join(__dirname, "../../app/session/[sessionId]/page.tsx"),
      "utf8",
    );
    const component = readFileSync(join(__dirname, "SyntheticPanel.tsx"), "utf8");
    expect(page.includes("SyntheticPanel")).toBe(true);
    expect(component.includes("PANEL_COPY.banner")).toBe(true);
    expect(component.includes("PANEL_COPY.run")).toBe(true);
    expect(component.includes("PANEL_FULL_NOTICE_MS")).toBe(true);
  });
});
