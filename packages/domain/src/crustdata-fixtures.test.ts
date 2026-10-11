import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

function load(name: string) {
  return JSON.parse(
    readFileSync(join(__dirname, "../../../fixtures/crustdata", name), "utf8"),
  );
}

describe("crustdata fixtures", () => {
  it("search-demo has three companies with ids", () => {
    const doc = load("search-demo.json");
    expect(doc.companies).toHaveLength(3);
    for (const c of doc.companies) {
      expect(c.crustdata_company_id).toBeTruthy();
      expect(c.basic_info.name).toBeTruthy();
    }
  });
});
