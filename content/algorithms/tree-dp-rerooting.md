---
name: 全方位木DP(Rerooting Technique)
category: 動的計画法
subcategory: 区間分割DP
complexity: O(n)
summary: 部分木の情報を1回のDFSで使い回すことで、全ての頂点を根としたときの答えをまとめてO(n)で求める木DPの高速化テクニック。
---

## 概要

木構造の問題では「各頂点vを根としたとき、木全体の答えはいくつか」を**全ての頂点について**求めたい場面がよくある(例: 各頂点から最も遠い頂点までの距離、各頂点を始点とした部分木の総和など)。素朴に考えると、頂点ごとに根を付け替えてO(n)の木DPを1回ずつ行うことになり、頂点数nに対して合計O(n²)かかってしまう。**全方位木DP(Rerooting Technique、日本の競技プログラミング界隈での通称)**は、最初に適当な頂点を根として1回だけDFSで部分木の情報を集め、その情報を「根を移動させながら」使い回すことで、**全頂点分の答えをまとめてO(n)で**求める高速化テクニックである。

## 仕組み

全方位木DPは大きく2段階のDFSからなる。

**第1段階(部分木からの集約、通常のDFS)**:

1. 適当な頂点(例えば頂点0)を仮の根とし、木を通常の有向木として扱う
2. 各頂点vについて、vを根とする部分木から得られる情報`dp_down[v]`を、子の情報を集約して求める(通常のボトムアップ木DP)。集約の仕方は問題依存(合計・最大値・個数など)だが、「複数の子の情報をマージする演算」がモノイド(結合法則を満たし単位元がある)になっている必要がある

**第2段階(親から子への情報の伝播、2回目のDFS)**:

3. 「親を根とした場合の答え」から「子を根とした場合に必要な情報」を計算し、上から下へ伝播させていく。頂点vの親をpとするとき、`dp_up[v]`(vから見て親p側の部分木の情報)は、pの子たちのうちvを除いた全員の`dp_down`の値と`dp_up[p]`(pからさらに親側を見た情報)をマージすることで求める(「vを除いたpから見える全方向の情報」が得られる)
4. 「vを除いた全員をマージする」処理を子1人ずつ愚直に行うとO(子の数²)になってしまうため、**全員の累積マージを左からの累積と右からの累積の2本(prefix/suffix)を事前に計算しておき、「自分だけを除いた全体」をO(1)で取り出せるようにする**のが実装上の要点
5. こうして得た`dp_up[v]`と`dp_down[v]`をマージすれば、「頂点vを根としたときの、木全体からの答え」が求まる。これを全頂点について求めれば、DFS2回(合計O(n))で全頂点分の答えが揃う

素朴なO(n²)解法との違いは、**「頂点ごとに独立にDFSをやり直す」代わりに、「1回のDFSで集めた部分木の情報を、親から子へ受け渡しながら差分だけ更新していく」**という発想にある。この「情報を使い回す」考え方は、木DPに限らず様々なアルゴリズムの高速化に共通する重要なパターンである。

## 特性・トレードオフ

- **計算量**: O(n)。素朴に全頂点を根としてO(n)の木DPをやり直す方法のO(n²)に比べ、大きな木(n=10^5〜10^6)でも現実的な時間で解ける
- **モノイド構造が前提**: 子の情報をマージする演算が結合法則を満たし、単位元を持つ(モノイドである)ことが本質的に重要。「自分を除いた全体」をprefix/suffixの累積で高速に取り出せるのはこの性質のおかげであり、そうでない演算(例えば割り算のように可逆でない・結合的でない演算)には単純には適用できない
- **逆元がある場合のさらなる単純化**: マージ演算に逆元が存在する場合(例えば合計であれば引き算ができる)は、「全体の集約値から自分の寄与を引く」だけで済み、prefix/suffixを持たなくても実装できる。ただし最大値のように逆元を持たない演算では、prefix/suffixによる方法が必要になる
- **使いどころ**: 木の各頂点からの最遠距離(木の直径にも関連)、各頂点を根とした部分木の頂点数や重心、各頂点から到達可能な範囲の集計など、「全方位からの集計値」を求めるあらゆる木上の問題。競技プログラミングでは頻出テクニックの一つ
- **通常の木DPとの関係**: 全方位木DPは通常の(根を1つ固定した)木DPの自然な拡張であり、まず根を1つ固定した木DPが正しく書けることが前提になる。逆に言えば、通常の木DPが書ければ、その集約演算をモノイドとして整理し直すだけで全方位化できることが多い

