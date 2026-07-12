import { SORT_VISUALIZERS } from "../lib/sort-visualizers";
import { PATHFINDING_VISUALIZERS } from "../lib/pathfinding-visualizers";
import { DP_VISUALIZERS } from "../lib/dp-visualizers";
import { GRAPH_VISUALIZERS } from "../lib/graph-visualizers";
import { SEARCH_VISUALIZERS } from "../lib/search-visualizers";
import { TREE_VISUALIZERS } from "../lib/tree-visualizers";

export type WorkerRequest =
  | { kind: "sort"; algorithmId: string; input: number[] }
  | { kind: "pathfinding"; algorithmId: string }
  | { kind: "dp"; algorithmId: string }
  | { kind: "graph"; algorithmId: string }
  | { kind: "search"; algorithmId: string }
  | { kind: "tree"; algorithmId: string };

export type WorkerResponse = {
  /** どのrequestに対する結果かをpostMessageの往復越しに相関させるためエコーバックする。 */
  request: WorkerRequest;
  frames: unknown[];
};

/**
 * アルゴリズムのステップ列(フレーム)生成をメインスレッド外で行うWeb Worker。
 * 状態分離型アーキテクチャの「Web Workers上でアルゴリズムを実行する」という設計方針を、
 * 可視化フレームの事前一括生成という現状の簡易実装の範囲内で反映したもの。
 * 本来のdiffベースの状態記録・IndexedDBキャッシュはまだ実装していない(docs/progress.md参照)。
 */
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (data: WorkerResponse) => void;
};

ctx.onmessage = (event) => {
  const request = event.data;
  let frames: unknown[] = [];

  if (request.kind === "sort") {
    const generate = SORT_VISUALIZERS[request.algorithmId];
    frames = generate ? generate(request.input) : [];
  } else if (request.kind === "pathfinding") {
    const generate = PATHFINDING_VISUALIZERS[request.algorithmId];
    frames = generate ? generate() : [];
  } else if (request.kind === "dp") {
    const generate = DP_VISUALIZERS[request.algorithmId];
    frames = generate ? generate() : [];
  } else if (request.kind === "graph") {
    const generate = GRAPH_VISUALIZERS[request.algorithmId];
    frames = generate ? generate() : [];
  } else if (request.kind === "search") {
    const generate = SEARCH_VISUALIZERS[request.algorithmId];
    frames = generate ? generate() : [];
  } else if (request.kind === "tree") {
    const generate = TREE_VISUALIZERS[request.algorithmId];
    frames = generate ? generate() : [];
  }

  ctx.postMessage({ request, frames });
};
