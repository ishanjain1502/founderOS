"use client";

import { useEffect, useRef, useState } from "react";
import {
  PANEL_COPY,
  PANEL_FULL_NOTICE_MS,
  PrimarySegment,
  RunMode,
  type PanelSummary,
} from "@ceo-sandbox/domain";

const chipStyle = {
  display: "inline-block",
  marginLeft: "0.35rem",
  padding: "0.15rem 0.5rem",
  fontSize: "0.75rem",
  borderRadius: 4,
  background: "#eee",
} as const;

const CHOICE_ORDER = [
  "pay_extra",
  "use_if_included",
  "try_not_pay",
  "ignore",
  "consider_switching",
] as const;

type PanelChoice = (typeof CHOICE_ORDER)[number];

type Props = {
  sessionId: string;
  sessionStatus: string;
  mode: RunMode;
  panel: PanelSummary | undefined;
  onComplete: () => void;
};

function segmentN(
  panel: PanelSummary,
  ...segments: PrimarySegment[]
): number {
  return panel.segments
    .filter((s) => segments.includes(s.primarySegment))
    .reduce((sum, s) => sum + s.n, 0);
}

function sumChoiceCounts(
  panel: PanelSummary,
  segments: PrimarySegment[],
): Record<PanelChoice, number> {
  const totals = emptyChoiceRecord();
  for (const seg of panel.segments) {
    if (!segments.includes(seg.primarySegment)) continue;
    for (const choice of CHOICE_ORDER) {
      totals[choice] += seg.choiceCounts[choice] ?? 0;
    }
  }
  return totals;
}

function emptyChoiceRecord(): Record<PanelChoice, number> {
  const counts = {} as Record<PanelChoice, number>;
  for (const choice of CHOICE_ORDER) counts[choice] = 0;
  return counts;
}

function ratesFromCounts(
  counts: Record<PanelChoice, number>,
  n: number,
): Record<PanelChoice, number> {
  const rates = emptyChoiceRecord();
  if (n === 0) return rates;
  for (const choice of CHOICE_ORDER) {
    rates[choice] = (counts[choice] / n) * 100;
  }
  return rates;
}

function panelStatusLines(panel: PanelSummary, mode: RunMode): string[] {
  const lines: string[] = [];
  if (panel.status === "failed") lines.push(PANEL_COPY.failed);
  if (panel.status === "unavailable") lines.push(PANEL_COPY.unavailable);
  if (panel.source === "fixture") lines.push(PANEL_COPY.fixture);
  if (panel.status === "incomplete" && panel.stopReason === "none") {
    lines.push(PANEL_COPY.raiseN);
  }
  if (panel.stopReason === "clock") {
    lines.push(
      mode === RunMode.Demo
        ? PANEL_COPY.stopDemoClock
        : PANEL_COPY.stopFullClock,
    );
  } else if (panel.stopReason === "cost") {
    lines.push(
      mode === RunMode.Demo
        ? PANEL_COPY.stopDemoCost
        : PANEL_COPY.stopFullCost,
    );
  }
  return lines;
}

