import {
  PanelPrimaryChoice,
  PrimarySegment,
} from "./contracts/enums";
import { PANEL_SEGMENT_CATALOG } from "./panel-assign";
import { RunMode } from "./run-mode";

export function roundHalfUp1(value: number): number {
  return Math.round(value * 10) / 10;
}

export type PanelCompletion = {
  profileId: string;
  primarySegment: PrimarySegment;
  primaryChoice: PanelPrimaryChoice;
  confidence: number;
  objection: string;
};

export type PanelAggregate = {
  status: "complete" | "incomplete" | "failed";
  nCompleted: number;
  evaluationAttempts: number;
  lowDisagreement: boolean;
  disagreement: boolean;
  segments: Array<{
    primarySegment: PrimarySegment;
    n: number;
    lowN: boolean;
    choiceCounts: Record<PanelPrimaryChoice, number>;
    choiceRatesPercent: Record<PanelPrimaryChoice, number>;
    meanConfidence: number;
    topObjections: string[];
  }>;
  noSimulatedRespondents: PrimarySegment[];
  overall: {
    n: number;
    choiceCounts: Record<PanelPrimaryChoice, number>;
    choiceRatesPercent: Record<PanelPrimaryChoice, number>;
    meanConfidence: number;
  };
  strongestSegment?: { primarySegment: PrimarySegment; positiveRate: number };
  polarizedPairs: Array<{
    choice: PanelPrimaryChoice;
    left: PrimarySegment;
    right: PrimarySegment;
    leftObjection: string | null;
    rightObjection: string | null;
  }>;
};

const ALL_CHOICES: PanelPrimaryChoice[] = Object.values(
  PanelPrimaryChoice,
) as PanelPrimaryChoice[];

function emptyChoiceCounts(): Record<PanelPrimaryChoice, number> {
  const counts = {} as Record<PanelPrimaryChoice, number>;
  for (const choice of ALL_CHOICES) counts[choice] = 0;
  return counts;
}

function catalogIndex(segment: PrimarySegment): number {
  return PANEL_SEGMENT_CATALOG.indexOf(segment);
}

function topObjectionsForSegment(
  rows: PanelCompletion[],
): string[] {
  const byObjection = new Map<
    string,
    { count: number; earliestId: string }
  >();
  for (const row of rows) {
    const key = row.objection.trim();
    const existing = byObjection.get(key);
    if (!existing) {
      byObjection.set(key, { count: 1, earliestId: row.profileId });
    } else {
      existing.count += 1;
      if (row.profileId < existing.earliestId) {
        existing.earliestId = row.profileId;
      }
    }
  }
  return [...byObjection.entries()]
    .sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return a[1].earliestId.localeCompare(b[1].earliestId);
    })
    .slice(0, 3)
    .map(([text]) => text);
}

function unroundedPercent(
  count: number,
  n: number,
): number {
  if (n === 0) return 0;
  return (count / n) * 100;
}

function positiveRateUnrounded(
  counts: Record<PanelPrimaryChoice, number>,
  n: number,
): number {
  if (n === 0) return 0;
  return (
    (counts[PanelPrimaryChoice.PayExtra] +
      counts[PanelPrimaryChoice.UseIfIncluded]) /
    n
  );
}

function modeGatePasses(
  mode: RunMode,
  segmentNs: Map<PrimarySegment, number>,
): boolean {
  const withOne = [...segmentNs.values()].filter((n) => n >= 1).length;
  const withTwo = [...segmentNs.values()].filter((n) => n >= 2).length;
  if (mode === RunMode.Demo) {
    return withOne >= 6 && withTwo >= 4;
  }
  return withTwo >= 4;
}

