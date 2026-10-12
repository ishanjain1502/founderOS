import { PrimarySegment } from "./contracts/enums";
import { RunMode } from "./run-mode";

export const PANEL_SEGMENT_CATALOG: PrimarySegment[] = [
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
];

export type PanelSlot = {
  profileId: string;
  primarySegment: PrimarySegment;
  usesProduct: boolean;
};

export function assignPanelSlots(input: {
  n: number;
  mode: RunMode;
}): { slots: PanelSlot[]; currentUserCount: number } {
  const counts = PANEL_SEGMENT_CATALOG.map(() => 0);
  for (let i = 0; i < 4; i++) counts[i] = 2;
  if (input.mode === RunMode.Demo) {
    counts[4] = 1;
    counts[5] = 1;
  }
  let reserved = counts.reduce((sum, n) => sum + n, 0);
  let remainder = input.n - reserved;
  let cursor = 0;
  while (remainder > 0) {
    counts[cursor % 10] += 1;
    remainder -= 1;
    cursor += 1;
  }
  const remaining = counts.slice();
  const order: PrimarySegment[] = [];
  while (order.length < input.n) {
    for (let i = 0; i < PANEL_SEGMENT_CATALOG.length; i++) {
      if (remaining[i] > 0) {
        remaining[i] -= 1;
        order.push(PANEL_SEGMENT_CATALOG[i]);
      }
    }
  }
  const currentUserCount = Math.round(0.7 * input.n);
  const slots = order.map((primarySegment, index) => ({
    profileId: String(index).padStart(4, "0"),
    primarySegment,
    usesProduct: index < currentUserCount,
  }));
  return { slots, currentUserCount };
}
