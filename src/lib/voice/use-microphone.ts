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

/** Silent checks only. Never asks for permission or opens a microphone. */
export function useMicrophoneEligibility() {
  const [eligibility, setEligibility] = useState<Eligibility>({ checking: true, problem: null });
  const mounted = useRef(false);
  const revision = useRef(0);
  const unsubscribePermission = useRef<(() => void) | null>(null);

  const recheck = useCallback(async () => {
    const request = ++revision.current;
    const current = () => mounted.current && request === revision.current;
    if (!mounted.current) return;
    setEligibility((value) => ({ ...value, checking: true }));
    let problem: MicrophoneProblem | null = null;
    if (!window.isSecureContext) problem = "insecure";
    else if (typeof navigator.mediaDevices?.getUserMedia !== "function") problem = "unsupported";
    const policies = document as Document & {
      permissionsPolicy?: { allowsFeature: (feature: string) => boolean };
      featurePolicy?: { allowsFeature: (feature: string) => boolean };
    };
    try {
      const policy = policies.permissionsPolicy ?? policies.featurePolicy;
      if (!problem && policy && !policy.allowsFeature("microphone")) problem = "policy";
    } catch { /* Older WebKit has no Permissions Policy introspection. */ }
    unsubscribePermission.current?.();
    unsubscribePermission.current = null;
    if (!problem && navigator.permissions?.query) {
      let permission: PermissionStatus | null = null;
      try {
        permission = await within<PermissionStatus | null>(
          navigator.permissions.query({ name: "microphone" as PermissionName }), 1_500, null,
        );
      } catch { /* Safari may not implement a microphone permission query. */ }
      if (!current()) return;
      if (permission) {
        const changed = () => { void recheck(); };
        permission.addEventListener("change", changed);
        unsubscribePermission.current = () => permission.removeEventListener("change", changed);
        if (permission.state === "denied") problem = "denied";
        // An empty list before permission is NOT evidence of missing hardware.
        // Only treat enumeration as authoritative once access is granted.
        if (permission.state === "granted" && navigator.mediaDevices.enumerateDevices) {
          const devices = await within<MediaDeviceInfo[] | null>(navigator.mediaDevices.enumerateDevices(), 1_500, null);
          if (devices && !devices.some((device) => device.kind === "audioinput")) problem = "no-device";
        }
      }
    }
    if (current()) setEligibility({ checking: false, problem });
  }, []);

  const reportProblem = useCallback((problem: MicrophoneProblem) => {
    ++revision.current;
    if (mounted.current) setEligibility({ checking: false, problem });
  }, []);

  useEffect(() => {
    mounted.current = true;
    void recheck();
    const refresh = () => { if (document.visibilityState === "visible") void recheck(); };
    navigator.mediaDevices?.addEventListener?.("devicechange", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      mounted.current = false;
      ++revision.current;
      unsubscribePermission.current?.();
      navigator.mediaDevices?.removeEventListener?.("devicechange", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [recheck]);

  return { ...eligibility, recheck, reportProblem };
}
