import { describe, expect, it } from "vitest";
import { PanelPrimaryChoice, PrimarySegment } from "./contracts/enums";
import { RunMode } from "./run-mode";
import { aggregatePanel, roundHalfUp1 } from "./panel-aggregate";

const pay = PanelPrimaryChoice.PayExtra;
const use = PanelPrimaryChoice.UseIfIncluded;
const ignore = PanelPrimaryChoice.Ignore;

function row(
  profileId: string,
  primarySegment: PrimarySegment,
  primaryChoice: PanelPrimaryChoice,
  confidence: number,
  objection: string,
) {
  return { profileId, primarySegment, primaryChoice, confidence, objection };
}

describe("aggregatePanel", () => {
  it("rounds 1.25 to 1.3", () => {
    expect(roundHalfUp1(1.25)).toBe(1.3);
    expect(roundHalfUp1(12.5)).toBe(12.5);
  });

  it("fails the 70% bar at 2/3 and passes at 7/10", () => {
    const one = row("0000", PrimarySegment.PriceSensitiveSmb, pay, 10, "Price");
    const failed = aggregatePanel({
      mode: RunMode.Full,
      assignedSegments: [PrimarySegment.PriceSensitiveSmb],
      evaluationAttempts: 3,
      completions: [one, { ...one, profileId: "0001" }],
    });
    expect(failed.status).toBe("failed");
    const passed = aggregatePanel({
      mode: RunMode.Demo,
      assignedSegments: [
        PrimarySegment.PriceSensitiveSmb,
        PrimarySegment.EnterpriseBuyer,
        PrimarySegment.PowerUser,
        PrimarySegment.LoyalExisting,
        PrimarySegment.LowEngagement,
        PrimarySegment.TechnicalEvaluator,
      ],
      evaluationAttempts: 10,
      completions: [
        row("0000", PrimarySegment.PriceSensitiveSmb, pay, 80, "Price"),
        row("0006", PrimarySegment.PriceSensitiveSmb, pay, 80, "Price"),
        row("0001", PrimarySegment.EnterpriseBuyer, use, 40, "Security"),
        row("0007", PrimarySegment.EnterpriseBuyer, use, 40, "Security"),
        row("0002", PrimarySegment.PowerUser, use, 50, "Security"),
        row("0008", PrimarySegment.PowerUser, use, 50, "Fit"),
        row("0003", PrimarySegment.LoyalExisting, ignore, 10, "Inertia"),
        row("0009", PrimarySegment.LoyalExisting, ignore, 10, "Inertia"),
        row("0004", PrimarySegment.LowEngagement, ignore, 5, "Inertia"),
        row("0005", PrimarySegment.TechnicalEvaluator, pay, 90, "Proof"),
      ],
    });
    expect(passed.status).toBe("complete");
    expect(passed.lowDisagreement).toBe(false);
  });

  it("breaks objection ties by the earliest profile id", () => {
    const result = aggregatePanel({
      mode: RunMode.Full,
      assignedSegments: [PrimarySegment.EnterpriseBuyer],
      evaluationAttempts: 2,
      completions: [
        row("0002", PrimarySegment.EnterpriseBuyer, pay, 50, "Beta"),
        row("0001", PrimarySegment.EnterpriseBuyer, pay, 50, "Alpha"),
      ],
    });
    expect(result.segments[0].topObjections).toEqual(["Alpha", "Beta"]);
  });

  it("sets a polarized pair at a 20 point unrounded gap", () => {
    const result = aggregatePanel({
      mode: RunMode.Full,
      assignedSegments: [
        PrimarySegment.PriceSensitiveSmb,
        PrimarySegment.EnterpriseBuyer,
      ],
      evaluationAttempts: 2,
      completions: [
        row("0000", PrimarySegment.PriceSensitiveSmb, ignore, 10, "Price"),
        row("0001", PrimarySegment.EnterpriseBuyer, pay, 90, "Proof"),
      ],
    });
    expect(result.disagreement).toBe(true);
    expect(result.polarizedPairs[0]).toMatchObject({
      choice: pay,
      left: PrimarySegment.PriceSensitiveSmb,
      right: PrimarySegment.EnterpriseBuyer,
      leftObjection: "Price",
      rightObjection: "Proof",
    });
  });

  it("names a lone n=1 segment and omits strongest when several n=1 segments exist", () => {
    const lone = aggregatePanel({
      mode: RunMode.Full,
      assignedSegments: [PrimarySegment.PowerUser],
      evaluationAttempts: 1,
      completions: [row("0000", PrimarySegment.PowerUser, pay, 50, "Proof")],
    });
    expect(lone.segments[0].lowN).toBe(true);
    expect(lone.strongestSegment?.primarySegment).toBe(PrimarySegment.PowerUser);
    const two = aggregatePanel({
      mode: RunMode.Full,
      assignedSegments: [
        PrimarySegment.PowerUser,
        PrimarySegment.LoyalExisting,
      ],
      evaluationAttempts: 2,
      completions: [
        row("0000", PrimarySegment.PowerUser, pay, 50, "Proof"),
        row("0001", PrimarySegment.LoyalExisting, ignore, 20, "Inertia"),
      ],
    });
    expect(two.strongestSegment).toBeUndefined();
  });
});
