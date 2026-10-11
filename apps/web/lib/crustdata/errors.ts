export class CrustdataAuthError extends Error {
  override name = "CrustdataAuthError";

  constructor(message = "Crustdata authentication failed") {
    super(message);
  }
}
