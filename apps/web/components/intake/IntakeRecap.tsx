"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FieldSource,
  RunMode,
  ScopeCheckStatus,
  type IntakeDraftPartial,
} from "@ceo-sandbox/domain";
import { buildRecapModel } from "@/lib/recap-model";
import { formatEnumLabel, mainStyle } from "./steps/shared";

type SessionPayload = {
  id: string;
  status: string;
  intake: IntakeDraftPartial;
};

const chipStyle = {
  display: "inline-block",
  marginRight: "0.5rem",
  marginBottom: "0.35rem",
  padding: "0.15rem 0.5rem",
  fontSize: "0.75rem",
  borderRadius: 4,
  background: "#eee",
} as const;

export function IntakeRecap({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [intake, setIntake] = useState<IntakeDraftPartial | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<Record<string, string>>({});

  const frozen = status === "frozen";

  const loadSession = useCallback(async (): Promise<SessionPayload | null> => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load session (${res.status})`);
    return (await res.json()) as SessionPayload;
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let body = await loadSession();
        if (cancelled) return;
        if (!body) {
          setMissing(true);
          setLoading(false);
          return;
        }
        if (body.intake.mode === RunMode.Full) {
          await fetch(`/api/sessions/${sessionId}/recap/scope-check`, {
            method: "POST",
          });
          if (cancelled) return;
          body = await loadSession();
          if (cancelled) return;
          if (!body) {
            setMissing(true);
            setLoading(false);
            return;
          }
        }
        setIntake(body.intake);
        setStatus(body.status);
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSession, sessionId]);

  const model = useMemo(() => {
    if (!intake) return null;
    return buildRecapModel(intake, status);
  }, [intake, status]);

  const showAssumedChip = useMemo(() => {
    if (!intake) return false;
    if (intake.financials?.provideLater === true) return true;
    const sources = Object.values(intake.fieldSources ?? {});
    return sources.some(
      (s) => s === FieldSource.DemoFixture || s === FieldSource.ProvideLater,
    );
  }, [intake]);

  const onApprove = async () => {
    setBusy(true);
    setActionError({});
    try {
      const res = await fetch(`/api/sessions/${sessionId}/approve`, {
        method: "POST",
      });
      if (res.status === 400) {
        const body = (await res.json()) as { errors?: Record<string, string> };
        setActionError(body.errors ?? { _: "Approval failed" });
        return;
      }
      if (!res.ok) {
        setActionError({ _: `Approval failed (${res.status})` });
        return;
      }
      const body = (await res.json()) as SessionPayload;
      setIntake(body.intake);
      setStatus(body.status);
    } finally {
      setBusy(false);
    }
  };

  const onStart = async () => {
    setBusy(true);
    setActionError({});
    try {
      const res = await fetch(`/api/sessions/${sessionId}/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const text = await res.text();
        setActionError({ _: text || `Start failed (${res.status})` });
        return;
      }
      router.push(`/session/${sessionId}`);
    } finally {
      setBusy(false);
    }
  };

  if (missing) {
    return (
      <main style={mainStyle}>
        <h1>Session not found</h1>
        <p>
          <Link href="/">Return home</Link>
        </p>
      </main>
    );
  }

  if (loading || !intake || !model) {
    return (
      <main style={mainStyle}>
        <p>Loading recap…</p>
      </main>
    );
  }

  const scopeSkipped =
    model.scopeStatus === ScopeCheckStatus.Unknown ||
    model.scopeStatus === ScopeCheckStatus.Skipped;
  const scopeWarning =
    model.outsideSpecIntent ||
    model.scopeStatus === ScopeCheckStatus.OutOfScope;

  return (
    <main style={mainStyle}>
      <h1>Recap</h1>
      <div style={{ marginTop: "0.5rem" }}>
        {model.illustrative && (
          <span style={chipStyle}>Illustrative example</span>
        )}
        {showAssumedChip && (
          <span style={chipStyle}>Assumed / provide later</span>
        )}
      </div>
      {scopeWarning && (
        <p style={{ color: "#8a6d00", marginTop: "1rem" }}>
          This sandbox is tuned for existing B2B SaaS feature decisions.
        </p>
      )}
      {scopeSkipped && (
        <p style={{ color: "#555", marginTop: "0.75rem" }}>Scope check skipped</p>
      )}
      <ul style={{ marginTop: "1.25rem", lineHeight: 1.6, paddingLeft: "1.25rem" }}>
        <li>
          <strong>Decision question:</strong> {model.question || "—"}
        </li>
        <li>
          <strong>Feature:</strong> {model.featureOneLiner || "—"}
        </li>
        <li>
          <strong>Goals:</strong>{" "}
          {model.goalChips.length
            ? model.goalChips.map(formatEnumLabel).join(", ")
            : "—"}
        </li>
        <li>
          <strong>Budget (USD):</strong>{" "}
          {model.budgetUsd != null ? model.budgetUsd.toLocaleString() : "—"}
        </li>
        <li>
          <strong>Execution (months):</strong>{" "}
          {model.executionMonths != null ? model.executionMonths : "—"}
        </li>
      </ul>
      {Object.keys(actionError).length > 0 && (
        <div role="alert" style={{ color: "#b00020", marginTop: "1rem" }}>
          {Object.entries(actionError).map(([k, v]) => (
            <p key={k} style={{ margin: "0.25rem 0" }}>
              {v}
            </p>
          ))}
        </div>
      )}
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {!frozen && (
          <Link
            href={`/intake/${sessionId}?step=1`}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #333",
              borderRadius: 4,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            Edit
          </Link>
        )}
        {!frozen && (
          <button
            type="button"
            disabled={busy || status === "approved"}
            onClick={() => void onApprove()}
            style={{ padding: "0.5rem 1rem", cursor: busy ? "wait" : "pointer" }}
          >
            Approve
          </button>
        )}
        {!frozen && (
          <button
            type="button"
            disabled={busy || status !== "approved"}
            onClick={() => void onStart()}
            style={{ padding: "0.5rem 1rem", cursor: busy ? "wait" : "pointer" }}
          >
            Start investigation
          </button>
        )}
      </div>
    </main>
  );
}
