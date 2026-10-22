import { Suspense, type ReactNode } from "react";
import { metadataFor } from "@/lib/seo";
import { SearchContext } from "@/components/search/SearchContext";
import { ToolContext } from "@/components/search/ToolContext";

export const generateMetadata = () => metadataFor("/tools/units");
export default function ToolLayout({ children }: { children: ReactNode }) {
  return <>
    <SearchContext path="/tools/units" />
    <Suspense fallback={<p role="status" className="mx-auto max-w-6xl px-5 py-10">Preparing the tool…</p>}>{children}</Suspense>
    <ToolContext path="/tools/units" />
  </>;
}
