import { AlgorithmCatalog } from "@/components/catalog/AlgorithmCatalog";
import { sampleAlgorithms } from "@/lib/sample-algorithms";

export default function HomePage() {
  return <AlgorithmCatalog algorithms={sampleAlgorithms} featuredId="quick-sort" />;
}
