import { metadataFor } from "@/lib/seo";
import { HubPage } from "@/components/landing/HubPage";

export const generateMetadata = () => metadataFor("/reference");
export default function ReferenceHub() { return <HubPage section="reference" />; }
