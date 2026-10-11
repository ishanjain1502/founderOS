export function featureOneLiner(feature?: {
  title?: string;
  description?: string;
}): string {
  if (feature?.title && feature.title.trim()) return feature.title.trim();
  const d = feature?.description ?? "";
  const sentence = d.split(/[.!?]/)[0] ?? d;
  return sentence.trim().slice(0, 160);
}
