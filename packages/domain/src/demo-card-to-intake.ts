import type { DemoDecisionCard } from "./demo-card";
import { buildDemoScenariosAndAssumptions } from "./demo-card-scenarios";
import { CONTRACT_VERSION } from "./contracts/base";
import { FeatureChangeType } from "./contracts/enums";
import {
  FieldSource,
  ScopeCheckStatus,
  intakeDraftSchema,
  type IntakeDraft,
} from "./contracts/intake";
import { RunMode } from "./run-mode";

const DEMO_FIELD_PATHS = [
  "decision.questionText",
  "decision.questionRevision",
  "company.name",
  "company.productSummary",
  "company.category",
  "company.primaryBuyer",
  "company.jobToBeDone",
  "company.deliveryModel",
  "company.sizeBand",
  "market.targetMarketBehavior",
  "goals.chips",
  "goals.primaryChip",
  "constraints.budgetUsd",
  "constraints.executionMonths",
  "constraints.extraText",
  "feature.title",
  "feature.description",
  "feature.changeType",
  "feature.packaging",
  "financials.provideLater",
  "financials.cashUsd",
  "financials.customerCount",
  "financials.mrrUsd",
  "financials.runwayMonths",
] as const;

function demoFixtureFieldSources(): Record<string, FieldSource> {
  return Object.fromEntries(
    DEMO_FIELD_PATHS.map((path) => [path, FieldSource.DemoFixture]),
  );
}

/**
 * Maps a demo decision card into a complete {@link IntakeDraft} (not persisted).
 */
export function demoCardToIntakeDraft(card: DemoDecisionCard): IntakeDraft {
  const { scenarios, assumptions } = buildDemoScenariosAndAssumptions(card);
  const company = card.company;

  return intakeDraftSchema.parse({
    contractVersion: CONTRACT_VERSION,
    mode: RunMode.Demo,
    currency: "USD",
    outsideSpecIntent: false,
    alreadyLive: false,
    scopeCheck: { status: ScopeCheckStatus.Skipped },
    decision: {
      questionText: card.decisionQuestion,
      questionRevision: 1,
    },
    company: {
      name: company.name,
      productSummary: company.productSummary,
      category: company.category,
      primaryBuyer: company.primaryBuyer,
      jobToBeDone: company.jobToBeDone,
      deliveryModel: company.deliveryModel,
      sizeBand: company.sizeBand,
    },
    market: {
      targetMarketBehavior: card.targetMarketBehavior,
    },
    goals: {
      chips: card.goalChips,
      primaryChip: card.primaryGoalChip,
    },
    constraints: {
      budgetUsd: card.constraints.budgetUsd,
      executionMonths: card.constraints.executionMonths,
      extraText: card.constraints.notes,
    },
    feature: {
      title: card.feature.title,
      description: card.feature.description,
      changeType: FeatureChangeType.Feature,
      packaging: card.feature.packaging,
    },
    financials: {
      provideLater: false,
      cashUsd: company.cashUsd,
      customerCount: company.customerCount,
      mrrUsd: company.mrrUsd,
      runwayMonths: company.runwayMonths,
    },
    fieldSources: demoFixtureFieldSources(),
    scenarios,
    assumptions,
  });
}
