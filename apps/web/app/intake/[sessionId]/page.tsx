import { Suspense } from "react";
import { IntakeWizard } from "@/components/intake/IntakeWizard";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
          <p>Loading intake…</p>
        </main>
      }
    >
      <IntakeWizard sessionId={sessionId} />
    </Suspense>
  );
}
