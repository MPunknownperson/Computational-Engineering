import type { ReactNode } from "react";

/** Each policy route owns its metadata; restricted supplements inherit no public schema. */
export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
