---
name: フリンジサーチ(Fringe Search)
category: 探索
subcategory: グラフ・経路探索
complexity: O(E)
summary: 優先度付きキューの代わりに単純な双方向連結リストの反復深化的走査でA*相当の経路を求める、メモリ効率と実装の単純さを重視した探索アルゴリズム。
---

## 概要

[A*探索](/algorithms/a-star)は優先度付きキュー(通常は二分ヒープ)を使って`f = g + h`最小のノードを取り出し続けるが、この優先度付きキューの挿入・削除操作(O(log n))自体がボトルネックになる場面がある。特にゲームのリアルタイム経路探索のように、大量のキャラクターが毎フレーム経路を再計算するような用途では、ヒープ操作のオーバーヘッドや動的メモリ確保の頻発がフレームレートを圧迫しかねない。フリンジサーチ(Fringe Search)は、優先度付きキューを一切使わず、単純な双方向連結リスト(または配列)上の反復操作だけで[A*探索](/algorithms/a-star)とほぼ同じ探索順序・同じ最適性を実現するアルゴリズムである。名前の「fringe(縁)」は、探索の最前線にあるノード群を指しており、[反復深化探索(IDDFS)](/algorithms/iddfs)がDFSの深さ制限を徐々に広げていくのと同じ発想で、今回は「許容するf値の上限」を徐々に広げながらリストを繰り返し走査する。

## 仕組み

1. `f`の上限しきい値`flimit`をスタートノードのヒューリスティック値`h(start)`で初期化する。fringeと呼ぶリスト(単純な双方向連結リスト)にスタートノードだけを入れる
2. fringeの先頭から順にノードを走査する。各ノードについて`f = g + h`を計算し、`f > flimit`ならそのノードは今回のパスではスキップしてリストの後方に残す(削除しない)。次のしきい値候補として、スキップされた中での最小`f`値を記録しておく
3. `f <= flimit`のノードはゴールかどうかを判定し、ゴールでなければ展開して隣接ノードをそのノードの直後にfringeへ挿入し、自分自身はfringeから取り除く
4. fringe全体を1周し終えたら、記録しておいた「スキップされた中での最小`f`値」を新しい`flimit`として、再びfringeの先頭から2〜3を繰り返す
5. ゴールが見つかるか、fringeが空になる(=経路が存在しない)まで1〜4を続ける

各ノードの探索順序はfringeというリスト内の位置で自然に管理され、優先度付きキューのような「挿入のたびに正しい位置を探す」処理が不要になる。しきい値`flimit`を段階的に広げていく点は反復深化探索の考え方そのものであり、フリンジサーチは「[A*探索](/algorithms/a-star)の最適性」と「反復深化のシンプルなデータ構造」を組み合わせたアルゴリズムだと捉えられる。

## 特性・トレードオフ

- **計算量**: 最終的に訪れるノード数のオーダーは[A*探索](/algorithms/a-star)と同程度でO(E)だが、しきい値を複数回にわたって広げるため、実測では同じノードを複数回スキャンするオーバーヘッドが発生する。それでも各走査自体はO(1)の単純なリスト操作の連続であるため、ヒープ操作の定数倍コストを避けられる分、実装によってはA*より高速になることが報告されている
- **優先度付きキューが不要**: fringeは単純な連結リストで十分であり、ノードの挿入・削除がO(1)で行える。組み込み環境やメモリ確保を避けたいゲームエンジンのようにヒープアロケーションのコストがシビアな場面で有利
- **最適性**: ヒューリスティックがadmissible(過大評価しない)であれば[A*探索](/algorithms/a-star)と同様に最短経路を保証する
- **実装の単純さとキャッシュ効率**: 優先度付きキューの複雑なバランス操作がなく、連結リストの走査は局所性が高いため、キャッシュに乗りやすい実装にしやすいとされる
- **使いどころ**: 大量のエージェントが毎フレーム経路探索を行うゲームのAI、ヒープ操作のコストや動的メモリ確保を避けたい組み込み・リアルタイム系のパスファインディング。グラフが小規模で探索回数が少ないなら実装が単純な[A*探索](/algorithms/a-star)で十分なことも多い

## 実装例

```python
from typing import Callable, Dict, List, Optional, Tuple


def fringe_search(
    graph: Dict[str, List[Tuple[str, float]]],
    start: str,
    goal: str,
    heuristic: Callable[[str], float],
) -> Optional[List[str]]:
    g: Dict[str, float] = {start: 0.0}
    came_from: Dict[str, str] = {}
    fringe: List[str] = [start]  # 単純なリストで代用(本来は双方向連結リスト)
    in_fringe = {start}
    f_limit = heuristic(start)

    while fringe:
        next_limit = float("inf")
        i = 0
        while i < len(fringe):
            node = fringe[i]
            f = g[node] + heuristic(node)

            if f > f_limit:
                # しきい値を超えたので今回はスキップし、次回のしきい値候補を更新
                next_limit = min(next_limit, f)
                i += 1
                continue

            if node == goal:
                path = [node]
                while node in came_from:
                    node = came_from[node]
                    path.append(node)
                return path[::-1]

            # このノードを展開し、fringeから取り除いて隣接ノードに置き換える
            fringe.pop(i)
            in_fringe.discard(node)
            inserted = 0
            for neighbor, cost in graph.get(node, []):
                tentative_g = g[node] + cost
                if tentative_g < g.get(neighbor, float("inf")):
                    g[neighbor] = tentative_g
                    came_from[neighbor] = node
                    if neighbor not in in_fringe:
                        fringe.insert(i + inserted, neighbor)
                        in_fringe.add(neighbor)
                        inserted += 1
            i += inserted

        if next_limit == float("inf"):
            return None  # fringeが尽きても解なし
        f_limit = next_limit

    return None
```

```typescript
function fringeSearch(
  graph: Map<string, [string, number][]>,
  start: string,
  goal: string,
  heuristic: (node: string) => number,
): string[] | null {
  const g = new Map<string, number>([[start, 0]]);
  const cameFrom = new Map<string, string>();
  let fringe: string[] = [start]; // 単純な配列で代用(本来は双方向連結リスト)
  const inFringe = new Set([start]);
  let fLimit = heuristic(start);

  while (fringe.length > 0) {
    let nextLimit = Infinity;
    let i = 0;

    while (i < fringe.length) {
      const node = fringe[i];
      const f = (g.get(node) ?? Infinity) + heuristic(node);

      if (f > fLimit) {
        // しきい値を超えたので今回はスキップし、次回のしきい値候補を更新
        nextLimit = Math.min(nextLimit, f);
        i++;
        continue;
      }

      if (node === goal) {
        const path = [node];
        let cur = node;
        while (cameFrom.has(cur)) {
          cur = cameFrom.get(cur)!;
          path.push(cur);
        }
        return path.reverse();
      }

      // このノードを展開し、fringeから取り除いて隣接ノードに置き換える
      fringe.splice(i, 1);
      inFringe.delete(node);
      let inserted = 0;
      for (const [neighbor, cost] of graph.get(node) ?? []) {
        const tentativeG = (g.get(node) ?? Infinity) + cost;
        if (tentativeG < (g.get(neighbor) ?? Infinity)) {
          g.set(neighbor, tentativeG);
          cameFrom.set(neighbor, node);
          if (!inFringe.has(neighbor)) {
            fringe.splice(i + inserted, 0, neighbor);
            inFringe.add(neighbor);
            inserted++;
          }
        }
      }
      i += inserted;
    }

    if (nextLimit === Infinity) return null; // fringeが尽きても解なし
    fLimit = nextLimit;
  }

  return null;
}
```
