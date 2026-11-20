---
name: ブロン・ケルボッシュ法(極大クリーク列挙)
category: グラフ
subcategory: 連結性・順序
complexity: O(3^(n/3))(最悪。ピボット選択付きの場合)
summary: 無向グラフの極大クリーク(どの頂点も足せない完全部分グラフ)を、候補集合を絞りながら再帰で列挙する。
---

## 概要

クリークとは、どの2頂点の間にも辺がある頂点の集まりのこと。SNSで「全員が互いに友達」の集団を探す、化合物の構造の比較、遺伝子の共発現ネットワークの密な部分を探すなど、「密に結びついた集団」を見つける場面で使われる。最大のクリークを探す問題はNP困難だが、**極大クリーク(これ以上頂点を足せないクリーク)をすべて列挙する**ことは、素朴な全探索よりずっと賢く行える。

ブロン・ケルボッシュ法(Bron と Kerbosch、1973年)は、いま作っているクリーク `R`、まだ加えられる候補 `P`、すでに処理済みで加えると重複になる `X` の3つの集合を持ちながら再帰する。現在でも極大クリーク列挙の標準的な出発点である。

## 仕組み

`BronKerbosch(R, P, X)`:

1. `P` と `X` がともに空なら、`R` は極大クリーク。出力して戻る(`P` が空でも `X` に残りがあれば、`R` に加えられる頂点が過去に存在するので極大ではない)
2. `P` の各頂点 `v` について
   - `R ∪ {v}`、`P ∩ N(v)`、`X ∩ N(v)` で再帰する(`N(v)` は `v` の隣接頂点)
   - 戻ったら `v` を `P` から取り除いて `X` に加える(`v` を含むクリークはすべて調べ終えたので)
3. 改良版(ピボット法): `P ∪ X` から頂点 `u`(通常は `P` に隣接する頂点数が最大のもの)を選び、**`P` のうち `u` の隣接頂点でないものだけ**を2の対象にする。`u` に隣接する頂点は、どのみち `u` を含む極大クリークの中で見つかるので省ける

## 特性・トレードオフ

- **出力が最大で指数的**: n 頂点の極大クリークは最大で 3^(n/3) 個ありうる(Moon–Moser の結果)。ピボット法(Tomita らの選び方)はこの出力数に見合った最悪計算量を達成する
- **ピボットなしでは遅い**: 同じ極大クリークの途中経路を重複して辿る。実用ではピボットが必須
- **スパースなグラフに強い**: 現実のネットワークは次数が偏って疎なので、頂点を縮退数順(degeneracy order)に並べて外側のループだけ変えると、実用上ずっと速くなる
- **使いどころ**: 共同作業ネットワークや化合物グラフの密な塊の抽出、シンボリック実行の整合性チェック、ほかのクリーク系の問題(最大クリーク、グラフ彩色の下界)の部品

## 実装例

```python
def bron_kerbosch(adj):
    """adj: {頂点: 隣接頂点の集合}。極大クリークのリストを返す。"""
    result = []

    def expand(r, p, x):
        if not p and not x:
            result.append(sorted(r))
            return
        pivot = max(p | x, key=lambda u: len(p & adj[u]))
        for v in list(p - adj[pivot]):
            expand(r | {v}, p & adj[v], x & adj[v])
            p.remove(v)
            x.add(v)

    expand(set(), set(adj), set())
    return result


graph = {0: {1, 2}, 1: {0, 2, 3}, 2: {0, 1}, 3: {1, 4}, 4: {3}}
print(sorted(bron_kerbosch(graph)))  # [[0, 1, 2], [1, 3], [3, 4]]
```

```typescript
function bronKerbosch(adj: Map<number, Set<number>>): number[][] {
  const result: number[][] = [];
  const inter = (a: Set<number>, b: Set<number>) => new Set([...a].filter((v) => b.has(v)));
  const expand = (r: Set<number>, p: Set<number>, x: Set<number>): void => {
    if (p.size === 0 && x.size === 0) {
      result.push([...r].sort((a, b) => a - b));
      return;
    }
    const union = [...p, ...x];
    const pivot = union.reduce((best, u) =>
      inter(p, adj.get(u)!).size > inter(p, adj.get(best)!).size ? u : best,
    );
    for (const v of [...p].filter((w) => !adj.get(pivot)!.has(w))) {
      expand(new Set([...r, v]), inter(p, adj.get(v)!), inter(x, adj.get(v)!));
      p.delete(v);
      x.add(v);
    }
  };
  expand(new Set(), new Set(adj.keys()), new Set());
  return result;
}

const g = new Map<number, Set<number>>([
  [0, new Set([1, 2])],
  [1, new Set([0, 2, 3])],
  [2, new Set([0, 1])],
  [3, new Set([1, 4])],
  [4, new Set([3])],
]);
console.log(bronKerbosch(g)); // [[0,1,2],[1,3],[3,4]](順序は実装による)
```
