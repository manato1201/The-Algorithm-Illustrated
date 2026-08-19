---
name: 重心分解(Centroid Decomposition)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(n log n)(分解全体)、O(log n)(1頂点あたりの分解の深さ)
summary: 木を「重心」で再帰的に分割していく分割統治テクニックで、木上の経路に関するクエリ(2頂点間の距離を使った条件付き経路数え上げなど)をO(n log n)で処理できるようにする。
---

## 概要

木の上で「距離がちょうどk以下であるような頂点の組は何組あるか」のような、**経路(パス)に関するクエリ**を素朴に全頂点対で調べるとO(n²)かかってしまう。重心分解は、木を「重心(centroid)」——取り除くとできる各連結成分のサイズがどれも元の木の半分以下になる頂点——で分割し、その重心を通る経路だけをまず処理してから、残った各連結成分に対して同じ手続きを再帰的に繰り返す分割統治のテクニックである。木の任意の2頂点間の経路は、この再帰分割のどこかの段階で必ず一度は「その時点の重心」を通る形で処理されるため、全ての経路をもれなく数え上げつつ、木のサイズが再帰のたびに半分以下になることから全体の計算量をO(n log n)に抑えられる。木を経路の集合として扱う問題に対する強力な汎用フレームワークであり、[平方分割](/algorithms/sqrt-decomposition)や[Moのアルゴリズム](/algorithms/mo-algorithm)がクエリや配列を分割するのに対し、重心分解は木構造そのものを再帰的に分割する点が特徴的である。

## 仕組み

1. **重心を求める**: 木(または部分木)の重心とは、その頂点を取り除いてできる各連結成分のサイズが、元の木のサイズの半分(`n/2`)以下になる頂点のこと。各頂点の部分木サイズをDFSで計算し、「最大の子部分木サイズ」と「残り(親側)のサイズ」の両方が`n/2`以下になる頂点を探すことで求められる(木には必ず1つか2つの重心が存在する)
2. **重心を「分解木」の頂点として記録**し、その重心を経由する経路について必要な処理(距離の集計など)を行う。典型的には、重心から各連結成分へ向かうDFSで「重心からの距離」を全頂点について求め、それらを使って条件を満たす経路の組を数える(重心をまたぐ経路の片方の端点を固定し、もう片方の端点の集合から条件を満たすものを数える、といった処理)
3. **重心を木から取り除いて**できる各連結成分に対して、1〜2を再帰的に繰り返す。取り除かれた重心は「分解木」で親となり、各連結成分の重心がその子となる(この親子関係が作る新しい木を「重心木(centroid tree)」と呼ぶ)
4. 再帰は、連結成分のサイズが1になるまで続ける。**重心を取り除くたびに連結成分のサイズが半分以下になる**ため、任意の頂点が重心として選ばれる(=分解木で処理される)回数はO(log n)回に抑えられる

**「全ての経路が必ずどこかの段階で処理される」ことの直感**: 任意の2頂点`u, v`を結ぶ経路を考えると、再帰分割を繰り返すうちに`u`と`v`が同じ連結成分に属さなくなる瞬間が必ず訪れる。その直前の連結成分において選ばれた重心は、`u`から`v`への経路上のどこかに位置する頂点であり(重心を取り除くと`u`と`v`が別の成分に分かれるということは、経路が重心を通っていたことを意味する)、その段階で`u`-`v`間の経路は「重心をまたぐ経路」として数え上げの対象になる。

## 特性・トレードオフ

- **計算量**: 重心分解自体の構築はO(n log n)。各再帰段階でのDFSがO(サイズ)、分解の深さがO(log n)であることから、経路クエリの処理にかかる追加コストの合計もO(n log n)〜O(n log²n)程度に収まることが多い
- **重心木(centroid tree)の応用範囲**: 分解の過程でできる親子関係(重心木)は、元の木とは別の新しい木構造として、動的な経路クエリ(頂点の追加・削除、最も近い「マークされた頂点」を求めるクエリなど)に使われる。重心木上の深さはO(log n)なので、更新のたびに祖先をたどる処理もO(log n)で済む
- **[小から大へのマージ](/algorithms/small-to-large-merging)との違い**: どちらも木の分割統治で計算量をO(n log n)に抑える点は共通するが、小から大へのマージは「部分木のデータ構造をマージするコスト」を抑える技法であるのに対し、重心分解は「経路(パス)に関するクエリ」を重心をまたぐ経路として分解して処理する技法である。問題によっては両者を組み合わせて使うこともある
- **実装の複雑さ**: 重心の求め方、連結成分ごとの再帰、重心をまたぐ経路の二重カウント回避(同じ連結成分内の経路を誤って2回数えないための包除原理的な工夫)など、実装上の注意点が多く、[平方分割](/algorithms/sqrt-decomposition)などと比べると難度は高め
- **使いどころ**: 木上の距離がk以下の頂点対の個数を数える問題、木上の動的な最近傍マーク頂点クエリ、木の直径や重心そのものを利用した分割統治問題、競技プログラミングにおける「木 + 経路クエリ」の定番アプローチ

