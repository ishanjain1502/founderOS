import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Session not found</h1>
      <p>
        <Link href="/">Return home</Link>
      </p>
    </main>
  );
}
