import { describe, it, expect } from "vitest";
import { EntitySource } from "./base";
import { FeatureChangeType } from "./enums";
import { RunMode } from "../run-mode";
import {
  sessionSchema,
  decisionSchema,
  companyProfileSchema,
  featureProposalSchema,
  sessionDraftSchema,
} from "./session";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const DECISION_ID = "00000000-0000-4000-8000-000000000002";
const PROFILE_ID = "00000000-0000-4000-8000-000000000003";
const FEATURE_ID = "00000000-0000-4000-8000-000000000004";
const CREATED_AT = "2026-01-01T00:00:00.000Z";

describe("sessionSchema", () => {
  it("accepts a minimal valid Session with mode demo", () => {
    const r = sessionSchema.safeParse({
      id: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.System,
      mode: RunMode.Demo,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe(RunMode.Demo);
    }
  });

  it("rejects an invalid mode", () => {
    const r = sessionSchema.safeParse({
      id: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.System,
      mode: "preview",
    });
    expect(r.success).toBe(false);
  });
});

describe("decisionSchema", () => {
  it("requires questionText and nested sessionId and decisionId", () => {
    const r = decisionSchema.safeParse({
      decisionId: DECISION_ID,
      sessionId: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.User,
      questionText: "Should we launch AI-powered analytics as a premium add-on?",
      questionRevision: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sessionId).toBe(SESSION_ID);
      expect(r.data.decisionId).toBe(DECISION_ID);
      expect(r.data.questionText).toContain("analytics");
    }
  });

  it("rejects missing questionText", () => {
    const r = decisionSchema.safeParse({
      decisionId: DECISION_ID,
      sessionId: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.User,
      questionRevision: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe("companyProfileSchema", () => {
  it("requires sessionId and productSummary", () => {
    const r = companyProfileSchema.safeParse({
      id: PROFILE_ID,
      sessionId: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Import,
      name: "Acme Workflow",
      productSummary: "B2B workflow SaaS for mid-market teams.",
    });
    expect(r.success).toBe(true);
  });
});

describe("featureProposalSchema", () => {
  it("requires sessionId, description, and changeType from enums", () => {
    const r = featureProposalSchema.safeParse({
      id: FEATURE_ID,
      sessionId: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.User,
      title: "AI analytics add-on",
      description: "Premium AI-powered analytics layer on project data.",
      changeType: FeatureChangeType.Feature,
    });
    expect(r.success).toBe(true);
  });
});

describe("sessionDraftSchema", () => {
  it("accepts in-memory draft before first save", () => {
    const r = sessionDraftSchema.safeParse({
      mode: RunMode.Demo,
      decision: {
        questionText: "Should we ship the pilot?",
      },
      companyProfile: {
        productSummary: "Workflow SaaS for ops teams.",
      },
      featureProposal: {
        description: "Pilot analytics module.",
        changeType: FeatureChangeType.Feature,
      },
    });
    expect(r.success).toBe(true);
  });
});
