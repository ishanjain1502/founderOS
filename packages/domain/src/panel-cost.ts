export const PANEL_MODEL_ID = "deepseek/deepseek-v4-flash";

export const PANEL_DEMO_USD_CAP = 2;
export const PANEL_FULL_USD_CAP = 15;

export const PANEL_DEMO_CLOCK_MS = 90_000;
export const PANEL_FULL_CLOCK_MS = 720_000;
export const PANEL_FULL_NOTICE_MS = 480_000;

const INPUT_USD_PER_MILLION = 0.3;
const OUTPUT_USD_PER_MILLION = 1.2;
const CACHE_READ_USD_PER_MILLION = 0.006;

export function estimatePanelUsd(input: {
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens: number;
}): number {
  const nonCachePrompt = input.promptTokens - input.cacheReadTokens;
  return (
    (nonCachePrompt * INPUT_USD_PER_MILLION) / 1_000_000 +
    (input.cacheReadTokens * CACHE_READ_USD_PER_MILLION) / 1_000_000 +
    (input.completionTokens * OUTPUT_USD_PER_MILLION) / 1_000_000
  );
}
