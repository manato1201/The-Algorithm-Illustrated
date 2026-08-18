---
name: 深さ制限探索(Depth-Limited Search)
category: 探索
subcategory: グラフ・経路探索
complexity: O(b^l)
summary: 深さ優先探索(DFS)に探索深さの上限を設けることで無限ループや無駄な深掘りを防ぎ、反復深化探索(IDDFS)が深さを1段ずつ増やしながら繰り返し呼び出す際の基本構成要素となる探索手法。
---

## 概要

DFS(深さ優先探索)は実装が単純でメモリ効率も良いが、探索対象のグラフに閉路が含まれていたり、木の深さが非常に大きい(あるいは無限の)場合には、ゴールに辿り着けないままひたすら深く潜り続けてしまう危険がある。深さ制限探索(Depth-Limited Search, DLS)は、この問題に対して「深さ`l`を超えたらそれ以上は展開せずに引き返す」という制約を1つ加えるだけで対処する。DFSの骨格をそのまま流用しながら、深さ上限という単一のパラメータで探索の暴走を止める、実用上欠かせない安全装置的な手法である。

## 仕組み

1. 現在のノードがゴールであれば探索を終了し、そこまでの経路を返す
2. 現在の深さが上限`l`に達していれば、それ以上子ノードを展開せずに引き返す。このとき「もし子ノードがまだ残っていたら、深さの制約さえなければ探索を続けられたはずだ」という状態を**cutoff(打ち切り)**として区別する
3. 上限に達していなければ、隣接ノードそれぞれに対して深さを1つ増やしてこの手順を再帰的に適用する
4. 全ての子ノードを調べてもゴールが見つからなかった場合、途中でcutoffが1度でも発生していれば全体の結果も「cutoff」、1度も発生していなければ「failure(この深さ以下には解が存在しない)」として親ノードに返す

**cutoffとfailureを区別する**ことがDLSの実用上のポイントである。単に「見つからなかった」という結果だけを返すと、探索を呼び出した側は「たまたま深さ制限に引っかかっただけ」なのか「そもそも解が存在しない」なのかを判別できない。この区別によって、深さ制限を広げて再探索する価値があるかどうかを呼び出し元が正しく判断できるようになる。

## 特性・トレードオフ

- **計算量**: O(b^l)(b=分岐数、l=深さ制限)。時間計算量はDFSと同様に分岐数と深さ制限のべき乗で増加する
- **空間計算量はO(b・l)に抑えられる**: 通常のDFSと同じく、同時に保持する必要があるのは「今たどっている一本の経路」の分だけであり、BFSのように到達可能なノードを全て記憶しておく必要はない
- **深さ制限`l`の選択が本質的な難点**: `l`を小さくしすぎると、本来ゴールまでの経路が`l`より深い場所にある場合に見つけられず不完全になる。`l`を大きくしすぎると、DFSと同じ無駄な深掘りのリスクが復活する。適切な`l`を事前に知っているとは限らない点が最大の弱点であり、これを解消するには次の反復深化探索が必要になる
- **[反復深化探索(IDDFS)](/algorithms/iddfs)の構成要素そのもの**: IDDFSは、この深さ制限探索を`l = 0, 1, 2, ...`と深さを1つずつ増やしながら繰り返し呼び出すことで、「適切な深さ制限を事前に知っている必要がある」というDLS単体の弱点を解消し、完全性(解があれば必ず見つかる)と省メモリ性を両立させる。DLSはIDDFSの内部ルーチンであり、cutoff/failureの区別はIDDFSが「まだ深さを増やして探す価値があるか(cutoff)」「これ以上探しても無駄か(failure)」を判定するためにそのまま使われる
- **使いどころ**: グラフの直径や解の深さの見積もりが事前に分かっている場合の効率的な探索、ゲーム木探索でのミニマックス法における「先読み深さ」の制御、そして何より反復深化探索の内部ルーチンとしての利用

## 実装例

```python
from typing import Dict, List, Optional, Union

CUTOFF = "cutoff"  # 深さ制限のせいで打ち切られたことを表す特別な戻り値


def depth_limited_search(
    graph: Dict[str, List[str]],
    node: str,
    goal: str,
    limit: int,
    path: List[str],
    visited: set,
) -> Union[List[str], str, None]:
    """深さ制限探索本体。戻り値は「経路」「CUTOFF」「None(failure)」のいずれか"""
    if node == goal:
        return path

    if limit == 0:
        # まだ子ノードが残っているならcutoff、行き止まりならfailure扱い
        return CUTOFF if graph.get(node) else None

    cutoff_occurred = False
    for neighbor in graph.get(node, []):
        if neighbor in visited:
            continue
        visited.add(neighbor)
        result = depth_limited_search(graph, neighbor, goal, limit - 1, path + [neighbor], visited)
        visited.remove(neighbor)

        if result == CUTOFF:
            cutoff_occurred = True
        elif result is not None:
            return result

    return CUTOFF if cutoff_occurred else None


def dls(graph: Dict[str, List[str]], start: str, goal: str, limit: int) -> Optional[List[str]]:
    result = depth_limited_search(graph, start, goal, limit, [start], {start})
    return result if result != CUTOFF and result is not None else None
```

```typescript
const CUTOFF = "cutoff" as const; // 深さ制限のせいで打ち切られたことを表す特別な戻り値
type DlsResult = string[] | typeof CUTOFF | null;

function depthLimitedSearch(
  graph: Record<string, string[]>,
  node: string,
  goal: string,
  limit: number,
  path: string[],
  visited: Set<string>,
): DlsResult {
  if (node === goal) return path;

  if (limit === 0) {
    // まだ子ノードが残っているならcutoff、行き止まりならfailure(null)扱い
    return (graph[node]?.length ?? 0) > 0 ? CUTOFF : null;
  }

  let cutoffOccurred = false;
  for (const neighbor of graph[node] ?? []) {
    if (visited.has(neighbor)) continue;
    visited.add(neighbor);
    const result = depthLimitedSearch(
      graph,
      neighbor,
      goal,
      limit - 1,
      [...path, neighbor],
      visited,
    );
    visited.delete(neighbor);

    if (result === CUTOFF) {
      cutoffOccurred = true;
    } else if (result !== null) {
      return result;
    }
  }

  return cutoffOccurred ? CUTOFF : null;
}

function dls(
  graph: Record<string, string[]>,
  start: string,
  goal: string,
  limit: number,
): string[] | null {
  const result = depthLimitedSearch(
    graph,
    start,
    goal,
    limit,
    [start],
    new Set([start]),
  );
  return result === CUTOFF || result === null ? null : result;
}
```
