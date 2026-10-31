import type { ReactNode } from "react";
import { metadataFor } from "@/lib/seo";
import { SearchContext } from "@/components/search/SearchContext";

export const generateMetadata = () => metadataFor("/accessibility");
export default function PageLayout({ children }: { children: ReactNode }) {
  return <><SearchContext path="/accessibility" />{children}</>;
}
