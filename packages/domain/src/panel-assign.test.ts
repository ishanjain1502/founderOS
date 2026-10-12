import { describe, expect, it } from "vitest";
import { PrimarySegment } from "./contracts/enums";
import { RunMode } from "./run-mode";
import { assignPanelSlots, PANEL_SEGMENT_CATALOG } from "./panel-assign";

describe("assignPanelSlots", () => {
  it("lists the ten segments in spec order", () => {
    expect(PANEL_SEGMENT_CATALOG).toEqual([
      PrimarySegment.PriceSensitiveSmb,
      PrimarySegment.EnterpriseBuyer,
      PrimarySegment.PowerUser,
      PrimarySegment.LoyalExisting,
      PrimarySegment.LowEngagement,
      PrimarySegment.TechnicalEvaluator,
      PrimarySegment.ProcurementEnterprise,
      PrimarySegment.EarlyAdopter,
      PrimarySegment.ConservativeBuyer,
      PrimarySegment.CompetitorLoyal,
    ]);
  });

  it("demo N=10 matches the normative table", () => {
    const { slots, currentUserCount } = assignPanelSlots({
      n: 10,
      mode: RunMode.Demo,
    });
    expect(currentUserCount).toBe(7);
    expect(slots.map((s) => s.profileId)).toEqual([
      "0000", "0001", "0002", "0003", "0004",
      "0005", "0006", "0007", "0008", "0009",
    ]);
    expect(slots.map((s) => [s.primarySegment, s.usesProduct])).toEqual([
      [PrimarySegment.PriceSensitiveSmb, true],
      [PrimarySegment.EnterpriseBuyer, true],
      [PrimarySegment.PowerUser, true],
      [PrimarySegment.LoyalExisting, true],
      [PrimarySegment.LowEngagement, true],
      [PrimarySegment.TechnicalEvaluator, true],
      [PrimarySegment.PriceSensitiveSmb, true],
      [PrimarySegment.EnterpriseBuyer, false],
      [PrimarySegment.PowerUser, false],
      [PrimarySegment.LoyalExisting, false],
    ]);
  });

  it("full N=10 puts the remainder on the first two segments", () => {
    const { slots, currentUserCount } = assignPanelSlots({
      n: 10,
      mode: RunMode.Full,
    });
    expect(currentUserCount).toBe(7);
    const counts = new Map<string, number>();
    for (const slot of slots) {
      counts.set(slot.primarySegment, (counts.get(slot.primarySegment) ?? 0) + 1);
    }
    expect(counts.get(PrimarySegment.PriceSensitiveSmb)).toBe(3);
    expect(counts.get(PrimarySegment.EnterpriseBuyer)).toBe(3);
    expect(counts.get(PrimarySegment.PowerUser)).toBe(2);
    expect(counts.get(PrimarySegment.LoyalExisting)).toBe(2);
    expect(counts.get(PrimarySegment.LowEngagement)).toBeUndefined();
  });

  it("N=15 marks 11 current users", () => {
    const { currentUserCount, slots } = assignPanelSlots({
      n: 15,
      mode: RunMode.Full,
    });
    expect(currentUserCount).toBe(11);
    expect(slots.filter((s) => s.usesProduct)).toHaveLength(11);
    expect(slots.slice(0, 11).every((s) => s.usesProduct)).toBe(true);
    expect(slots.slice(11).every((s) => !s.usesProduct)).toBe(true);
  });
});
