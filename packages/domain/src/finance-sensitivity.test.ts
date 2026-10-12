import { describe, expect, it } from "vitest";
import {
  buildSensitivityGrid,
  rankSensitivityDrivers,
} from "./finance-sensitivity";

describe("buildSensitivityGrid", () => {
  it("applies default price and adoption bands", () => {
    const grid = buildSensitivityGrid(25, 8);
    expect(grid.price).toEqual({ low: 20, base: 25, high: 30 });
    expect(grid.adoption.low).toBeCloseTo(5.6);
    expect(grid.adoption.high).toBeCloseTo(10.4);
  });
});

describe("rankSensitivityDrivers", () => {
  it("orders by absolute delta", () => {
    expect(
      rankSensitivityDrivers({ priceDelta: 2, adoptionDelta: 10 }),
    ).toEqual(["adoption", "price"]);
  });
});
