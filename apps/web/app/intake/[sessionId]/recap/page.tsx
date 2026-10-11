import { Suspense } from "react";
import { IntakeRecap } from "@/components/intake/IntakeRecap";

export default async function IntakeRecapPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
          <p>Loading recap…</p>
        </main>
      }
    >
      <IntakeRecap sessionId={sessionId} />
    </Suspense>
  );
}