## 実装例

木上で「距離がちょうど`k`以下であるような頂点の組が何組あるか」を重心分解で数え上げる例。

```python
from typing import List


def count_pairs_within_distance(n: int, edges: List[tuple], k: int) -> int:
    adj: List[List[int]] = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)

    removed = [False] * n
    subtree_size = [0] * n
    total_pairs = 0

    def compute_size(u: int, parent: int) -> int:
        subtree_size[u] = 1
        for v in adj[u]:
            if v != parent and not removed[v]:
                subtree_size[u] += compute_size(v, u)
        return subtree_size[u]

    def find_centroid(u: int, parent: int, tree_size: int) -> int:
        for v in adj[u]:
            if v != parent and not removed[v] and subtree_size[v] > tree_size // 2:
                subtree_size[u] = tree_size - subtree_size[v]
                return find_centroid(v, u, tree_size)
        return u

    def collect_distances(u: int, parent: int, dist: int, out: List[int]) -> None:
        if dist > k:
            return
        out.append(dist)
        for v in adj[u]:
            if v != parent and not removed[v]:
                collect_distances(v, u, dist + 1, out)

    def count_within(distances: List[int]) -> int:
        """distancesの中から、和がk以下になる組の個数(自分同士の重複含む)"""
        distances.sort()
        left, right = 0, len(distances) - 1
        cnt = 0
        while left <= right:
            if distances[left] + distances[right] <= k:
                cnt += right - left
                left += 1
            else:
                right -= 1
        return cnt

    def decompose(u: int) -> None:
        nonlocal total_pairs
        tree_size = compute_size(u, -1)
        centroid = find_centroid(u, -1, tree_size)
        removed[centroid] = True

        # 重心自身を含む全頂点への距離を求め、まとめて数える(重心をまたぐ経路 + 重心発の経路)
        all_dist: List[int] = [0]
        for v in adj[centroid]:
            if not removed[v]:
                collect_distances(v, centroid, 1, all_dist)
        total_pairs += count_within(all_dist)

        # 同じ子部分木内の経路(重心を経由しない)を二重カウントしているので差し引く
        for v in adj[centroid]:
            if not removed[v]:
                sub_dist: List[int] = [0]
                collect_distances(v, centroid, 1, sub_dist)
                total_pairs -= count_within(sub_dist)

        for v in adj[centroid]:
            if not removed[v]:
                decompose(v)

    decompose(0)
    return total_pairs
```

```typescript
function countPairsWithinDistance(
  n: number,
  edges: [number, number][],
  k: number,
): number {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    adj[v].push(u);
  }

  const removed = new Array<boolean>(n).fill(false);
  const subtreeSize = new Array<number>(n).fill(0);
  let totalPairs = 0;

  function computeSize(u: number, parent: number): number {
    subtreeSize[u] = 1;
    for (const v of adj[u]) {
      if (v !== parent && !removed[v]) subtreeSize[u] += computeSize(v, u);
    }
    return subtreeSize[u];
  }

  function findCentroid(u: number, parent: number, treeSize: number): number {
    for (const v of adj[u]) {
      if (v !== parent && !removed[v] && subtreeSize[v] > treeSize / 2) {
        subtreeSize[u] = treeSize - subtreeSize[v];
        return findCentroid(v, u, treeSize);
      }
    }
    return u;
  }

  function collectDistances(
    u: number,
    parent: number,
    dist: number,
    out: number[],
  ): void {
    if (dist > k) return;
    out.push(dist);
    for (const v of adj[u]) {
      if (v !== parent && !removed[v]) collectDistances(v, u, dist + 1, out);
    }
  }

  function countWithin(distances: number[]): number {
    distances.sort((a, b) => a - b);
    let left = 0;
    let right = distances.length - 1;
    let cnt = 0;
    while (left <= right) {
      if (distances[left] + distances[right] <= k) {
        cnt += right - left;
        left++;
      } else {
        right--;
      }
    }
    return cnt;
  }

  function decompose(u: number): void {
    const treeSize = computeSize(u, -1);
    const centroid = findCentroid(u, -1, treeSize);
    removed[centroid] = true;

    const allDist: number[] = [0];
    for (const v of adj[centroid]) {
      if (!removed[v]) collectDistances(v, centroid, 1, allDist);
    }
    totalPairs += countWithin(allDist);

    for (const v of adj[centroid]) {
      if (!removed[v]) {
        const subDist: number[] = [0];
        collectDistances(v, centroid, 1, subDist);
        totalPairs -= countWithin(subDist);
      }
    }

    for (const v of adj[centroid]) {
      if (!removed[v]) decompose(v);
    }
  }

  decompose(0);
  return totalPairs;
}
```
