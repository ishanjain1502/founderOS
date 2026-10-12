"use client";

import { useState } from "react";
import {
  CLAIM_SAFETY_COPY,
  type FinanceState,
  type FinancialMappedMetrics,
} from "@ceo-sandbox/domain";

const chipStyle = {
  display: "inline-block",
  marginTop: "0.5rem",
  padding: "0.15rem 0.5rem",
  fontSize: "0.75rem",
  borderRadius: 4,
  background: "#eee",
} as const;

type Props = {
  sessionId: string;
  sessionStatus: string;
  finance: FinanceState | undefined;
  onComplete: () => void;
};

const METRIC_ROWS: { key: keyof FinancialMappedMetrics; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "burn", label: "Burn" },
  { key: "runway", label: "Runway" },
  { key: "margin", label: "Margin" },
  { key: "adoption", label: "Adoption" },
];

function formatMetric(metric: FinancialMappedMetrics[keyof FinancialMappedMetrics]) {
  if (!metric.provided || metric.value === undefined) {
    return "—";
  }
  return String(metric.value);
}

function canRunFinance(
  sessionStatus: string,
  finance: FinanceState | undefined,
): boolean {
  if (sessionStatus !== "frozen") {
    return false;
  }
  if (finance?.financeAssumptionsApproved !== true) {
    return false;
  }
  const status = finance?.status ?? "idle";
  return status === "idle" || status === "failed";
}

function runButtonLabel(finance: FinanceState | undefined): string {
  const status = finance?.status ?? "idle";
  if (
    status === "deferred" ||
    status === "complete" ||
    status === "fallback" ||
    status === "unavailable"
  ) {
    return "Already ran finance";
  }
  return "Run financial comparison";
}

export function FinanceComparison({
  sessionId,
  sessionStatus,
  finance,
  onComplete,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approved = finance?.financeAssumptionsApproved === true;
  const canApprove = sessionStatus === "frozen" && !approved && !approveBusy;
  const canRun = canRunFinance(sessionStatus, finance) && !busy;

  async function handleApprove() {
    if (!canApprove) return;
    setApproveBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/finance/approve-assumptions`,
        { method: "POST" },
      );
      if (!res.ok) {
        setError("Could not approve finance assumptions.");
        return;
      }
      onComplete();
    } catch {
      setError("Network error while approving finance assumptions.");
    } finally {
      setApproveBusy(false);
    }
  }

  async function handleRun() {
    if (!canRun) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/finance`, {
        method: "POST",
      });
      if (!res.ok) {
        let message = "Could not run finance comparison.";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) {
            message = body.error;
          }
        } catch {
          /* ignore */
        }
        setError(message);
        return;
      }
      onComplete();
    } catch {
      setError("Network error while running finance comparison.");
    } finally {
      setBusy(false);
    }
  }

  const compare = finance?.compare;
  const baseline = finance?.baseline;
  const sensitivity = finance?.sensitivity;

  return (
    <div style={{ marginTop: "1.25rem" }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>
        Financial scenarios (cfo.ai)
      </h2>
      <p style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.5rem" }}>
        <span style={{ ...chipStyle, marginTop: 0 }}>
          {CLAIM_SAFETY_COPY.financeModeled}
        </span>
        <span style={{ ...chipStyle, marginLeft: "0.35rem" }}>
          {CLAIM_SAFETY_COPY.financeNotForecast}
        </span>
      </p>
      {finance?.source === "fixture" ? (
        <p
          role="status"
          style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}
        >
          Recorded finance fixture — not live cfo.ai output.
        </p>
      ) : null}
      {!approved ? (
        <button
          type="button"
          disabled={!canApprove}
          onClick={() => void handleApprove()}
          style={{ marginRight: "0.5rem" }}
        >
          {approveBusy ? "Approving…" : "Approve finance assumptions"}
        </button>
      ) : null}
      <button type="button" disabled={!canRun} onClick={() => void handleRun()}>
        {busy ? "Running…" : runButtonLabel(finance)}
      </button>
      {error ? (
        <p role="alert" style={{ color: "#a00", marginTop: "0.5rem" }}>
          {error}
        </p>
      ) : null}
      {finance?.checks?.length ? (
        <ul style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
          {finance.checks.map((check) => (
            <li key={check.code}>
              [{check.severity}] {check.message}
            </li>
          ))}
        </ul>
      ) : null}
      {baseline ? (
        <div style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
          <strong>Baseline</strong>
          <ul>
            {baseline.cashUsd !== undefined ? (
              <li>Cash (USD): {baseline.cashUsd.toLocaleString()}</li>
            ) : null}
            {baseline.mrrUsd !== undefined ? (
              <li>MRR (USD): {baseline.mrrUsd.toLocaleString()}</li>
            ) : null}
            {baseline.runwayMonthsUserInput !== undefined ? (
              <li>Runway (months, user input): {baseline.runwayMonthsUserInput}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
      {compare ? (
        <table
          style={{
            marginTop: "0.75rem",
            borderCollapse: "collapse",
            fontSize: "0.9rem",
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.25rem 0.5rem" }}>
                Metric
              </th>
              <th style={{ textAlign: "left", padding: "0.25rem 0.5rem" }}>
                Pilot
              </th>
              <th style={{ textAlign: "left", padding: "0.25rem 0.5rem" }}>
                Broad launch
              </th>
            </tr>
          </thead>
          <tbody>
            {METRIC_ROWS.map((row) => (
              <tr key={row.key}>
                <td style={{ padding: "0.25rem 0.5rem" }}>{row.label}</td>
                <td style={{ padding: "0.25rem 0.5rem" }}>
                  {formatMetric(compare.pilot[row.key])}
                </td>
                <td style={{ padding: "0.25rem 0.5rem" }}>
                  {formatMetric(compare.broad_launch[row.key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {sensitivity ? (
        <div style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
          <strong>Sensitivity (Pilot)</strong>
          <p>
            Price: {sensitivity.price.low} / {sensitivity.price.base} /{" "}
            {sensitivity.price.high}
          </p>
          <p>
            Adoption: {sensitivity.adoption.low} / {sensitivity.adoption.base} /{" "}
            {sensitivity.adoption.high}
          </p>
          {sensitivity.topDrivers?.length ? (
            <p>Top drivers: {sensitivity.topDrivers.join(", ")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
