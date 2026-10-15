import { AlgorithmCatalog } from "@/components/catalog/AlgorithmCatalog";
import { getAllAlgorithmsMeta, type AlgorithmMeta } from "@/lib/content/algorithms";
import { START_HERE_IDS, USE_CASE_GROUPS } from "@/lib/entry-points";

export default function HomePage() {
  const algorithms = getAllAlgorithmsMeta();
  const byId = new Map(algorithms.map((algorithm) => [algorithm.id, algorithm]));

  // 入口に載せるidが存在しない場合は、リンク切れのまま公開せずビルドを失敗させる
  const resolve = (id: string): AlgorithmMeta => {
    const meta = byId.get(id);
    if (!meta) throw new Error(`入口(lib/entry-points.ts)のid "${id}" が content/algorithms に存在しません`);
    return meta;
  };

  const entryPoints = {
    start: START_HERE_IDS.map(resolve),
    useCases: USE_CASE_GROUPS.map((group) => ({ label: group.label, items: group.ids.map(resolve) })),
  };

  return <AlgorithmCatalog algorithms={algorithms} featuredId="quick-sort" entryPoints={entryPoints} />;
}
