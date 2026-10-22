import { metadataFor } from "@/lib/seo";
import { HubPage } from "@/components/landing/HubPage";

export const generateMetadata = () => metadataFor("/convert");
export default function ConvertHub() { return <HubPage section="convert" />; }
