import { metadataFor } from "@/lib/seo";
import { HubPage } from "@/components/landing/HubPage";

export const generateMetadata = () => metadataFor("/calculate");
export default function CalculateHub() { return <HubPage section="calculate" />; }
