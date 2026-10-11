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
