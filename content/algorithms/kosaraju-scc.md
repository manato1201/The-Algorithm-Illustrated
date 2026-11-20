---
name: コサラジュ法(強連結成分分解)
category: グラフ
subcategory: 連結性・順序
complexity: O(V + E)
summary: 元のグラフと辺を逆向きにしたグラフでDFSを2回行うだけで、強連結成分を求める。仕組みが直感的で実装しやすい。
---

## 概要

有向グラフで「AからBへも、BからAへも行ける」頂点どうしをまとめたものが強連結成分(SCC)である。SCCを1つの頂点に縮めると必ず閉路のない有向グラフ(DAG)になるので、依存関係の解析やタスクの循環検出、2-SATの解法の前処理として欠かせない。

[タルジャンの方法](/algorithms/tarjan-scc)は低リンク値を管理して1回のDFSで求めるが、その仕組みは少し分かりにくい。コサラジュ法(Kosaraju、1970年代後半に考案され、Sharirも独立に発表したとされる)は「**逆向きのグラフでは、SCCの中身は同じまま、SCC間の矢印の向きだけが反転する**」という観察を使い、DFSを2回回すだけで済ませる。

## 仕組み

1. 元のグラフ `G` に対して深さ優先探索を行い、**頂点を探索が終わった順(帰りがけ順)**に記録する。未訪問の頂点があれば、そこから改めてDFSを始める
2. すべての辺の向きを反転した転置グラフ `Gᵀ` を用意する
3. 記録した順序を**逆から**(最後に終わった頂点から)取り出す。その頂点がまだ未訪問なら、`Gᵀ` 上でDFSを行い、到達できた頂点をすべて1つのSCCとして確定する
4. 順序を最後まで取り出すと、すべてのSCCが見つかる

なぜ動くか: 1回目で最後に終わる頂点は、縮約したDAGで「始点側」のSCCに属する。転置すると矢印が逆になるので、そのSCCからは自分のSCCの外へ出られず、DFSがSCCの中だけを塗りつぶす。塗りつぶしたあとは、その次に終了時刻が遅いSCCが同じ状況になる。

## 特性・トレードオフ

- **計算量**: DFSが2回で O(V + E)。転置グラフを作る分のメモリが追加で要る
- **発見順がトポロジカル順**: SCCは縮約DAGのトポロジカル順(上流から下流)で得られる。後続の処理(DPやソート)にそのまま使える
- **実装の見通しがよい**: 手順がそのまま証明の筋道になっているため、教育や競技プログラミングの初見実装で選びやすい。再帰が深くなる場合は、明示的なスタックで書く必要がある
- **タルジャン法との使い分け**: 1回のDFSで済み転置も要らないタルジャン法の方が定数が小さい。コサラジュ法は転置グラフを持てる(あるいは持ちたい)場合に簡潔

## 実装例

```python
def kosaraju_scc(n, edges):
    graph = [[] for _ in range(n)]
    rgraph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        rgraph[v].append(u)

    seen = [False] * n
    order = []

    def dfs1(u):
        seen[u] = True
        for v in graph[u]:
            if not seen[v]:
                dfs1(v)
        order.append(u)            # 帰りがけ順に記録

    for u in range(n):
        if not seen[u]:
            dfs1(u)

    comp = [-1] * n

    def dfs2(u, c):
        comp[u] = c
        for v in rgraph[u]:
            if comp[v] == -1:
                dfs2(v, c)

    c = 0
    for u in reversed(order):      # 終了が遅い頂点から
        if comp[u] == -1:
            dfs2(u, c)
            c += 1
    return comp


# 0->1->2->0 の閉路、2->3、3<->4
print(kosaraju_scc(5, [(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 3)]))  # [0, 0, 0, 1, 1]
```

```typescript
function kosarajuScc(n: number, edges: [number, number][]): number[] {
  const g: number[][] = Array.from({ length: n }, () => []);
  const rg: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    g[u].push(v);
    rg[v].push(u);
  }
  const seen = new Array<boolean>(n).fill(false);
  const order: number[] = [];
  const dfs1 = (u: number): void => {
    seen[u] = true;
    for (const v of g[u]) if (!seen[v]) dfs1(v);
    order.push(u);
  };
  for (let u = 0; u < n; u++) if (!seen[u]) dfs1(u);

  const comp = new Array<number>(n).fill(-1);
  const dfs2 = (u: number, c: number): void => {
    comp[u] = c;
    for (const v of rg[u]) if (comp[v] === -1) dfs2(v, c);
  };
  let c = 0;
  for (let i = n - 1; i >= 0; i--) {
    if (comp[order[i]] === -1) dfs2(order[i], c++);
  }
  return comp;
}

console.log(
  kosarajuScc(5, [
    [0, 1],
    [1, 2],
    [2, 0],
    [2, 3],
    [3, 4],
    [4, 3],
  ]),
); // [0, 0, 0, 1, 1]
```