export function aggregatePanel(input: {
  mode: RunMode;
  assignedSegments: PrimarySegment[];
  evaluationAttempts: number;
  completions: PanelCompletion[];
}): PanelAggregate {
  const { mode, assignedSegments, evaluationAttempts, completions } = input;
  const assignedSet = new Set(assignedSegments);

  const bySegment = new Map<PrimarySegment, PanelCompletion[]>();
  for (const seg of PANEL_SEGMENT_CATALOG) {
    if (assignedSet.has(seg)) bySegment.set(seg, []);
  }
  for (const row of completions) {
    const list = bySegment.get(row.primarySegment);
    if (list) list.push(row);
  }

  const noSimulatedRespondents = PANEL_SEGMENT_CATALOG.filter(
    (seg) => assignedSet.has(seg) && (bySegment.get(seg)?.length ?? 0) === 0,
  );

  const segments = PANEL_SEGMENT_CATALOG.filter(
    (seg) => (bySegment.get(seg)?.length ?? 0) >= 1,
  ).map((primarySegment) => {
    const rows = bySegment.get(primarySegment)!;
    const n = rows.length;
    const choiceCounts = emptyChoiceCounts();
    for (const row of rows) choiceCounts[row.primaryChoice] += 1;
    const choiceRatesPercent = {} as Record<PanelPrimaryChoice, number>;
    for (const choice of ALL_CHOICES) {
      choiceRatesPercent[choice] = roundHalfUp1(
        unroundedPercent(choiceCounts[choice], n),
      );
    }
    const meanConfidence = roundHalfUp1(
      rows.reduce((sum, r) => sum + r.confidence, 0) / n,
    );
    return {
      primarySegment,
      n,
      lowN: n === 1,
      choiceCounts,
      choiceRatesPercent,
      meanConfidence,
      topObjections: topObjectionsForSegment(rows),
    };
  });

  const overallN = completions.length;
  const overallCounts = emptyChoiceCounts();
  for (const row of completions) overallCounts[row.primaryChoice] += 1;
  const overallRates = {} as Record<PanelPrimaryChoice, number>;
  for (const choice of ALL_CHOICES) {
    overallRates[choice] = roundHalfUp1(
      unroundedPercent(overallCounts[choice], overallN),
    );
  }
  const overallMean =
    overallN === 0
      ? 0
      : roundHalfUp1(
          completions.reduce((sum, r) => sum + r.confidence, 0) / overallN,
        );

  const segmentNs = new Map<PrimarySegment, number>();
  for (const seg of segments) segmentNs.set(seg.primarySegment, seg.n);

  const polarizedPairs: PanelAggregate["polarizedPairs"] = [];
  const segmentsWithData = segments.filter((s) => s.n >= 1);
  for (let i = 0; i < segmentsWithData.length; i++) {
    for (let j = i + 1; j < segmentsWithData.length; j++) {
      const leftSeg = segmentsWithData[i];
      const rightSeg = segmentsWithData[j];
      if (catalogIndex(leftSeg.primarySegment) > catalogIndex(rightSeg.primarySegment)) {
        continue;
      }
      const orderedLeft = leftSeg;
      const orderedRight = rightSeg;
      for (const choice of ALL_CHOICES) {
        const leftPct = unroundedPercent(
          orderedLeft.choiceCounts[choice],
          orderedLeft.n,
        );
        const rightPct = unroundedPercent(
          orderedRight.choiceCounts[choice],
          orderedRight.n,
        );
        if (Math.abs(leftPct - rightPct) >= 20) {
          polarizedPairs.push({
            choice,
            left: orderedLeft.primarySegment,
            right: orderedRight.primarySegment,
            leftObjection: orderedLeft.topObjections[0] ?? null,
            rightObjection: orderedRight.topObjections[0] ?? null,
          });
        }
      }
    }
  }

  polarizedPairs.sort((a, b) => {
    const choiceOrder =
      ALL_CHOICES.indexOf(a.choice) - ALL_CHOICES.indexOf(b.choice);
    if (choiceOrder !== 0) return choiceOrder;
    const leftOrder =
      catalogIndex(a.left) - catalogIndex(b.left);
    if (leftOrder !== 0) return leftOrder;
    return catalogIndex(a.right) - catalogIndex(b.right);
  });

  const disagreement = polarizedPairs.length > 0;
  const lowDisagreement =
    completions.length > 0 &&
    completions.every((r) => r.primaryChoice === completions[0].primaryChoice);

  const segmentsWithCompletions = segments.filter((s) => s.n >= 1);
  const soleSegmentWithData =
    segmentsWithCompletions.length === 1
      ? segmentsWithCompletions[0]
      : undefined;

  let strongestSegment: PanelAggregate["strongestSegment"];
  const candidates = segments.filter(
    (s) => s.n >= 5 || (soleSegmentWithData && s === soleSegmentWithData),
  );
  if (candidates.length > 0) {
    let best = candidates[0];
    let bestRate = positiveRateUnrounded(best.choiceCounts, best.n);
    for (let k = 1; k < candidates.length; k++) {
      const cand = candidates[k];
      const rate = positiveRateUnrounded(cand.choiceCounts, cand.n);
      if (
        rate > bestRate ||
        (rate === bestRate &&
          catalogIndex(cand.primarySegment) <
            catalogIndex(best.primarySegment))
      ) {
        best = cand;
        bestRate = rate;
      }
    }
    strongestSegment = {
      primarySegment: best.primarySegment,
      positiveRate: bestRate,
    };
  }

  let status: PanelAggregate["status"];
  const ratio =
    evaluationAttempts > 0
      ? completions.length / evaluationAttempts
      : 1;
  if (evaluationAttempts > 0 && ratio < 0.7) {
    status = "failed";
  } else if (modeGatePasses(mode, segmentNs)) {
    status = "complete";
  } else {
    status = "incomplete";
  }

  return {
    status,
    nCompleted: completions.length,
    evaluationAttempts,
    lowDisagreement,
    disagreement,
    segments,
    noSimulatedRespondents,
    overall: {
      n: overallN,
      choiceCounts: overallCounts,
      choiceRatesPercent: overallRates,
      meanConfidence: overallMean,
    },
    strongestSegment,
    polarizedPairs,
  };
}
