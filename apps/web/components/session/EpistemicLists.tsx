"use client";

import {
  epistemicLabel,
  EpistemicKind,
  EMPTY_OBSERVED_COPY,
  type EpistemicViewModel,
  type AssumptionNumeric,
} from "@ceo-sandbox/domain";

const chipStyle = {
  display: "inline-block",
  marginLeft: "0.5rem",
  padding: "0.15rem 0.5rem",
  fontSize: "0.75rem",
  borderRadius: 4,
  background: "#eee",
} as const;

const sectionStyle = { marginTop: "1.25rem" } as const;
const rowStyle = {
  marginTop: "0.75rem",
  paddingLeft: "0.5rem",
  borderLeft: "3px solid #ddd",
} as const;

function formatNumeric(numeric: AssumptionNumeric): string {
  if (numeric.unit === "percent") {
    return `${numeric.value}%`;
  }
  return `${numeric.currency} ${numeric.value} / ${numeric.period}`;
}

export function EpistemicLists({ model }: { model: EpistemicViewModel }) {
  const showHypothesis = model.hypotheses.length > 0;

  return (
    <div style={{ marginTop: "1.25rem" }}>
      {model.quarantineWarning ? (
        <p role="status" style={{ fontSize: "0.9rem", color: "#555" }}>
          {model.quarantineWarning}
        </p>
      ) : null}

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>Observed</h2>
        {model.emptyObserved ? (
          <p>{EMPTY_OBSERVED_COPY}</p>
        ) : (
          model.observed.map((row, i) => (
            <div key={i} style={rowStyle}>
              <p style={{ margin: 0 }}>{row.summary}</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
                <strong>{epistemicLabel(EpistemicKind.Observed)}</strong>
                {" · "}
                {row.retrievedAt}
                <span style={chipStyle}>{row.vendorChip}</span>
              </p>
              {row.disclaimer ? (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
                  {row.disclaimer}
                </p>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>
          Assumptions
        </h2>
        {model.assumptions.length === 0 ? (
          <p style={{ color: "#666", fontSize: "0.9rem" }}>None listed.</p>
        ) : (
          model.assumptions.map((row, i) => (
            <div key={i} style={rowStyle}>
              <p style={{ margin: 0 }}>{row.statement}</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
                <strong>{epistemicLabel(EpistemicKind.Assumed)}</strong>
                {" · "}
                {row.owner}
                {row.rationaleTag ? ` · ${row.rationaleTag}` : ""}
                {row.numeric ? ` · ${formatNumeric(row.numeric)}` : ""}
              </p>
            </div>
          ))
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>Unknowns</h2>
        {model.unknowns.length === 0 ? (
          <p style={{ color: "#666", fontSize: "0.9rem" }}>None listed.</p>
        ) : (
          model.unknowns.map((row, i) => (
            <div key={i} style={rowStyle}>
              <p style={{ margin: 0 }}>{row.statement}</p>
            </div>
          ))
        )}
      </section>

      {showHypothesis ? (
        <section style={sectionStyle}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>
            Hypothesis
          </h2>
          {model.hypotheses.map((row, i) => (
            <div key={i} style={rowStyle}>
              <p style={{ margin: 0 }}>{row.statement}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>Inferred</h2>
        {model.inferences.length === 0 ? (
          <p style={{ color: "#666", fontSize: "0.9rem" }}>None listed.</p>
        ) : (
          model.inferences.map((row, i) => (
            <div key={i} style={rowStyle}>
              <p style={{ margin: 0 }}>{row.statement}</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
                <strong>{epistemicLabel(EpistemicKind.Inferred)}</strong>
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