function formatPolarizedPair(
  pair: PanelSummary["polarizedPairs"][number],
): string {
  const parts = [
    `${pair.choice}: ${pair.left} vs ${pair.right}`,
    pair.leftObjection ? `${pair.left}: ${pair.leftObjection}` : null,
    pair.rightObjection ? `${pair.right}: ${pair.rightObjection}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function SyntheticPanel({
  sessionId,
  sessionStatus,
  mode,
  panel,
  onComplete,
}: Props) {
  const [n, setN] = useState(10);
  const [busy, setBusy] = useState(false);
  const [stillGoing, setStillGoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  if (sessionStatus !== "frozen") {
    return null;
  }

  function clearNoticeTimer() {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setStillGoing(false);
  }

  async function runPanel(body: { n: number; rerun?: boolean }) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setStillGoing(false);
    if (mode === RunMode.Full) {
      noticeTimerRef.current = setTimeout(() => {
        setStillGoing(true);
      }, PANEL_FULL_NOTICE_MS);
    }
    try {
      const res = await fetch(`/api/sessions/${sessionId}/panel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let message = "Could not run simulated panel.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          /* ignore */
        }
        setError(message);
        return;
      }
      onComplete();
    } catch {
      setError("Network error while running simulated panel.");
    } finally {
      clearNoticeTimer();
      setBusy(false);
    }
  }

  const rollupEntPower = panel
    ? segmentN(
        panel,
        PrimarySegment.EnterpriseBuyer,
        PrimarySegment.PowerUser,
      )
    : 0;
  const rollupSmb = panel ? segmentN(panel, PrimarySegment.PriceSensitiveSmb) : 0;

  const noRespondentSegments: PrimarySegment[] = panel
    ? [...panel.noSimulatedRespondents]
    : [];
  if (panel && rollupEntPower === 0) {
    noRespondentSegments.push(
      PrimarySegment.EnterpriseBuyer,
      PrimarySegment.PowerUser,
    );
  }
  if (panel && rollupSmb === 0) {
    noRespondentSegments.push(PrimarySegment.PriceSensitiveSmb);
  }

  return (
    <section style={{ marginTop: "1.25rem" }} aria-label="Simulated panel">
      <p style={{ fontSize: "0.95rem", marginBottom: "0.35rem" }}>
        {PANEL_COPY.banner}
        <span style={chipStyle}>{PANEL_COPY.simulated}</span>
      </p>
      <p style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.75rem" }}>
        {PANEL_COPY.buyers}
      </p>

      {!panel ? (
        <div>
          <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem" }}>
            N: {n}
            <input
              type="range"
              min={10}
              max={1000}
              step={1}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runPanel({ n })}
            style={{
              marginTop: "0.5rem",
              padding: "0.4rem 0.75rem",
              fontSize: "0.9rem",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {PANEL_COPY.run}
          </button>
        </div>
      ) : (
        <div>
          {panelStatusLines(panel, mode).map((line) => (
            <p
              key={line}
              role="status"
              style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.35rem" }}
            >
              {line}
            </p>
          ))}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr minmax(12rem, 16rem)",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
                Rollup
                <span style={chipStyle}>{PANEL_COPY.simulated}</span>
              </h2>
              {rollupEntPower > 0 ? (
                <RollupSide
                  label="enterprise_buyer + power_user"
                  n={rollupEntPower}
                  counts={sumChoiceCounts(panel, [
                    PrimarySegment.EnterpriseBuyer,
                    PrimarySegment.PowerUser,
                  ])}
                />
              ) : null}
              {rollupSmb > 0 ? (
                <RollupSide
                  label="price_sensitive_smb"
                  n={rollupSmb}
                  counts={sumChoiceCounts(panel, [
                    PrimarySegment.PriceSensitiveSmb,
                  ])}
                />
              ) : null}
              {noRespondentSegments.length > 0 ? (
                <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  {PANEL_COPY.noRespondents}: {noRespondentSegments.join(", ")}
                </p>
              ) : null}

              <h2 style={{ fontSize: "1rem", marginTop: "1rem", marginBottom: "0.5rem" }}>
                Segments
                <span style={chipStyle}>{PANEL_COPY.simulated}</span>
              </h2>
              {panel.segments
                .filter((s) => s.n >= 1)
                .map((seg) => (
                  <div
                    key={seg.primarySegment}
                    style={{
                      marginBottom: "0.75rem",
                      paddingBottom: "0.5rem",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {seg.primarySegment} (n={seg.n})
                      {seg.lowN ? (
                        <span style={chipStyle}>{PANEL_COPY.lowN}</span>
                      ) : null}
                      <span style={chipStyle}>{PANEL_COPY.simulated}</span>
                    </p>
                    <ChoicePercents rates={seg.choiceRatesPercent} />
                    <p style={{ fontSize: "0.85rem" }}>
                      Mean confidence: {seg.meanConfidence}
                      <span style={chipStyle}>{PANEL_COPY.simulated}</span>
                    </p>
                    {seg.topObjections.slice(0, 3).map((obj) => (
                      <p key={obj} style={{ fontSize: "0.85rem", margin: "0.15rem 0" }}>
                        {PANEL_COPY.simulated}: {obj}
                      </p>
                    ))}
                  </div>
                ))}

              {panel.polarizedPairs.length > 0 ? (
                <div style={{ marginTop: "0.75rem" }}>
                  {panel.polarizedPairs.map((pair, i) => (
                    <p key={i} style={{ fontSize: "0.85rem" }}>
                      {formatPolarizedPair(pair)}
                    </p>
                  ))}
                </div>
              ) : null}

              <div style={{ marginTop: "1rem" }}>
                <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {PANEL_COPY.unweightedOverall}
                  <span style={chipStyle}>{PANEL_COPY.simulated}</span>
                </p>
                <ChoicePercents rates={panel.overall.choiceRatesPercent} />
                <p style={{ fontSize: "0.85rem" }}>
                  Mean confidence: {panel.overall.meanConfidence}
                  <span style={chipStyle}>{PANEL_COPY.simulated}</span>
                </p>
                {panel.disagreement ? (
                  <p style={{ fontSize: "0.85rem" }}>{PANEL_COPY.disagreement}</p>
                ) : null}
                {panel.lowDisagreement ? (
                  <p style={{ fontSize: "0.85rem" }}>{PANEL_COPY.unanimity}</p>
                ) : null}
              </div>

              {panel.strongestSegment ? (
                <p style={{ fontSize: "0.9rem", marginTop: "0.75rem" }}>
                  {panel.strongestSegment.primarySegment} (
                  {panel.strongestSegment.positiveRate}%)
                  <span style={chipStyle}>{PANEL_COPY.inferred}</span>
                </p>
              ) : null}
            </div>

            <aside style={{ fontSize: "0.85rem", color: "#444" }}>
              {panel.priceShown
                ? `Price shown: ${panel.priceShown.usd} USD ${panel.priceShown.period}`
                : PANEL_COPY.priceAbsent}
              <br />
              {panel.packaging?.trim()
                ? panel.packaging
                : PANEL_COPY.packagingAbsent}
              <br />
              panelSeed: {panel.panelSeed}
              <br />
              questionnaire: {panel.questionnaireVersion}
              <br />
              n requested: {panel.nRequested}, completed: {panel.nCompleted}
              <br />
              {panel.modelId}
              <br />
              {PANEL_COPY.currentUsers}
            </aside>
          </div>

          {mode === RunMode.Full && panel.rerunCount === 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runPanel({ n: panel.nRequested, rerun: true })
              }
              style={{
                marginTop: "0.75rem",
                padding: "0.4rem 0.75rem",
                fontSize: "0.9rem",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {PANEL_COPY.rerun}
            </button>
          ) : null}
        </div>
      )}

      {stillGoing ? (
        <p role="status" style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
          {PANEL_COPY.stillGoing}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ marginTop: "0.5rem", color: "#a00" }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ChoicePercents({
  rates,
}: {
  rates: PanelSummary["overall"]["choiceRatesPercent"];
}) {
  return (
    <ul style={{ margin: "0.25rem 0", paddingLeft: "1.1rem", fontSize: "0.85rem" }}>
      {CHOICE_ORDER.map((choice) => (
        <li key={choice}>{choice}: {rates[choice]}%</li>
      ))}
    </ul>
  );
}

function RollupSide({
  label,
  n,
  counts,
}: {
  label: string;
  n: number;
  counts: Record<PanelChoice, number>;
}) {
  const rates = ratesFromCounts(counts, n);
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>
        {label} (n={n})
      </p>
      <ChoicePercents rates={rates} />
    </div>
  );
}
