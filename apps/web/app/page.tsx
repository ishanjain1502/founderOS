"use client";

import { useState } from "react";
import { CLAIM_SAFETY_COPY, RunMode } from "@ceo-sandbox/domain";

const DEMO_CARD_ID = "demo-ai-analytics-premium";

export default function HomePage() {
  const [mode, setMode] = useState<RunMode>(RunMode.Demo);
  const [demoCardId, setDemoCardId] = useState(DEMO_CARD_ID);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Autonomous CEO Decision Sandbox</h1>

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
          <label htmlFor="demo-card">Demo decision card</label>
          <select
            id="demo-card"
            value={demoCardId}
            onChange={(e) => setDemoCardId(e.target.value)}
            style={{ display: "block", marginTop: "0.5rem", minWidth: 280 }}
          >
            <option value={DEMO_CARD_ID}>{DEMO_CARD_ID}</option>
          </select>
        </div>
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
