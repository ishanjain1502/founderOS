import { describe, it, expect } from "vitest";
import { RunMode } from "../run-mode";
import {
  LAST_SESSION_COOKIE,
  emptyIntakeDraft,
  financialMetricCount,
  intakeDraftPartialSchema,
  intakeDraftSchema,
  intakeWarnings,
  isIntakeComplete,
  validateIntakeStep,
  deepMergeIntake,
  FieldSource,
  GoalChip,
  SizeBand,
} from "./intake";

describe("emptyIntakeDraft", () => {
  it("is a valid partial with USD and saas defaults", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    const parsed = intakeDraftPartialSchema.safeParse(draft);
    expect(parsed.success).toBe(true);
    expect(draft.currency).toBe("USD");
    expect(draft.company?.deliveryModel).toBe("saas");
    expect(draft.fieldSources?.["currency"]).toBe(FieldSource.SystemDefault);
    expect(draft.scopeCheck?.status).toBe("unknown");
    expect(LAST_SESSION_COOKIE).toBe("ceoSandboxLastSessionId");
  });

  it("demo empty draft skips scope check", () => {
    expect(emptyIntakeDraft(RunMode.Demo).scopeCheck?.status).toBe("skipped");
  });
});

describe("validateIntakeStep", () => {
  it("blocks step 1 without name", () => {
    const r = validateIntakeStep(1, emptyIntakeDraft(RunMode.Full));
    expect(r.ok).toBe(false);
    expect(r.errors["company.name"]).toBeTruthy();
  });

  it("allows step 5 when provideLater is true with zero metrics", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    draft.financials = { provideLater: true };
    expect(validateIntakeStep(5, draft).ok).toBe(true);
  });

  it("blocks step 5 when only one metric and provideLater is false", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    draft.financials = { provideLater: false, mrrUsd: 1000 };
    expect(validateIntakeStep(5, draft).ok).toBe(false);
  });

  it("allows step 5 with two metrics", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    draft.financials = {
      provideLater: false,
      mrrUsd: 1000,
      customerCount: 10,
    };
    expect(validateIntakeStep(5, draft).ok).toBe(true);
    expect(financialMetricCount(draft.financials)).toBe(2);
  });
});

describe("isIntakeComplete", () => {
  it("rejects empty full draft", () => {
    expect(isIntakeComplete(emptyIntakeDraft(RunMode.Full)).ok).toBe(false);
  });

  it("rejects primaryChip not in chips", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    draft.goals = { chips: [GoalChip.Revenue], primaryChip: GoalChip.Enterprise };
    const r = intakeDraftPartialSchema.safeParse(draft);
    expect(r.success).toBe(false);
  });
});

describe("intakeWarnings", () => {
  it("warns on negative cash and zero customers", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    draft.financials = { provideLater: false, cashUsd: -1, customerCount: 0 };
    const paths = intakeWarnings(draft).map((w) => w.path);
    expect(paths).toContain("financials.cashUsd");
    expect(paths).toContain("financials.customerCount");
  });
});

describe("caps", () => {
  it("rejects questionText over 500", () => {
    const r = intakeDraftPartialSchema.safeParse({
      ...emptyIntakeDraft(RunMode.Full),
      decision: { questionText: "x".repeat(501) },
    });
    expect(r.success).toBe(false);
  });
});

describe("deepMergeIntake", () => {
  it("replaces competitor arrays and marks user sources", () => {
    const base = emptyIntakeDraft(RunMode.Full);
    const merged = deepMergeIntake(base, {
      company: { name: "Acme", competitors: ["CompA"] },
    });
    expect(merged.company?.name).toBe("Acme");
    expect(merged.company?.competitors).toEqual(["CompA"]);
    expect(merged.fieldSources?.["company.name"]).toBe(FieldSource.User);
  });
});

describe("intakeDraftSchema unknown keys", () => {
  it("rejects extra keys on partial", () => {
    const r = intakeDraftPartialSchema.safeParse({
      ...emptyIntakeDraft(RunMode.Full),
      nope: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe("SizeBand", () => {
  it("parses mid", () => {
    expect(SizeBand.Mid).toBe("mid");
  });
});
