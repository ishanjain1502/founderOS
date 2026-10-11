export class EpistemicProjectionError extends Error {
  readonly code = "epistemic_projection_failed" as const;

  constructor(message = "Epistemic projection failed validation") {
    super(message);
    this.name = "EpistemicProjectionError";
  }
}
