"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FlowIO } from "@/lib/flow-overview";
import type { ProvenanceInfo } from "@/lib/provenance";

/**
 * 可視化の再生コントロールが、どのアルゴリズムの何を表示しているかを知るための情報(全体図・値の出どころの札)。
 * 振り分け役(AlgorithmVisualizer)が1か所で計算して渡すので、10種類以上ある可視化コンポーネントは編集しない。
 * Providerが無い場所では null(全体図と札を出さないだけで、再生コントロールは今までどおり動く)。
 */
export type AlgorithmViewMeta = {
  flow: FlowIO;
  provenance: ProvenanceInfo;
};

const AlgorithmMetaContext = createContext<AlgorithmViewMeta | null>(null);

export function AlgorithmMetaProvider({
  value,
  children,
}: {
  value: AlgorithmViewMeta;
  children: ReactNode;
}) {
  return (
    <AlgorithmMetaContext.Provider value={value}>
      {children}
    </AlgorithmMetaContext.Provider>
  );
}

export function useAlgorithmMeta(): AlgorithmViewMeta | null {
  return useContext(AlgorithmMetaContext);
}
