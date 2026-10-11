"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DecisionHorizon,
  FEATURE_DESCRIPTION_MAX,
  FeatureChangeType,
  GoalChip,
  MARKET_BEHAVIOR_MAX,
  PRODUCT_SUMMARY_MAX,
  PrimarySegment,
  QUESTION_MAX,
  RunMode,
  SHORT_TEXT_MAX,
  SizeBand,
  intakeWarnings,
  validateIntakeStep,
  type IntakeDraftPartial,
} from "@ceo-sandbox/domain";
import {
  charCounter,
  fieldError,
  formatEnumLabel,
  inputStyle,
  labelBlock,
  mainStyle,
} from "./steps/shared";

function stepLengthOk(step: number, draft: IntakeDraftPartial): boolean {
  const company = draft.company;
  const short = (s?: string) => (s?.length ?? 0) <= SHORT_TEXT_MAX;
  if (step === 1) {
    if ((company?.productSummary?.length ?? 0) > PRODUCT_SUMMARY_MAX) return false;
    if (!short(company?.name)) return false;
    if (!short(company?.category)) return false;
    if (!short(company?.primaryBuyer)) return false;
    if (!short(company?.jobToBeDone)) return false;
    if (!short(company?.domain)) return false;
    if (!short(company?.geography)) return false;
    if ((company?.competitors?.length ?? 0) > 10) return false;
    for (const c of company?.competitors ?? []) {
      if (c.length > SHORT_TEXT_MAX) return false;
    }
  }
  if (step === 2) {
    if ((draft.market?.targetMarketBehavior?.length ?? 0) > MARKET_BEHAVIOR_MAX) return false;
  }
  if (step === 3) {
    if ((draft.goals?.nuance?.length ?? 0) > 500) return false;
  }
  if (step === 4) {
    if ((draft.decision?.questionText?.length ?? 0) > QUESTION_MAX) return false;
    if ((draft.feature?.description?.length ?? 0) > FEATURE_DESCRIPTION_MAX) return false;
    if ((draft.feature?.title?.length ?? 0) > SHORT_TEXT_MAX) return false;
  }
  return true;
}

type SessionPayload = {
  id: string;
  status: string;
  intake: IntakeDraftPartial;
};

