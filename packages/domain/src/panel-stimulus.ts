import type { IntakeDraftPartial } from "./contracts/intake";

export type PanelStimulusBuilt = {
  text: string;
  priceShown: { usd: number; period: string } | null;
  packaging: string | null;
  marketText: string;
};

export function buildPanelStimulus(intake: IntakeDraftPartial): PanelStimulusBuilt {
  const feature = intake.feature ?? {};
  const company = intake.company ?? {};
  const market = intake.market ?? {};

  const title = feature.title?.trim() ? feature.title : "(no title)";
  const lines = [
    `Feature: ${title}`,
    `Description: ${feature.description ?? ""}`,
    `Product: ${company.productSummary ?? ""}`,
  ];

  let priceShown: PanelStimulusBuilt["priceShown"] = null;
  if (typeof feature.proposedPriceUsd === "number") {
    const period = feature.proposedPricePeriod?.trim()
      ? feature.proposedPricePeriod
      : "period absent";
    lines.push(`Price shown: ${feature.proposedPriceUsd} USD ${period}`);
    priceShown = { usd: feature.proposedPriceUsd, period };
  }

  const packagingTrimmed = feature.packaging?.trim() ?? "";
  const packaging = packagingTrimmed.length > 0 ? packagingTrimmed : null;

  const marketText = market.targetMarketBehavior?.trim() ?? "";

  return {
    text: lines.join("\n"),
    priceShown,
    packaging,
    marketText,
  };
}
