export enum RunMode {
  Demo = "demo",
  Full = "full",
}

export function parseRunMode(value: string): RunMode {
  switch (value) {
    case RunMode.Demo:
      return RunMode.Demo;
    case RunMode.Full:
      return RunMode.Full;
    default:
      throw new Error(`Unknown run mode: ${value}`);
  }
}
