export const mainStyle = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "2rem 1rem",
} as const;

export const labelBlock = {
  display: "block",
  marginTop: "1rem",
  fontWeight: 600,
} as const;

export const inputStyle = {
  display: "block",
  marginTop: "0.35rem",
  width: "100%",
  maxWidth: "100%",
} as const;

export function fieldError(message?: string) {
  if (!message) return null;
  return (
    <p
      role="alert"
      style={{ color: "#b00020", fontSize: "0.875rem", margin: "0.25rem 0 0" }}
    >
      {message}
    </p>
  );
}

export function charCounter(current: number, max: number) {
  return (
    <span
      style={{ fontSize: "0.75rem", color: current > max ? "#b00020" : "#555" }}
    >
      {current}/{max}
    </span>
  );
}

export function formatEnumLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export type ErrFn = (path: string) => string | undefined;