## 実装例

以下は「木の各頂点について、その頂点から到達可能な最も遠い頂点までの距離(重み付き辺、木の直径に関連する量)」を全頂点分求める例。

```python
def rerooting_farthest_distance(n: int, edges: list[tuple[int, int, int]]) -> list[int]:
    graph: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for u, v, w in edges:
        graph[u].append((v, w))
        graph[v].append((u, w))

    order: list[int] = []
    parent = [-1] * n
    parent_weight = [0] * n
    visited = [False] * n
    stack = [0]
    visited[0] = True
    while stack:
        u = stack.pop()
        order.append(u)
        for v, w in graph[u]:
            if not visited[v]:
                visited[v] = True
                parent[v] = u
                parent_weight[v] = w
                stack.append(v)

    # dp_down[v]: vを根とする部分木の中で、vから最も遠い点までの距離
    dp_down = [0] * n
    for u in reversed(order):
        for v, w in graph[u]:
            if v != parent[u]:
                dp_down[u] = max(dp_down[u], dp_down[v] + w)

    # dp_up[v]: vの親側(vを除いた残り)を見たときの最遠距離
    dp_up = [0] * n
    answer = [0] * n
    for u in order:
        children = [(v, w) for v, w in graph[u] if v != parent[u]]
        m = len(children)
        prefix = [0] * (m + 1)
        suffix = [0] * (m + 1)
        for i, (v, w) in enumerate(children):
            prefix[i + 1] = max(prefix[i], dp_down[v] + w)
        for i in range(m - 1, -1, -1):
            v, w = children[i]
            suffix[i] = max(suffix[i + 1], dp_down[v] + w)

        answer[u] = max(dp_up[u], prefix[m])

        for i, (v, w) in enumerate(children):
            without_v = max(prefix[i], suffix[i + 1], dp_up[u])
            dp_up[v] = without_v + w

    return answer
```

```typescript
function rerootingFarthestDistance(
  n: number,
  edges: [number, number, number][],
): number[] {
  const graph: [number, number][][] = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) {
    graph[u].push([v, w]);
    graph[v].push([u, w]);
  }

  const order: number[] = [];
  const parent = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);
  const stack = [0];
  visited[0] = true;
  while (stack.length) {
    const u = stack.pop()!;
    order.push(u);
    for (const [v] of graph[u]) {
      if (!visited[v]) {
        visited[v] = true;
        parent[v] = u;
        stack.push(v);
      }
    }
  }

  const dpDown = new Array(n).fill(0);
  for (let i = order.length - 1; i >= 0; i--) {
    const u = order[i];
    for (const [v, w] of graph[u]) {
      if (v !== parent[u]) dpDown[u] = Math.max(dpDown[u], dpDown[v] + w);
    }
  }

  const dpUp = new Array(n).fill(0);
  const answer = new Array(n).fill(0);
  for (const u of order) {
    const children = graph[u].filter(([v]) => v !== parent[u]);
    const m = children.length;
    const prefix = new Array(m + 1).fill(0);
    const suffix = new Array(m + 1).fill(0);
    for (let i = 0; i < m; i++) {
      const [v, w] = children[i];
      prefix[i + 1] = Math.max(prefix[i], dpDown[v] + w);
    }
    for (let i = m - 1; i >= 0; i--) {
      const [v, w] = children[i];
      suffix[i] = Math.max(suffix[i + 1], dpDown[v] + w);
    }

    answer[u] = Math.max(dpUp[u], prefix[m]);

    for (let i = 0; i < m; i++) {
      const [v, w] = children[i];
      const withoutV = Math.max(prefix[i], suffix[i + 1], dpUp[u]);
      dpUp[v] = withoutV + w;
    }
  }

  return answer;
}
```
