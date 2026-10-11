/** Browser-safe exports (no Node built-ins). */
export {
  EpistemicKind,
  epistemicLabel,
  CLAIM_SAFETY_COPY,
} from "./epistemic";

export { RunMode, parseRunMode } from "./run-mode";

export {
  FORBIDDEN_PHRASES,
  findForbiddenPhrases,
  type ForbiddenPhrase,
} from "./forbidden-phrases";

export {
  type DemoCompany,
  type DemoConstraints,
  type DemoDecisionCard,
  type DemoFeature,
  type DemoQualitativeScenario,
  type DemoQuantitativeScenario,
  type DemoScenarioAssumptions,
  loadDemoCard,
} from "./demo-card";

export {
  PrimarySegment,
  FeatureChangeType,
} from "./contracts/enums";

export { EvidenceVendor } from "./contracts/evidence";

export {
  ClaimOwner,
  ClaimStatus,
  mayAgentMutate,
  claimsConflict,
  contradictionPredicate,
} from "./contracts/claim";

export {
  LAST_SESSION_COOKIE,
  SHORT_TEXT_MAX,
  QUESTION_MAX,
  PRODUCT_SUMMARY_MAX,
  FEATURE_DESCRIPTION_MAX,
  MARKET_BEHAVIOR_MAX,
  GoalChip,
  SizeBand,
  DecisionHorizon,
  FieldSource,
  ScopeCheckStatus,
  intakeDraftPartialSchema,
  intakeDraftSchema,
  emptyIntakeDraft,
  validateIntakeStep,
  isIntakeComplete,
  intakeWarnings,
  financialMetricCount,
  deepMergeIntake,
  type IntakeDraft,
  type IntakeDraftPartial,
} from "./contracts/intake";

export {
  epistemicSnapshotSchema,
  emptyEpistemicSnapshot,
  validateEpistemicSnapshot,
  epistemicWarnings,
  type EpistemicSnapshot,
} from "./contracts/epistemic-snapshot";

export {
  DEMO_OBSERVED_SUMMARY,
  DEMO_HYPOTHESIS_STATEMENT,
  WTP_UNKNOWN_STATEMENT,
  DEMO_OBSERVED_KEY_SUFFIX,
  demoObservedIdentityKey,
  projectIntakeToEpistemic,
} from "./project-intake-to-epistemic";
