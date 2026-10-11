export function continueHref(status: string, id: string): string {
  if (status === "approved") return `/intake/${id}/recap`;
  if (status === "frozen") return `/session/${id}`;
  return `/intake/${id}?step=1`;
}
