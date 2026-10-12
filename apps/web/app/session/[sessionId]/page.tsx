"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  RunMode,
  buildEpistemicViewModel,
  type EpistemicSnapshot,
  type IntakeDraftPartial,
} from "@ceo-sandbox/domain";
import { mainStyle } from "@/components/intake/steps/shared";
import { CrustdataResearch } from "@/components/session/CrustdataResearch";
import { SyntheticPanel } from "@/components/session/SyntheticPanel";
import { EpistemicLists } from "@/components/session/EpistemicLists";

type SessionPayload = {
  id: string;
  status: string;
  intake: IntakeDraftPartial;
  epistemic: EpistemicSnapshot | null;
};

export default function SessionPlaceholderPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [intake, setIntake] = useState<IntakeDraftPartial | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("");
  const [epistemic, setEpistemic] = useState<EpistemicSnapshot | null>(null);
  const [epistemicVm, setEpistemicVm] = useState(
    buildEpistemicViewModel(null),
  );
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  async function refreshSession() {
    if (!sessionId || typeof sessionId !== "string") return;
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) return;
    const body = (await res.json()) as SessionPayload;
    setIntake(body.intake);
    setSessionStatus(body.status);
    setEpistemic(body.epistemic ?? null);
    setEpistemicVm(buildEpistemicViewModel(body.epistemic ?? null));
  }

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (cancelled) return;
      if (res.status === 404) {
        setMissing(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setMissing(true);
        setLoading(false);
        return;
      }
      const body = (await res.json()) as SessionPayload;
      setIntake(body.intake);
      setSessionStatus(body.status);
      setEpistemic(body.epistemic ?? null);
      setEpistemicVm(buildEpistemicViewModel(body.epistemic ?? null));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (missing) {
    return (
      <main style={mainStyle}>
        <h1>Session not found</h1>
        <p>
          <Link href="/">Return home</Link>
        </p>
      </main>
    );
  }

  if (loading || !sessionId || typeof sessionId !== "string") {
    return (
      <main style={mainStyle}>
        <p>Loading…</p>
      </main>
    );
  }

  const question = intake?.decision?.questionText ?? "";
  const isDemo = intake?.mode === RunMode.Demo;

  return (
    <main style={mainStyle}>
      <h1>Investigation</h1>
      <p>Intake is frozen. The investigation pipeline lands in SP-10.</p>
      {question ? (
        <p style={{ marginTop: "1rem" }}>
          <strong>Decision question:</strong> {question}
        </p>
      ) : null}
      {isDemo && (
        <p style={{ marginTop: "0.5rem" }}>
          <span
            style={{
              display: "inline-block",
              padding: "0.15rem 0.5rem",
              fontSize: "0.75rem",
              borderRadius: 4,
              background: "#eee",
            }}
          >
            Illustrative example
          </span>
        </p>
      )}
      <CrustdataResearch
        sessionId={sessionId}
        sessionStatus={sessionStatus}
        crustdataStatus={epistemic?.marketResearch?.crustdata.status}
        recordedBanner={epistemicVm.recordedBanner}
        fallbackBanner={epistemicVm.fallbackBanner}
        querySubmitted={epistemicVm.querySubmitted}
        onComplete={() => void refreshSession()}
      />
      <SyntheticPanel
        sessionId={sessionId}
        sessionStatus={sessionStatus}
        mode={intake?.mode ?? RunMode.Demo}
        panel={epistemic?.panel}
        onComplete={() => void refreshSession()}
      />
      <EpistemicLists model={epistemicVm} />
      <p style={{ marginTop: "1.25rem" }}>
        <Link href={`/intake/${sessionId}/recap`}>View intake recap</Link>
      </p>
    </main>
  );
}
