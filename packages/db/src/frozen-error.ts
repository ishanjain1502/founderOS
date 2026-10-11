export class FrozenSessionError extends Error {
  constructor(message = "Session intake is frozen") {
    super(message);
    this.name = "FrozenSessionError";
  }
}
