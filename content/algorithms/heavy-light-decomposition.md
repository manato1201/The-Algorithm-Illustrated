---
name: 重軽分解(HLD)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: 前処理 O(n)、パスクエリ O(log² n)(区間データ構造が O(log n) の場合)
summary: 木を「重い辺」でつないだパス(鎖)に分け、木上の2点間のパスを O(log n) 本の鎖の区間に分解する。木のパスへのクエリを、配列の区間クエリに帰着させる。
---

## 概要

「木の2頂点 `u`, `v` を結ぶパス上の頂点の値の合計(最大値)を答えよ。ときどき、ある頂点の値を書き換える」という問題を考える。パスをたどって調べれば、1回のクエリに O(n) かかり、木が一直線に近いと遅い。配列なら、[セグメント木](/algorithms/segment-tree)や[Fenwick木](/algorithms/fenwick-tree)で区間の合計・最大を O(log n) で答えられるが、木は配列ではない。

重軽分解(Heavy-Light Decomposition)は、**木を、パスを少数の区間の連結で表せる形に並べ替える**ことで、この問題を配列の区間クエリに帰着させる。考え方は、Sleator と Tarjan の動的木の研究(1983年)に由来する。各頂点から、**部分木が最も大きい子への辺を「重い辺」**、それ以外の子への辺を「軽い辺」と呼ぶ。重い辺だけをつなぐと、木が複数の鎖(パス)に分かれる。軽い辺をたどるたびに、部分木の大きさが少なくとも半分になるので、根から任意の頂点までに通る軽い辺は O(log n) 本しかない。

## 仕組み

1. **部分木の大きさの計算**: 根から深さ優先で、各頂点の部分木の大きさ `size[v]` を求め、サイズが最大の子を `heavy[v]` とする
2. **鎖への分解と番号付け**: もう一度、深さ優先で、各頂点に配列上の位置 `pos[v]` を割り当てる。このとき、**重い子を先に**たどる。すると、同じ鎖の頂点は、配列上で連続した区間に並ぶ。鎖の先頭(いちばん根に近い頂点)を `head[v]` に記録する
3. **パスクエリ(`u` から `v`)**:
   - `head[u]` と `head[v]` が異なる間は、`head` の深さが深いほうの頂点(`u` とする)について、`pos[head[u]]` から `pos[u]` までの区間を、区間データ構造に問い合わせて結果に加え、`u` を `head[u]` の親に移す(鎖を1本分登る)
   - 同じ鎖に入ったら、`u` と `v` の浅いほうから深いほうまでの区間を問い合わせて終わり
4. **点の更新**: `pos[v]` の位置を、区間データ構造で更新する

最小共通祖先(LCA)も、同じ処理(2つの頂点の鎖を登って合流させる)の副産物として求まる。

## 特性・トレードオフ

- **計算量**: 登る鎖の数が O(log n)、各鎖の区間クエリが O(log n) なので、パスクエリは O(log² n)。更新は O(log n)
- **区間データ構造と組み合わせる**: 合計、最大・最小、最大公約数、遅延評価つきの区間加算など、セグメント木が扱える演算ならなんでも使える
- **頂点の値と辺の値**: 辺に値があるときは、各辺を下側の頂点に対応させて頂点の値として扱い、最後の鎖内の問い合わせで、LCA自身を含めないようにする(細部の処理が間違えやすい)
- **木が大きいときの再帰**: 深さ優先を再帰で書くと、一直線に近い木で再帰が深くなりすぎる。明示的なスタックで書くか、親から子の順序(BFS順)を使って部分木のサイズを計算する
- **同じ目的の他手法**: Euler tour と区間データ構造で、部分木クエリは O(log n)。パスクエリでは、[セントロイド分解](/algorithms/centroid-decomposition)や Link-Cut 木がある。HLD は、実装が比較的素直で、定数が小さいので、競技プログラミングで広く使われる
- **使いどころ**: 木のパスへの区間加算・合計・最大の問い合わせ、2頂点間の最小共通祖先、木上の最大値クエリ

## 実装例

