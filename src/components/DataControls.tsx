"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { SITE } from "@/lib/site";

const KEY = SITE.storageKeys[0].key;

/** Self-service controls for formulas associated with the current browser. */
export function DataControls() {
  const [ws, setWs] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(KEY) ?? SITE.legacyStorageKeys.map((k) => localStorage.getItem(k)).find(Boolean) ?? null;
    setWs(token);
    if (!token) { setCount(0); return; }
    try {
      const j = await fetch(`/api/formulas?workspace=${encodeURIComponent(token)}&summary=1`).then((r) => r.json());
      setCount(typeof j.count === "number" ? j.count : 0);
    } catch {
      setCount(null);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function download() {
    if (!ws) return;
    const j = await fetch(`/api/formulas?workspace=${encodeURIComponent(ws)}&all=1`).then((r) => r.json());
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...j }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${SITE.name.toLowerCase()}-saved-formulas.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNote("A copy of your saved formulas has been downloaded.");
  }

  async function deleteAll() {
    if (!ws) return;
    setBusy(true);
    try {
      const j = await fetch(`/api/formulas?workspace=${encodeURIComponent(ws)}&all=1`, { method: "DELETE" }).then((r) => r.json());
      setConfirming(false);
      setNote(`Removed ${j.removed ?? 0} saved formula${j.removed === 1 ? "" : "s"}.`);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function forget() {
    localStorage.removeItem(KEY);
    SITE.legacyStorageKeys.forEach((k) => localStorage.removeItem(k));
    setNote("This browser is no longer connected to its saved formulas. The formulas themselves have not been removed.");
    refresh();
  }

  return (
    <div className="sketch" id="your-data">
      <h2 className="text-lg font-extrabold tracking-tight">Manage saved formulas</h2>
      <p className="mt-1 max-w-xl text-sm text-slate-600">
        These controls apply to formulas associated with the browser you are using. Removing the browser reference does not erase saved formulas; remove those separately if you want them deleted.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-[color:var(--line)] bg-[#fffdf5] px-3.5 py-2.5">
          <dt className="text-[.62rem] font-extrabold uppercase tracking-[.16em] text-slate-500">Browser connection</dt>
          <dd className="mt-1 text-sm font-bold">{ws ? "Saved workspace found" : "No saved workspace in this browser"}</dd>
        </div>
        <div className="rounded-xl border-2 border-[color:var(--line)] bg-[#fffdf5] px-3.5 py-2.5">
          <dt className="text-[.62rem] font-extrabold uppercase tracking-[.16em] text-slate-500">Saved formulas</dt>
          <dd className="mt-1 text-sm font-bold">{count === null ? "Unable to check" : count}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <button className="btn text-sm" onClick={download} disabled={!ws || !count}>
          <Icon name="layers" size={15} /> Download a copy
        </button>
        {!confirming ? (
          <button className="btn text-sm" onClick={() => setConfirming(true)} disabled={!ws || !count}>Remove saved formulas</button>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-[color:var(--line)] bg-[#ffe4e0] px-2.5 py-1.5 text-sm font-bold">
            Remove {count} saved formula{count === 1 ? "" : "s"}?
            <button className="btn btn-primary !py-1 text-xs" onClick={deleteAll} disabled={busy}>{busy ? "Removing…" : "Confirm removal"}</button>
            <button className="btn !py-1 text-xs" onClick={() => setConfirming(false)}>Cancel</button>
          </span>
        )}
        <button className="btn btn-ghost text-sm" onClick={forget} disabled={!ws}>Disconnect this browser</button>
      </div>
      {note && <p role="status" className="mt-3 text-sm font-semibold text-[#146c3a]">{note}</p>}
    </div>
  );
}
