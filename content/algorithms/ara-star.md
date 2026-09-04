---
name: Anytime Repairing A*(ARA*)
category: 探索
subcategory: グラフ・経路探索
complexity: O(E)(反復1回あたり、εを段階的に下げながら複数回実行)
summary: 制限時間内にまず速く粗い経路を出し、時間が余れば同じ探索木を再利用しながら徐々に最適解へ精度を高めていく、時間制約下の経路探索アルゴリズム。
---

## 概要

ロボットやリアルタイムのゲームAIでは「ちょうど良い最短経路を厳密に求める」よりも、「制限時間内に、悪くても使える経路をとにかく1つ出す」ことの方が重要な場面が多い。2003年にMaxim LikhachevらがA*を拡張して発表したARA*(Anytime Repairing A*)は、**ヒューリスティックを意図的に過大評価する重み係数εを使って最初は速く準最適な経路を求め、時間が許す限りεを徐々に1へ近づけながら、前回の探索結果を使い回して効率よく経路を改善し続ける**、いわゆる「エニータイムアルゴリズム(anytime algorithm)」の代表例である。

## 仕組み

1. 重み係数ε(≥1)を大きめの初期値(例えば2.5)に設定する。εが大きいほどヒューリスティックの影響が強くなり、探索は速いが最適性からは遠ざかる
2. `f = g + ε・h` を優先度とした重み付きA*探索を実行し、εに応じた準最適解を1つ求める(Weighted A*と同じ考え方)
3. この結果を「今の時点でのベストな経路」として保持しておく。時間が尽きればここで終了し、この経路を返す
4. まだ時間が残っていれば、εを少し小さくする(例えば0.1ずつ下げる)
5. εを下げたことで無効になった探索情報(以前は枝刈りされていたが、εを下げたことで有望になったノード)だけを再利用しながら**探索木をゼロから作り直さずに再利用し**、新しいεでの準最適解を求める
6. εが1に到達する(=通常のA*と同じ、最適性が保証される状態になる)か、制限時間が尽きるまで4〜5を繰り返す

「ゼロから探索し直すのではなく、以前の探索結果(INCONSワードリストなどで管理される再展開候補)を引き継いで再利用する」ことが、このアルゴリズムを実用的な速さにしている核心である。

## 特性・トレードオフ

- **計算量**: 1回の重み付きA*探索がO(E)。εを下げるたびに再探索するが、探索木の再利用により毎回ゼロから探索するより大幅に効率的。全体としては「使える時間予算」に応じて反復回数が決まる
- **エニータイム性**: いつ計算を打ち切っても、その時点で見つかっている「そこそこ良い」経路をすぐに返せる。リアルタイム性が求められるロボティクスやゲームAIとの相性が良い
- **準最適性の保証付き**: 現在のεの値に対して、出力される経路は最適解のε倍以内のコストであることが理論的に保証される(bounded suboptimality)。時間切れでも「どれだけ悪い経路か」の上限がわかる
- **Weighted A*との違い**: Weighted A*は固定のεで1回だけ探索するのに対し、ARA*は探索を使い回しながらεを段階的に下げ続け、最終的にはA*と同じ最適解に収束できる点が本質的な違い
- **使いどころ**: リアルタイムロボット経路計画(D*と組み合わせた動的環境への拡張であるAD*も派生として存在)、制限時間内での意思決定が必要なゲームAI、計算資源やタイムバジェットが状況によって変動する組み込みシステム

## 実装例

```python
import heapq
import math
from typing import Callable

Node = str


def ara_star(
    graph: dict[Node, list[tuple[Node, float]]],
    start: Node,
    goal: Node,
    heuristic: Callable[[Node], float],
    eps_start: float = 2.5,
    eps_step: float = 0.5,
) -> list[Node] | None:
    g: dict[Node, float] = {start: 0.0}
    parent: dict[Node, Node] = {}
    best_path: list[Node] | None = None
    epsilon = eps_start

    def reconstruct(node: Node) -> list[Node]:
        path = [node]
        while node in parent:
            node = parent[node]
            path.append(node)
        return path[::-1]

    while True:
        open_heap: list[tuple[float, Node]] = [(g[start] + epsilon * heuristic(start), start)]
        closed: set[Node] = set()
        g = {start: 0.0}
        parent = {}

        while open_heap:
            _, node = heapq.heappop(open_heap)
            if node in closed:
                continue
            if node == goal:
                best_path = reconstruct(node)
                break
            closed.add(node)
            for neighbor, weight in graph.get(node, []):
                tentative_g = g[node] + weight
                if tentative_g < g.get(neighbor, math.inf):
                    g[neighbor] = tentative_g
                    parent[neighbor] = node
                    if neighbor not in closed:
                        heapq.heappush(open_heap, (tentative_g + epsilon * heuristic(neighbor), neighbor))

        if epsilon <= 1.0:
            break
        epsilon = max(1.0, epsilon - eps_step)

    return best_path
```

```typescript
type Node = string;

function araStar(
  graph: Map<Node, [Node, number][]>,
  start: Node,
  goal: Node,
  heuristic: (n: Node) => number,
  epsStart = 2.5,
  epsStep = 0.5,
): Node[] | null {
  let bestPath: Node[] | null = null;
  let epsilon = epsStart;

  const reconstruct = (parent: Map<Node, Node>, node: Node): Node[] => {
    const path = [node];
    let cur = node;
    while (parent.has(cur)) {
      cur = parent.get(cur)!;
      path.push(cur);
    }
    return path.reverse();
  };

  while (true) {
    const g = new Map<Node, number>([[start, 0]]);
    const parent = new Map<Node, Node>();
    const closed = new Set<Node>();
    const open: [number, Node][] = [[epsilon * heuristic(start), start]];

    while (open.length > 0) {
      open.sort((a, b) => a[0] - b[0]);
      const [, node] = open.shift()!;
      if (closed.has(node)) continue;
      if (node === goal) {
        bestPath = reconstruct(parent, node);
        break;
      }
      closed.add(node);
      for (const [neighbor, weight] of graph.get(node) ?? []) {
        const tentativeG = g.get(node)! + weight;
        if (tentativeG < (g.get(neighbor) ?? Infinity)) {
          g.set(neighbor, tentativeG);
          parent.set(neighbor, node);
          if (!closed.has(neighbor)) {
            open.push([tentativeG + epsilon * heuristic(neighbor), neighbor]);
          }
        }
      }
    }

    if (epsilon <= 1.0) break;
    epsilon = Math.max(1.0, epsilon - epsStep);
  }

  return bestPath;
}
```
