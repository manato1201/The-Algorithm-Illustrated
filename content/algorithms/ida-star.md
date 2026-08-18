---
name: IDA*(反復深化A*探索)
category: 探索
subcategory: グラフ・経路探索
complexity: O(b^d)
summary: A*探索のメモリ消費の大きさを、反復深化探索のように深さ制限の代わりにf値の上限を段階的に広げながらDFSを繰り返すことで解消する、メモリ効率的な最適経路探索アルゴリズム。
---

## 概要

[A*探索](/algorithms/a-star)は優れた探索アルゴリズムだが、優先度付きキューに展開済みの全ノードを保持し続けるため、探索空間が大きい問題ではメモリ使用量が実行時間以上のボトルネックになりやすい。特にパズルの状態空間探索(15パズルなど)のように、分岐数も深さも大きい問題ではA*のメモリ消費が現実的な限界を超えてしまうことがある。IDA*(Iterative Deepening A*)は、この問題を[反復深化探索(IDDFS)](/algorithms/iddfs)と同じ発想で解決する。IDDFSが「深さの上限」を0から1段ずつ広げながらDFSを繰り返すのに対し、IDA*は「`f = g + h`の上限」を段階的に広げながらDFSベースの探索を繰り返す。優先度付きキューを一切使わず、再帰呼び出しのスタックだけで探索を進めるため、メモリ使用量を探索の深さに比例する程度まで抑えられる。

## 仕組み

1. `f`の上限しきい値`flimit`をスタートノードのヒューリスティック値`h(start)`(`g=0`なので`f=h`)で初期化する
2. スタートノードから深さ優先探索(DFS)を行う。各ノードで`f = g + h`を計算し、`f > flimit`ならその先を探索せずに打ち切り、打ち切った中での最小の`f`値を記録して1つ上の呼び出し元に返す
3. `f <= flimit`のノードは展開を続け、ゴールに到達すればそこで探索終了、経路を返す
4. DFSが1周(スタートからの全探索木を打ち切りも含めて走査)完了してもゴールが見つからなければ、記録しておいた「打ち切られた中での最小`f`値」を新しい`flimit`として、再びスタートからDFSをやり直す
5. ゴールが見つかるか、これ以上探索すべきノードがない(=解なし)と判定されるまで1〜4を繰り返す

各反復は通常のDFSと同じくスタックだけで進行するため、A*のようにオープンリストに大量のノードを溜め込む必要がない。しきい値を毎回きっちり「次に超えるべき最小のf値」まで引き上げるため、無駄な反復が最小限に抑えられる点も、深さを1つずつしか増やせないIDDFSより効率が良い理由になっている。

## 特性・トレードオフ

- **計算量**: O(b^d)(b=分岐数、d=最適解の深さ)で、ヒューリスティックが効いていれば実際にはこれよりずっと少ないノード数で収まる。反復のたびに浅い部分を再訪するオーバーヘッドがあるが、[反復深化探索(IDDFS)](/algorithms/iddfs)と同様、深い階層のノード数が支配的なため全体のオーダーは大きくは変わらない
- **空間計算量はO(d)**: [A*探索](/algorithms/a-star)がオープンリストにO(b^d)個のノードを保持しうるのに対し、IDA*は「今たどっている一本の経路」の分だけを保持すればよく、メモリ効率が桁違いに良い
- **最適性の保証**: [A*探索](/algorithms/a-star)と同様、ヒューリスティックがadmissible(過大評価しない)であれば最短経路を保証する
- **重複状態の検出が難しい**: [A*探索](/algorithms/a-star)は訪問済みノード集合を保持して同じ状態への再訪を防げるが、IDA*はスタック(現在の経路)しか保持しないため、経路上にない場所での重複状態(同じ状態に別ルートで到達するケース)を効率的に検出できない。グラフに閉路が多い問題では同じ状態を何度も再計算してしまう弱点がある
- **使いどころ**: 15パズルやルービックキューブのように状態空間が非常に広く、かつ木構造に近い(重複状態が少ない)問題でのメモリ制約下での最適解探索。グラフの閉路が多くメモリに余裕があるなら[A*探索](/algorithms/a-star)の方が効率的なことが多い

## 実装例

```python
from typing import Callable, Dict, List, Optional, Tuple

INF = float("inf")


def ida_star(
    graph: Dict[str, List[Tuple[str, float]]],
    start: str,
    goal: str,
    heuristic: Callable[[str], float],
) -> Optional[List[str]]:
    f_limit = heuristic(start)

    def search(path: List[str], g: float, f_limit: float) -> Tuple[Optional[List[str]], float]:
        node = path[-1]
        f = g + heuristic(node)
        if f > f_limit:
            return None, f  # 打ち切り。今回超えたf値を次のしきい値候補として返す
        if node == goal:
            return path, f

        min_over = INF
        for neighbor, cost in graph.get(node, []):
            if neighbor in path:
                continue  # 経路上の重複だけは避ける
            path.append(neighbor)
            result, next_f = search(path, g + cost, f_limit)
            if result is not None:
                return result, next_f
            min_over = min(min_over, next_f)
            path.pop()

        return None, min_over

    while True:
        path = [start]
        result, next_limit = search(path, 0.0, f_limit)
        if result is not None:
            return result
        if next_limit == INF:
            return None  # これ以上探索すべきノードがない
        f_limit = next_limit
```

```typescript
const INF = Infinity;

function idaStar(
  graph: Map<string, [string, number][]>,
  start: string,
  goal: string,
  heuristic: (node: string) => number,
): string[] | null {
  let fLimit = heuristic(start);

  function search(
    path: string[],
    g: number,
    limit: number,
  ): [string[] | null, number] {
    const node = path[path.length - 1];
    const f = g + heuristic(node);
    if (f > limit) return [null, f]; // 打ち切り。今回超えたf値を次のしきい値候補として返す
    if (node === goal) return [path.slice(), f];

    let minOver = INF;
    for (const [neighbor, cost] of graph.get(node) ?? []) {
      if (path.includes(neighbor)) continue; // 経路上の重複だけは避ける
      path.push(neighbor);
      const [result, nextF] = search(path, g + cost, limit);
      if (result !== null) return [result, nextF];
      minOver = Math.min(minOver, nextF);
      path.pop();
    }

    return [null, minOver];
  }

  for (;;) {
    const [result, nextLimit] = search([start], 0, fLimit);
    if (result !== null) return result;
    if (nextLimit === INF) return null; // これ以上探索すべきノードがない
    fLimit = nextLimit;
  }
}
```
