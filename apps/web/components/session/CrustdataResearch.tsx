"use client";

import { useState } from "react";
import type { CrustdataResearchState } from "@ceo-sandbox/domain";

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
  crustdataStatus: CrustdataResearchState["status"] | undefined;
  recordedBanner: string | null;
  fallbackBanner: string | null;
  querySubmitted: string | null;
  onComplete: () => void;
};

function canRetrieve(
  sessionStatus: string,
  crustdataStatus: CrustdataResearchState["status"] | undefined,
): boolean {
  if (sessionStatus !== "frozen") {
    return false;
  }
  const status = crustdataStatus ?? "idle";
  return status === "idle" || status === "failed";
}

function buttonLabel(
  sessionStatus: string,
  crustdataStatus: CrustdataResearchState["status"] | undefined,
): string {
  const status = crustdataStatus ?? "idle";
  if (status === "ran" || status === "fallback") {
    return "Already retrieved";
  }
  return "Retrieve competitor signals";
}

export function CrustdataResearch({
  sessionId,
  sessionStatus,
  crustdataStatus,
  recordedBanner,
  fallbackBanner,
  querySubmitted,
  onComplete,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryOpen, setQueryOpen] = useState(false);

  const enabled = canRetrieve(sessionStatus, crustdataStatus) && !busy;
  const label = buttonLabel(sessionStatus, crustdataStatus);

  async function handleRetrieve() {
    if (!enabled) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/research/crustdata`,
        { method: "POST" },
      );
      if (!res.ok) {
        let message = "Could not retrieve competitor signals.";
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
      setError("Network error while retrieving competitor signals.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "1.25rem" }}>
      {recordedBanner ? (
        <p
          role="status"
          style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.5rem" }}
        >
          <span style={{ ...chipStyle, marginTop: 0 }}>{recordedBanner}</span>
        </p>
      ) : null}
      {fallbackBanner ? (
        <p
          role="status"
          style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.5rem" }}
        >
          <span style={{ ...chipStyle, marginTop: 0 }}>{fallbackBanner}</span>
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleRetrieve()}
        disabled={!enabled}
        style={{
          padding: "0.4rem 0.75rem",
          fontSize: "0.9rem",
          cursor: enabled ? "pointer" : "not-allowed",
          opacity: enabled ? 1 : 0.65,
        }}
      >
        {busy ? "Retrieving…" : label}
      </button>

      {error ? (
        <p role="alert" style={{ marginTop: "0.5rem", color: "#a00" }}>
          {error}
        </p>
      ) : null}

      {querySubmitted ? (
        <div style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            onClick={() => setQueryOpen((o) => !o)}
            aria-expanded={queryOpen}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "0.85rem",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Search query used
          </button>
          {queryOpen ? (
            <div
              style={{
                marginTop: "0.35rem",
                padding: "0.5rem",
                fontSize: "0.85rem",
                background: "#f7f7f7",
                borderRadius: 4,
              }}
            >
              <p style={{ margin: 0, color: "#666", fontSize: "0.8rem" }}>
                query submitted
              </p>
              <p style={{ margin: "0.25rem 0 0", whiteSpace: "pre-wrap" }}>
                {querySubmitted}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