export function IntakeWizard({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = useMemo(() => {
    const raw = parseInt(searchParams.get("step") ?? "1", 10);
    if (!Number.isFinite(raw)) return 1;
    return Math.min(5, Math.max(1, raw));
  }, [searchParams]);

  const [intake, setIntake] = useState<IntakeDraftPartial | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const frozen = status === "frozen";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (cancelled) return;
      if (res.status === 404) {
        setMissing(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setPatchError(`Failed to load session (${res.status})`);
        setLoading(false);
        return;
      }
      const body = (await res.json()) as SessionPayload;
      setIntake(body.intake);
      setStatus(body.status);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const patchIntake = useCallback(async (): Promise<boolean> => {
    if (!intake || frozen) return false;
    setBusy(true);
    setPatchError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intake }),
      });
      if (!res.ok) {
        const text = await res.text();
        setPatchError(text || `Save failed (${res.status})`);
        return false;
      }
      const body = (await res.json()) as SessionPayload;
      setIntake(body.intake);
      setStatus(body.status);
      return true;
    } catch (e) {
      setPatchError(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setBusy(false);
    }
  }, [frozen, intake, sessionId]);

  const validation = useMemo(() => {
    if (!intake) return { ok: false, errors: {} as Record<string, string> };
    return validateIntakeStep(step, intake);
  }, [intake, step]);

  const step5Validation = useMemo(() => {
    if (!intake) return { ok: false, errors: {} as Record<string, string> };
    return validateIntakeStep(5, intake);
  }, [intake]);

  const warnings = useMemo(() => {
    if (!intake || step !== 5) return [];
    return intakeWarnings(intake);
  }, [intake, step]);

  const canNext =
    !!intake &&
    validation.ok &&
    stepLengthOk(step, intake) &&
    !busy &&
    !loading;

  const err = (path: string) => fieldErrors[path];

  const updateIntake = (patch: IntakeDraftPartial) => {
    setIntake((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateCompany = (patch: NonNullable<IntakeDraftPartial["company"]>) => {
    setIntake((prev) =>
      prev ? { ...prev, company: { ...prev.company, ...patch } } : prev,
    );
  };

  const updateMarket = (patch: NonNullable<IntakeDraftPartial["market"]>) => {
    setIntake((prev) =>
      prev ? { ...prev, market: { ...prev.market, ...patch } } : prev,
    );
  };

  const updateGoals = (patch: NonNullable<IntakeDraftPartial["goals"]>) => {
    setIntake((prev) =>
      prev ? { ...prev, goals: { ...prev.goals, ...patch } } : prev,
    );
  };

  const updateConstraints = (
    patch: NonNullable<IntakeDraftPartial["constraints"]>,
  ) => {
    setIntake((prev) =>
      prev
        ? { ...prev, constraints: { ...prev.constraints, ...patch } }
        : prev,
    );
  };

  const updateFeature = (patch: NonNullable<IntakeDraftPartial["feature"]>) => {
    setIntake((prev) =>
      prev ? { ...prev, feature: { ...prev.feature, ...patch } } : prev,
    );
  };

  const updateDecision = (
    patch: NonNullable<IntakeDraftPartial["decision"]>,
  ) => {
    setIntake((prev) =>
      prev ? { ...prev, decision: { ...prev.decision, ...patch } } : prev,
    );
  };

  const updateFinancials = (
    patch: NonNullable<IntakeDraftPartial["financials"]>,
  ) => {
    setIntake((prev) =>
      prev
        ? { ...prev, financials: { ...prev.financials, ...patch } }
        : prev,
    );
  };

  const onNext = async () => {
    if (!intake) return;
    const v = validateIntakeStep(step, intake);
    setFieldErrors(v.errors);
    if (!v.ok || !stepLengthOk(step, intake)) return;
    if (!frozen) {
      const ok = await patchIntake();
      if (!ok) return;
    }
    if (step === 5) {
      router.push(`/intake/${sessionId}/recap`);
    } else {
      router.push(`/intake/${sessionId}?step=${step + 1}`);
    }
  };

  const onBack = async () => {
    if (step <= 1) return;
    if (!frozen && intake) {
      await patchIntake();
    }
    router.push(`/intake/${sessionId}?step=${step - 1}`);
  };

  const onSave = async () => {
    if (!frozen) await patchIntake();
  };

  const readOnly = frozen;

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

  if (loading || !intake) {
    return (
      <main style={mainStyle}>
        <p>Loading intake…</p>
      </main>
    );
  }

  const company = intake.company ?? {};
  const market = intake.market ?? {};
  const goals = intake.goals ?? {};
  const constraints = intake.constraints ?? {};
  const feature = intake.feature ?? {};
  const decision = intake.decision ?? {};
  const financials = intake.financials ?? {};
  const selectedChips = goals.chips ?? [];
  const competitorsText = (company.competitors ?? []).join(", ");

  return (
    <main style={mainStyle}>
      <h1>
        Intake{" "}
        <span style={{ fontWeight: 400, fontSize: "1rem" }}>
          — Step {step} of 5
        </span>
      </h1>
      {intake.mode === RunMode.Demo && (
        <p
          style={{
            display: "inline-block",
            padding: "0.25rem 0.5rem",
            background: "#eee",
            borderRadius: 4,
            fontSize: "0.875rem",
          }}
        >
          Illustrative example
        </p>
      )}
      {frozen && (
        <p role="status" style={{ color: "#555", marginTop: "1rem" }}>
          Intake is locked after Start investigation.
        </p>
      )}
      {patchError && (
        <p role="alert" style={{ color: "#b00020" }}>
          {patchError}
        </p>
      )}

      {step === 1 && (
        <section>
          <label style={labelBlock}>
            Company name
            <input
              style={inputStyle}
              value={company.name ?? ""}
              readOnly={readOnly}
              onChange={(e) => updateCompany({ name: e.target.value })}
            />
            {fieldError(err("company.name"))}
          </label>
          <label style={labelBlock}>
            Product summary {charCounter(company.productSummary?.length ?? 0, PRODUCT_SUMMARY_MAX)}
            <textarea
              style={{ ...inputStyle, minHeight: 100 }}
              value={company.productSummary ?? ""}
              readOnly={readOnly}
              onChange={(e) => updateCompany({ productSummary: e.target.value })}
            />
            {fieldError(err("company.productSummary"))}
          </label>
          <label style={labelBlock}>
            Category
            <input
              style={inputStyle}
              value={company.category ?? ""}
              readOnly={readOnly}
              onChange={(e) => updateCompany({ category: e.target.value })}
            />
            {fieldError(err("company.category"))}
          </label>
          <label style={labelBlock}>
            Primary buyer
            <input
              style={inputStyle}
              value={company.primaryBuyer ?? ""}
              readOnly={readOnly}
              onChange={(e) => updateCompany({ primaryBuyer: e.target.value })}
            />
            {fieldError(err("company.primaryBuyer"))}
          </label>
          <label style={labelBlock}>
            Job to be done
            <input
              style={inputStyle}
              value={company.jobToBeDone ?? ""}
              readOnly={readOnly}
              onChange={(e) => updateCompany({ jobToBeDone: e.target.value })}
            />
            {fieldError(err("company.jobToBeDone"))}
          </label>
          <label style={labelBlock}>
            Delivery model
            <input style={inputStyle} value="saas" readOnly />
          </label>
          <label style={labelBlock}>
            Size band
            <select
              style={inputStyle}
              value={company.sizeBand ?? ""}
              disabled={readOnly}
              onChange={(e) =>
                updateCompany({ sizeBand: e.target.value as SizeBand })
              }
            >
              <option value="">Select size band</option>
              {Object.values(SizeBand).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            {fieldError(err("company.sizeBand"))}
          </label>
          <details style={{ marginTop: "1.5rem" }}>
            <summary>More details</summary>
            <label style={labelBlock}>
              Repository URL
              <input
                style={inputStyle}
                value={company.repoUrl ?? ""}
                readOnly={readOnly}
                onChange={(e) => updateCompany({ repoUrl: e.target.value })}
              />
              {fieldError(err("company.repoUrl"))}
            </label>
            <label style={labelBlock}>
              Domain
              <input
                style={inputStyle}
                value={company.domain ?? ""}
                readOnly={readOnly}
                onChange={(e) => updateCompany({ domain: e.target.value })}
              />
            </label>
            <label style={labelBlock}>
              Geography
              <input
                style={inputStyle}
                value={company.geography ?? ""}
                readOnly={readOnly}
                onChange={(e) => updateCompany({ geography: e.target.value })}
              />
            </label>
            <label style={labelBlock}>
              Competitors (comma-separated, max 10)
              <input
                style={inputStyle}
                value={competitorsText}
                readOnly={readOnly}
                onChange={(e) => {
                  const parts = e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 10);
                  updateCompany({ competitors: parts });
                }}
              />
            </label>
          </details>
        </section>
      )}

      {step === 2 && (
        <section>
          <label style={labelBlock}>
            Target market behavior{" "}
            {charCounter(market.targetMarketBehavior?.length ?? 0, MARKET_BEHAVIOR_MAX)}
            <textarea
              style={{ ...inputStyle, minHeight: 120 }}
              value={market.targetMarketBehavior ?? ""}
              readOnly={readOnly}
              onChange={(e) =>
                updateMarket({ targetMarketBehavior: e.target.value })
              }
            />
            {fieldError(err("market.targetMarketBehavior"))}
          </label>
          <details style={{ marginTop: "1.5rem" }}>
            <summary>More details</summary>
            <fieldset style={{ border: "none", padding: 0, marginTop: "1rem" }}>
              <legend style={{ fontWeight: 600 }}>Segment chips</legend>
              {Object.values(PrimarySegment).map((seg) => {
                const checked = (market.segmentChips ?? []).includes(seg);
                return (
                  <label key={seg} style={{ display: "block", marginTop: "0.35rem" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={readOnly}
                      onChange={(e) => {
                        const current = market.segmentChips ?? [];
                        const next = e.target.checked
                          ? [...current, seg]
                          : current.filter((s) => s !== seg);
                        updateMarket({ segmentChips: next });
                      }}
                    />{" "}
                    {formatEnumLabel(seg)}
                  </label>
                );
              })}
            </fieldset>
          </details>
        </section>
      )}

      {step === 3 && (
        <section>
          <label style={labelBlock}>
            Budget (USD)
            <input
              type="number"
              min={0}
              style={inputStyle}
              value={constraints.budgetUsd ?? ""}
              readOnly={readOnly}
              onChange={(e) =>
                updateConstraints({
                  budgetUsd:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
            {fieldError(err("constraints.budgetUsd"))}
          </label>
          <label style={labelBlock}>
            Execution (months)
            <input
              type="number"
              min={0}
              style={inputStyle}
              value={constraints.executionMonths ?? ""}
              readOnly={readOnly}
              onChange={(e) =>
                updateConstraints({
                  executionMonths:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
            {fieldError(err("constraints.executionMonths"))}
          </label>
          <details style={{ marginTop: "1.5rem" }}>
            <summary>More details</summary>
            <fieldset style={{ border: "none", padding: 0, marginTop: "1rem" }}>
              <legend style={{ fontWeight: 600 }}>Goal chips</legend>
              {Object.values(GoalChip).map((chip) => {
                const checked = (goals.chips ?? []).includes(chip);
                return (
                  <label key={chip} style={{ display: "block", marginTop: "0.35rem" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={readOnly}
                      onChange={(e) => {
                        const current = goals.chips ?? [];
                        let next = e.target.checked
                          ? [...current, chip]
                          : current.filter((c) => c !== chip);
                        let primaryChip = goals.primaryChip;
                        if (primaryChip && !next.includes(primaryChip)) {
                          primaryChip = undefined;
                        }
                        updateGoals({ chips: next, primaryChip });
                      }}
                    />{" "}
                    {formatEnumLabel(chip)}
                  </label>
                );
              })}
            </fieldset>
            <label style={labelBlock}>
              Primary goal chip
              <select
                style={inputStyle}
                value={goals.primaryChip ?? ""}
                disabled={readOnly || selectedChips.length === 0}
                onChange={(e) =>
                  updateGoals({
                    primaryChip: e.target.value
                      ? (e.target.value as GoalChip)
                      : undefined,
                  })
                }
              >
                <option value="">None</option>
                {selectedChips.map((chip) => (
                  <option key={chip} value={chip}>
                    {formatEnumLabel(chip)}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelBlock}>
              Nuance
              <textarea
                style={inputStyle}
                value={goals.nuance ?? ""}
                readOnly={readOnly}
                onChange={(e) => updateGoals({ nuance: e.target.value })}
              />
            </label>
            <label style={labelBlock}>
              Decision horizon
              <select
                style={inputStyle}
                value={goals.horizon ?? ""}
                disabled={readOnly}
                onChange={(e) =>
                  updateGoals({
                    horizon: e.target.value
                      ? (e.target.value as DecisionHorizon)
                      : undefined,
                  })
                }
              >
                <option value="">None</option>
                {Object.values(DecisionHorizon).map((h) => (
                  <option key={h} value={h}>
                    {formatEnumLabel(h)}
                  </option>
                ))}
              </select>
            </label>
            {(
              [
                ["extraText", "Extra constraints"],
                ["legalPrivacy", "Legal / privacy"],
                ["segmentRestrictions", "Segment restrictions"],
                ["pricingRules", "Pricing rules"],
                ["hiringRaiseLimits", "Hiring / raise limits"],
                ["teamSkillsNote", "Team skills note"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} style={labelBlock}>
                {label}
                <textarea
                  style={inputStyle}
                  value={(constraints[key] as string | undefined) ?? ""}
                  readOnly={readOnly}
                  onChange={(e) => updateConstraints({ [key]: e.target.value })}
                />
              </label>
            ))}
            <label style={labelBlock}>
              Team capacity (FTE)
              <input
                type="number"
                min={0}
                style={inputStyle}
                value={constraints.teamCapacityFte ?? ""}
                readOnly={readOnly}
                onChange={(e) =>
                  updateConstraints({
                    teamCapacityFte:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </label>
          </details>
        </section>
      )}

      {step === 4 && (
        <section>
          <label style={labelBlock}>
            Decision question{" "}
            {charCounter(decision.questionText?.length ?? 0, QUESTION_MAX)}
            <textarea
              style={inputStyle}
              value={decision.questionText ?? ""}
              readOnly={readOnly}
              onChange={(e) => updateDecision({ questionText: e.target.value })}
            />
            {fieldError(err("decision.questionText"))}
          </label>
          <label style={labelBlock}>
            Feature description{" "}
            {charCounter(feature.description?.length ?? 0, FEATURE_DESCRIPTION_MAX)}
            <textarea
              style={{ ...inputStyle, minHeight: 120 }}
              value={feature.description ?? ""}
              readOnly={readOnly}
              onChange={(e) => updateFeature({ description: e.target.value })}
            />
            {fieldError(err("feature.description"))}
          </label>
          <label style={labelBlock}>
            Change type
            <select
              style={inputStyle}
              value={feature.changeType ?? ""}
              disabled={readOnly}
              onChange={(e) =>
                updateFeature({
                  changeType: e.target.value
                    ? (e.target.value as FeatureChangeType)
                    : undefined,
                })
              }
            >
              {intake.mode === RunMode.Full && (
                <option value="">Select change type</option>
              )}
              {Object.values(FeatureChangeType).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {fieldError(err("feature.changeType"))}
          </label>
          <details style={{ marginTop: "1.5rem" }}>
            <summary>More details</summary>
            <label style={labelBlock}>
              Feature title
              <input
                style={inputStyle}
                value={feature.title ?? ""}
                readOnly={readOnly}
                onChange={(e) => updateFeature({ title: e.target.value })}
              />
            </label>
            <label style={labelBlock}>
              Packaging
              <textarea
                style={inputStyle}
                value={feature.packaging ?? ""}
                readOnly={readOnly}
                onChange={(e) => updateFeature({ packaging: e.target.value })}
              />
            </label>
            <label style={labelBlock}>
              Proposed price (USD)
              <input
                type="number"
                min={0}
                style={inputStyle}
                value={feature.proposedPriceUsd ?? ""}
                readOnly={readOnly}
                onChange={(e) =>
                  updateFeature({
                    proposedPriceUsd:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </label>
            <label style={labelBlock}>
              Proposed price period
              <select
                style={inputStyle}
                value={feature.proposedPricePeriod ?? ""}
                disabled={readOnly}
                onChange={(e) =>
                  updateFeature({
                    proposedPricePeriod: e.target.value
                      ? (e.target.value as "monthly" | "annual" | "one_time")
                      : undefined,
                  })
                }
              >
                <option value="">None</option>
                <option value="monthly">monthly</option>
                <option value="annual">annual</option>
                <option value="one_time">one_time</option>
              </select>
            </label>
            <label style={labelBlock}>
              Current pricing (text)
              <textarea
                style={inputStyle}
                value={feature.currentPricingText ?? ""}
                readOnly={readOnly}
                onChange={(e) =>
                  updateFeature({ currentPricingText: e.target.value })
                }
              />
            </label>
            <label style={{ ...labelBlock, fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={intake.alreadyLive ?? false}
                disabled={readOnly}
                onChange={(e) => updateIntake({ alreadyLive: e.target.checked })}
              />{" "}
              Evaluating a change to a live feature
            </label>
          </details>
        </section>
      )}

      {step === 5 && (
        <section>
          <label style={{ ...labelBlock, fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={financials.provideLater ?? false}
              disabled={readOnly}
              onChange={(e) =>
                updateFinancials({ provideLater: e.target.checked })
              }
            />{" "}
            Provide financials later
          </label>
          {(["cashUsd", "customerCount", "mrrUsd", "runwayMonths"] as const).map(
            (key) => (
              <label key={key} style={labelBlock}>
                {key}
                <input
                  type="number"
                  style={inputStyle}
                  value={financials[key] ?? ""}
                  readOnly={readOnly}
                  onChange={(e) =>
                    updateFinancials({
                      [key]:
                        e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
                {fieldError(
                  err(`financials.${key}`) ?? step5Validation.errors[`financials.${key}`],
                )}
              </label>
            ),
          )}
          {fieldError(
            err("financials") ?? step5Validation.errors.financials,
          )}
          {warnings.length > 0 && (
            <ul style={{ color: "#996600", marginTop: "1rem" }}>
              {warnings.map((w) => (
                <li key={w.path}>
                  {w.path}: {w.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {step > 1 && (
          <button type="button" disabled={busy} onClick={() => void onBack()}>
            Back
          </button>
        )}
        <button
          type="button"
          disabled={busy || frozen}
          onClick={() => void onSave()}
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy || (!frozen && !canNext)}
          onClick={() => void onNext()}
        >
          {step === 5 ? "Go to recap" : "Next"}
        </button>
      </div>
    </main>
  );
}
