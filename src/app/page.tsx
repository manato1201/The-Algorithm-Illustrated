import { AlgorithmCatalog } from "@/components/catalog/AlgorithmCatalog";
import { getAllAlgorithmsMeta } from "@/lib/content/algorithms";

export default function HomePage() {
  const algorithms = getAllAlgorithmsMeta();
  return <AlgorithmCatalog algorithms={algorithms} featuredId="quick-sort" />;
}
