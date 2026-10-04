import type { ReactNode } from "react";
import { metadataFor } from "@/lib/seo";
import { SearchContext } from "@/components/search/SearchContext";

export const generateMetadata = () => metadataFor("/disclaimer");
export default function PageLayout({ children }: { children: ReactNode }) {
  return <><SearchContext path="/disclaimer" />{children}</>;
}
