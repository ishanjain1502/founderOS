import type { FinancialMappedMetrics } from "./contracts/finance";

export type FinanceCheck = {
  code: string;
  severity: "warn" | "info";
  message: string;
};

export type FinanceChecksContext = {
  packHash: string;
  sentPackHash: string;
  intakeRunwayMonths?: number;
  cashUsd?: number;
  monthlyBurnUsd?: number;
  mapped?: FinancialMappedMetrics;
};

export function runFinanceDeterministicChecks(
  ctx: FinanceChecksContext,
): FinanceCheck[] {
  const checks: FinanceCheck[] = [];

  if (ctx.packHash !== ctx.sentPackHash) {
    checks.push({
      code: "pack_hash_mismatch",
      severity: "warn",
      message: "Sent inputs do not match the approved assumption pack hash.",
    });
  }

  if (
    ctx.cashUsd !== undefined &&
    ctx.monthlyBurnUsd !== undefined &&
    ctx.monthlyBurnUsd > 0 &&
    ctx.intakeRunwayMonths !== undefined &&
    ctx.intakeRunwayMonths > 0
  ) {
    const derived = ctx.cashUsd / ctx.monthlyBurnUsd;
    const delta =
      Math.abs(derived - ctx.intakeRunwayMonths) / ctx.intakeRunwayMonths;
    if (delta > 0.25) {
      checks.push({
        code: "runway_tension",
        severity: "warn",
        message:
          "Derived runway from cash and burn differs from intake runway by more than 25%.",
      });
    }
  }

  const metric = ctx.mapped;
  if (metric?.adoption.provided && metric.adoption.value !== undefined) {
    if (metric.adoption.value < 0 || metric.adoption.value > 100) {
      checks.push({
        code: "adoption_out_of_range",
        severity: "warn",
        message: "Adoption rate must be between 0 and 100.",
      });
    }
  }

  return checks;
}
