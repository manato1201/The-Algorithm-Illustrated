---
name: 重み付きA*探索(Weighted A*)
category: 探索
subcategory: グラフ・経路探索
complexity: O(E)
summary: A*探索のヒューリスティック項に1より大きい重みwを掛けてf=g+w・hとすることで、最短経路の保証を最大w倍まで緩める代わりに探索速度を大きく向上させる実用的な変種。
---

## 概要

[A*探索](/algorithms/a-star)は`f = g + h`(スタートからの実コスト`g`とゴールまでの推定コスト`h`の合計)で優先順位を決めることで最短経路を保証するが、ヒューリスティック`h`の効きが弱い問題や探索空間が非常に広い問題では、最適性にこだわるあまり展開するノード数が膨大になり、実時間の制約に間に合わないことがある。重み付きA*(Weighted A*)は`f = g + w・h`(`w > 1`)としてヒューリスティック項を強調することで、探索を積極的にゴール方向へ誘導し、多少の遠回りを許容する代わりに劇的な高速化を狙う実用的な変種である。ロボティクスやゲームAIのように「厳密な最短経路よりも、限られた時間内で十分に良い経路を得たい」場面で広く使われる。

## 仕組み

1. 優先度付きキューにスタートノードを`f = g + w・h(スタート)`で登録する(`g`はスタートからの実コスト、`w`はあらかじめ決めた重み)
2. `f`が最小のノードをキューから取り出し、そこを現在地とする
3. 現在地がゴールなら探索終了。そうでなければ隣接ノードそれぞれについて`g`を更新し、`f = g + w・h`を計算してキューに追加する
4. ゴールに到達するまで2〜3を繰り返す

`w = 1`のときは通常の[A*探索](/algorithms/a-star)そのものになる。`w`を大きくするほどヒューリスティック`h`の影響が支配的になり、`w`が非常に大きい極限では「実コスト`g`をほぼ無視してゴールまでの推定距離だけで進む」[貪欲最良優先探索](/algorithms/best-first-search)に近づいていく。重み付きA*は、この2つの探索法の間を`w`というたった1つのパラメータで連続的に行き来できる点が特徴である。

## 特性・トレードオフ

- **計算量**: [A*探索](/algorithms/a-star)と同じくO(E)(優先度付きキュー使用時はO(E log V))だが、`w`を大きくするほど枝刈りが強く効き、実際に展開されるノード数は元のA*より大幅に少なくなりやすい
- **有界な最適性(bounded suboptimality)**: 元のヒューリスティック`h`が admissible(実際のコストを絶対に過大評価しない)であれば、重み付きA*が見つける解のコストは最適解のコストの**高々`w`倍以内**に収まることが理論的に保証される。「最短性を完全に諦めるわけではなく、悪くとも`w`倍以内」という緩やかな最適性保証を持つ点が、単純な貪欲法との大きな違いである
- **最短性と速度の連続的なトレードオフ**: `w = 1`で厳密な最短経路(通常のA*)、`w`を増やすほど探索は速くなるが経路は最適から離れる可能性が増す。問題の性質や許容できる誤差に応じて`w`を調整できる柔軟性がある
- **発展形**: 探索の序盤は大きい`w`で素早く暫定解を得て、残り時間で`w`を徐々に1に近づけながら解を改善していくAnytime Repairing A*(ARA*)など、重み付きA*の考え方はより高度なリアルタイム探索アルゴリズムの土台にもなっている
- **使いどころ**: ゲームAIのキャラクター移動のようにリアルタイム性が最短性より重視される場面、ロボットの経路計画で「多少の遠回りは許容するので短時間で解が欲しい」場面、[A*探索](/algorithms/a-star)ではノード展開数が多すぎて実用的な時間で解けない大規模な探索空間

## 実装例

```python
import heapq
from typing import Callable, Dict, List, Optional, Tuple


def weighted_a_star(
    graph: Dict[str, List[Tuple[str, float]]],
    start: str,
    goal: str,
    heuristic: Callable[[str], float],
    weight: float = 1.5,
) -> Optional[List[str]]:
    """weight=1.0なら通常のA*と一致する。weightを大きくするほど高速だが最適性の保証は緩む"""
    open_set: List[Tuple[float, str]] = [(weight * heuristic(start), start)]
    g_score: Dict[str, float] = {start: 0.0}
    came_from: Dict[str, str] = {}
    visited = set()

    while open_set:
        _, node = heapq.heappop(open_set)
        if node == goal:
            path = [node]
            while node in came_from:
                node = came_from[node]
                path.append(node)
            return path[::-1]
        if node in visited:
            continue
        visited.add(node)

        for neighbor, cost in graph.get(node, []):
            tentative_g = g_score[node] + cost
            if tentative_g < g_score.get(neighbor, float("inf")):
                g_score[neighbor] = tentative_g
                came_from[neighbor] = node
                f = tentative_g + weight * heuristic(neighbor)
                heapq.heappush(open_set, (f, neighbor))

    return None
```

```typescript
class MinHeap<T> {
  private items: [number, T][] = [];
  push(priority: number, item: T): void {
    this.items.push([priority, item]);
    this.items.sort((a, b) => a[0] - b[0]);
  }
  pop(): [number, T] | undefined {
    return this.items.shift();
  }
  get isEmpty(): boolean {
    return this.items.length === 0;
  }
}

// weight=1.0なら通常のA*と一致する。weightを大きくするほど高速だが最適性の保証は緩む
function weightedAStar(
  graph: Map<string, [string, number][]>,
  start: string,
  goal: string,
  heuristic: (node: string) => number,
  weight = 1.5,
): string[] | null {
  const gScore = new Map<string, number>([[start, 0]]);
  const cameFrom = new Map<string, string>();
  const visited = new Set<string>();
  const open = new MinHeap<string>();
  open.push(weight * heuristic(start), start);

  while (!open.isEmpty) {
    const popped = open.pop();
    if (!popped) break;
    const [, node] = popped;
    if (node === goal) {
      const path = [node];
      let cur = node;
      while (cameFrom.has(cur)) {
        cur = cameFrom.get(cur)!;
        path.push(cur);
      }
      return path.reverse();
    }
    if (visited.has(node)) continue;
    visited.add(node);

    for (const [neighbor, cost] of graph.get(node) ?? []) {
      const tentativeG = (gScore.get(node) ?? Infinity) + cost;
      if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
        gScore.set(neighbor, tentativeG);
        cameFrom.set(neighbor, node);
        open.push(tentativeG + weight * heuristic(neighbor), neighbor);
      }
    }
  }
  return null;
}
```
