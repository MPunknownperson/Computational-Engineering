"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MicrophoneStatus } from "@/lib/browser-tokens";

export type MicrophoneProblem = MicrophoneStatus | "policy";
type Eligibility = { checking: boolean; problem: MicrophoneProblem | null };

export async function within<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.catch(() => fallback),
      new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), ms); }),
    ]);
  } finally { clearTimeout(timer); }
}

/**
 * Static page-load checks only. Never queries Permissions, never enumerates
 * devices, never calls getUserMedia, and never inspects Permissions-Policy —
 * any of those can surface a microphone prompt or mark phones/tablets as
 * "unsupported" before the visitor has asked to speak.
 *
 * Permission and hardware outcomes are reported after a user-initiated
 * recognition attempt via `reportProblem`.
 */
export function useMicrophoneEligibility() {
  const [eligibility, setEligibility] = useState<Eligibility>({ checking: false, problem: null });
  const mounted = useRef(false);
  const revision = useRef(0);

  const recheck = useCallback(async () => {
    ++revision.current;
    if (!mounted.current) return;
    // The only thing that is knowable without talking to the microphone:
    // an insecure document cannot capture audio. Everything else waits for a tap.
    const problem: MicrophoneProblem | null = typeof window !== "undefined" && !window.isSecureContext ? "insecure" : null;
    setEligibility({ checking: false, problem });
  }, []);

  const reportProblem = useCallback((problem: MicrophoneProblem) => {
    ++revision.current;
    if (mounted.current) setEligibility({ checking: false, problem });
  }, []);

  useEffect(() => {
    mounted.current = true;
    void recheck();
    return () => {
      mounted.current = false;
      ++revision.current;
    };
  }, [recheck]);

  return { ...eligibility, recheck, reportProblem };
}