```python
class HLD:
    def __init__(self, n, edges, root=0):
        self.adj = [[] for _ in range(n)]
        for a, b in edges:
            self.adj[a].append(b)
            self.adj[b].append(a)
        self.parent = [-1] * n
        self.depth = [0] * n
        self.size = [1] * n
        self.heavy = [-1] * n
        self.head = [0] * n
        self.pos = [0] * n
        order = []
        stack = [root]
        seen = [False] * n
        seen[root] = True
        while stack:                       # 親が先に来る順序(深さ優先、明示的なスタック)
            v = stack.pop()
            order.append(v)
            for w in self.adj[v]:
                if not seen[w]:
                    seen[w] = True
                    self.parent[w] = v
                    self.depth[w] = self.depth[v] + 1
                    stack.append(w)
        for v in reversed(order):          # 部分木の大きさと、重い子
            p = self.parent[v]
            if p >= 0:
                self.size[p] += self.size[v]
        for v in order:
            best = -1
            for w in self.adj[v]:
                if w != self.parent[v] and (best < 0 or self.size[w] > self.size[best]):
                    best = w
            self.heavy[v] = best
        cur = 0
        stack = [root]                      # 重い子を先にたどって、鎖を連続した位置にする
        self.head[root] = root
        while stack:
            h = stack.pop()
            v = h
            while v != -1:                  # 鎖 h → heavy → heavy → ...
                self.head[v] = h
                self.pos[v] = cur
                cur += 1
                for w in self.adj[v]:
                    if w != self.parent[v] and w != self.heavy[v]:
                        stack.append(w)      # 軽い子は新しい鎖の先頭
                v = self.heavy[v]

    def path_ranges(self, u, v):
        """u-v パスを、配列上の区間 [l, r](両端を含む)のリストに分解する。"""
        ranges = []
        while self.head[u] != self.head[v]:
            if self.depth[self.head[u]] < self.depth[self.head[v]]:
                u, v = v, u
            ranges.append((self.pos[self.head[u]], self.pos[u]))
            u = self.parent[self.head[u]]
        a, b = sorted((self.pos[u], self.pos[v]))
        ranges.append((a, b))
        return ranges


#        0
#       / \
#      1   2
#     / \   \
#    3   4   5
#   /         \
#  6           7
hld = HLD(8, [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5), (3, 6), (5, 7)])
values = [5, 3, 8, 1, 4, 2, 7, 6]            # 頂点 i の値
array = [0] * 8
for v in range(8):
    array[hld.pos[v]] = values[v]
ranges = hld.path_ranges(6, 7)                # 頂点 6 から 7 へのパス(6-3-1-0-2-5-7)
print(ranges, sum(sum(array[l:r + 1]) for l, r in ranges))  # パス上の値の合計: 7+1+3+5+8+2+6 = 32
```

```typescript
class HLD {
  parent: number[];
  depth: number[];
  size: number[];
  heavy: number[];
  head: number[];
  pos: number[];
  private adj: number[][];

  constructor(n: number, edges: [number, number][], root = 0) {
    this.adj = Array.from({ length: n }, () => []);
    for (const [a, b] of edges) {
      this.adj[a].push(b);
      this.adj[b].push(a);
    }
    this.parent = new Array(n).fill(-1);
    this.depth = new Array(n).fill(0);
    this.size = new Array(n).fill(1);
    this.heavy = new Array(n).fill(-1);
    this.head = new Array(n).fill(0);
    this.pos = new Array(n).fill(0);
    const order: number[] = [];
    const seen = new Array<boolean>(n).fill(false);
    const stack = [root];
    seen[root] = true;
    while (stack.length > 0) {
      const v = stack.pop()!;
      order.push(v);
      for (const w of this.adj[v]) {
        if (!seen[w]) {
          seen[w] = true;
          this.parent[w] = v;
          this.depth[w] = this.depth[v] + 1;
          stack.push(w);
        }
      }
    }
    for (const v of [...order].reverse()) if (this.parent[v] >= 0) this.size[this.parent[v]] += this.size[v];
    for (const v of order) {
      let best = -1;
      for (const w of this.adj[v]) {
        if (w !== this.parent[v] && (best < 0 || this.size[w] > this.size[best])) best = w;
      }
      this.heavy[v] = best;
    }
    let cur = 0;
    const heads = [root];
    while (heads.length > 0) {
      const h = heads.pop()!;
      for (let v = h; v !== -1; v = this.heavy[v]) {
        this.head[v] = h;
        this.pos[v] = cur++;
        for (const w of this.adj[v]) if (w !== this.parent[v] && w !== this.heavy[v]) heads.push(w);
      }
    }
  }

  pathRanges(u: number, v: number): [number, number][] {
    const ranges: [number, number][] = [];
    while (this.head[u] !== this.head[v]) {
      if (this.depth[this.head[u]] < this.depth[this.head[v]]) [u, v] = [v, u];
      ranges.push([this.pos[this.head[u]], this.pos[u]]);
      u = this.parent[this.head[u]];
    }
    ranges.push([Math.min(this.pos[u], this.pos[v]), Math.max(this.pos[u], this.pos[v])]);
    return ranges;
  }
}

const hld = new HLD(8, [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [3, 6], [5, 7]]);
const values = [5, 3, 8, 1, 4, 2, 7, 6];
const array = new Array<number>(8).fill(0);
values.forEach((x, v) => (array[hld.pos[v]] = x));
const ranges = hld.pathRanges(6, 7);
const total = ranges.reduce((s, [l, r]) => s + array.slice(l, r + 1).reduce((a, b) => a + b, 0), 0);
console.log(ranges, total); // パス 6-3-1-0-2-5-7 の合計: 32
```
