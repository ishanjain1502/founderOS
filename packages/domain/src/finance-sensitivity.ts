export type SensitivityTriple = { low: number; base: number; high: number };

export type SensitivityGrid = {
  price: SensitivityTriple;
  adoption: SensitivityTriple;
};

export function buildSensitivityGrid(
  basePrice: number,
  baseAdoption: number,
  ranges?: {
    priceMin?: number;
    priceMax?: number;
    adoptionMin?: number;
    adoptionMax?: number;
  },
): SensitivityGrid {
  const priceLow = ranges?.priceMin ?? basePrice * 0.8;
  const priceHigh = ranges?.priceMax ?? basePrice * 1.2;
  const adoptionLow = clampPercent(
    ranges?.adoptionMin ?? baseAdoption * 0.7,
  );
  const adoptionHigh = clampPercent(
    ranges?.adoptionMax ?? baseAdoption * 1.3,
  );

  return {
    price: { low: priceLow, base: basePrice, high: priceHigh },
    adoption: {
      low: adoptionLow,
      base: baseAdoption,
      high: adoptionHigh,
    },
  };
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export type SensitivityDriverMetric = {
  priceDelta: number;
  adoptionDelta: number;
};

export function rankSensitivityDrivers(
  metric: SensitivityDriverMetric,
): ("price" | "adoption")[] {
  const ranked: { key: "price" | "adoption"; delta: number }[] = [
    { key: "price", delta: Math.abs(metric.priceDelta) },
    { key: "adoption", delta: Math.abs(metric.adoptionDelta) },
  ];
  ranked.sort((a, b) => b.delta - a.delta);
  return ranked.map((r) => r.key);
}
