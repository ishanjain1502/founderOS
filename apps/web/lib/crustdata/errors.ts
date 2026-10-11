export class CrustdataAuthError extends Error {
  override name = "CrustdataAuthError";

  constructor(message = "Crustdata authentication failed") {
    super(message);
  }
}

export class CrustdataTransportError extends Error {
  override name = "CrustdataTransportError";

  constructor(message = "Crustdata transport failed", options?: ErrorOptions) {
    super(message, options);
  }
}

/** 429 after one wait — do not apply 5xx retry loop (SP-05 §9). */
export class CrustdataRateLimitError extends CrustdataTransportError {
  override name = "CrustdataRateLimitError";
}

/** Non-auth 4xx from Crustdata (SP-05 §11) — orchestrator maps to `failed`, no fallback. */
export class CrustdataClientError extends Error {
  override name = "CrustdataClientError";

  constructor(message = "Crustdata client request rejected") {
    super(message);
  }
}
