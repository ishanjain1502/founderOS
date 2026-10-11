"use client";

import { useCallback, useEffect, useState } from "react";
import { CLAIM_SAFETY_COPY, RunMode } from "@ceo-sandbox/domain";
import { continueHref } from "@/lib/continue-href";

const DEMO_CARD_ID = "demo-ai-analytics-premium";

type CurrentSession = {
  id: string;
  status: string;
};

export default function HomePage() {
  const [mode, setMode] = useState<RunMode>(RunMode.Demo);
  const [demoCardId, setDemoCardId] = useState(DEMO_CARD_ID);
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/sessions/current");
      if (res.status === 200) {
        const body = (await res.json()) as CurrentSession;
        if (!cancelled) setCurrentSession(body);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const body =
        mode === RunMode.Demo
          ? { mode: "demo", demoCardId: DEMO_CARD_ID }
          : { mode: "full" };
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }
      const created = (await res.json()) as CurrentSession;
      window.location.assign(`/intake/${created.id}?step=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
      setBusy(false);
    }
  }, [mode]);

  const continueLast = useCallback(() => {
    if (!currentSession) return;
    window.location.assign(
      continueHref(currentSession.status, currentSession.id),
    );
  }, [currentSession]);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>CEO Decision Sandbox</h1>

      <fieldset style={{ border: "none", padding: 0, margin: "1.5rem 0" }}>
        <legend style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
          Run mode
        </legend>
        <label style={{ marginRight: "1rem" }}>
          <input
            type="radio"
            name="run-mode"
            value={RunMode.Demo}
            checked={mode === RunMode.Demo}
            onChange={() => setMode(RunMode.Demo)}
          />
          Demo
        </label>
        <label>
          <input
            type="radio"
            name="run-mode"
            value={RunMode.Full}
            checked={mode === RunMode.Full}
            onChange={() => setMode(RunMode.Full)}
          />
          Full
        </label>
      </fieldset>

      {mode === RunMode.Demo && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="demo-card">
            Demo decision card{" "}
            <span style={{ fontWeight: 400, color: "#555" }}>
              (Illustrative example)
            </span>
          </label>
          <select
            id="demo-card"
            value={demoCardId}
            onChange={(e) => setDemoCardId(e.target.value)}
            style={{ display: "block", marginTop: "0.5rem", minWidth: 280 }}
          >
            <option value={DEMO_CARD_ID}>{DEMO_CARD_ID}</option>
          </select>
          <button
            type="button"
            id={DEMO_CARD_ID}
            disabled={busy}
            onClick={() => void startSession()}
            style={{ marginTop: "1rem" }}
          >
            Use illustrative scenario
          </button>
        </div>
      )}

      {mode === RunMode.Full && (
        <div style={{ marginBottom: "1.5rem" }}>
          <button type="button" disabled={busy} onClick={() => void startSession()}>
            New decision
          </button>
        </div>
      )}

      {currentSession && (
        <div style={{ marginBottom: "1.5rem" }}>
          <button type="button" disabled={busy} onClick={continueLast}>
            Continue last session
          </button>
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: "#b00020" }}>
          {error}
        </p>
      )}

      <footer
        style={{
          marginTop: "2rem",
          paddingTop: "1rem",
          borderTop: "1px solid #ccc",
          fontSize: "0.875rem",
          color: "#444",
        }}
      >
        {CLAIM_SAFETY_COPY.panelSimulated}
      </footer>
    </main>
  );
}
