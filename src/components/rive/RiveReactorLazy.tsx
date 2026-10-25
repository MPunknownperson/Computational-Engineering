"use client";

import dynamic from "next/dynamic";
import type { RiveReactorProps } from "./RiveReactor";

/** Client-only loader: the Rive WASM runtime touches `window` and `canvas`. */
const RiveReactor = dynamic(() => import("./RiveReactor").then((m) => m.RiveReactor), {
  ssr: false,
  loading: () => <div className="rive-reactor"><div className="rive-stage skeleton" aria-hidden /><div className="rive-controls"><p className="text-sm text-slate-500">Preparing the interactive scene…</p></div></div>,
});

export function RiveReactorLazy(props: RiveReactorProps) {
  return <RiveReactor {...props} />;
}
