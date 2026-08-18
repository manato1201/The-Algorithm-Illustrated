---
name: 固有ベクトル中心性(Eigenvector Centrality)
category: 情報検索・ランキング
subcategory: グラフベースランキング
complexity: O(反復回数 × (V+E))(Vは頂点数、Eは辺数、べき乗法による近似計算)
summary: あるノードの重要度を「隣接ノードの重要度の重み付き総和」として再帰的に定義し、隣接行列の主固有ベクトルとして求める、グラフ中心性指標の基礎となる考え方。
---

## 概要

「次数中心性」(そのノードに直接つながっている辺の数)は最も単純なグラフ中心性の指標だが、「多くのノードとつながっている」ことと「重要なノードとつながっている」ことを区別できないという欠点がある——SNSで無名アカウント1000人にフォローされるのと、著名人数人にフォローされるのとでは、後者の方が影響力の指標として重要な場合が多い。固有ベクトル中心性は、この直感を数学的に定式化した指標で、19世紀の社会学的ネットワーク分析にまで遡る考え方である——**あるノードの重要度は、そのノードにつながっている隣接ノードたちの重要度の総和に比例する**、という再帰的な定義を置く。この定義を線形代数の言葉に翻訳すると、「グラフの隣接行列の主固有ベクトル(最大固有値に対応する固有ベクトル)を求める」という問題に帰着し、[PageRank](/algorithms/pagerank)や[Katz中心性](/algorithms/katz-centrality)など、後続の多くのグラフベースランキング手法の理論的な土台になっている。

## 仕組み

1. グラフの隣接行列`A`(`A_ij = 1`なら`i`と`j`の間に辺がある)を用意する
2. 各ノード`i`の中心性スコア`x_i`を、隣接するノードのスコアの総和に比例するものとして定義する。これは以下の固有値方程式として書ける:
   `x = (1/λ)・A・x`(すなわち `A・x = λ・x`)
   ここで`λ`はスカラー(固有値)、`x`はベクトル(固有ベクトル)であり、この式を満たす`x`が中心性スコアのベクトルになる
3. 一般に固有値方程式の解(固有ベクトル)は複数存在するが、**ペロン・フロベニウスの定理**により、「全ての成分が非負」という中心性スコアとして自然な条件を満たす固有ベクトルは、**最大固有値(主固有値)`λ_max`に対応するものに限られる**ことが保証される
4. 実務では、行列の固有値分解を厳密に解く代わりに、**べき乗法(Power Iteration)**で主固有ベクトルを近似的に求める:
   - 初期ベクトル`x_0`(全成分1など)を用意する
   - `x_{k+1} = A・x_k` を計算し、発散を防ぐため`x_{k+1}`をノルムで正規化する(`x_{k+1} ← x_{k+1} / ||x_{k+1}||`)
   - これを繰り返すと`x_k`は主固有ベクトルの方向に収束していく([PageRank](/algorithms/pagerank)の反復計算も本質的にはこのべき乗法の一種である)
5. 収束した`x`の各成分が、対応するノードの固有ベクトル中心性スコアとなる

## 特性・トレードオフ

- **計算量**: べき乗法による近似計算は1回の反復がO(V+E)で、収束までの反復回数をかけたコストになる。厳密な固有値分解(O(V³))と比べてはるかに実用的
- **孤立成分・非連結グラフでの弱点**: グラフが複数の連結成分に分かれている場合、主固有ベクトルは最大固有値を持つ1つの成分にしかスコアを与えず、他の成分のノードは全てスコア0になってしまう。有向グラフで「入ってくる辺が一切ないノード」も同様にスコアが0に潰れやすい
- **[Katz中心性](/algorithms/katz-centrality)による改善**: [Katz中心性](/algorithms/katz-centrality)は固有ベクトル中心性の更新式に定数項`β`を加えることで、入次数0のノードでもスコアが0に潰れない、より扱いやすい指標に拡張している。数式的には固有ベクトル中心性の直接的な一般化にあたる
- **[PageRank](/algorithms/pagerank)による改善**: [PageRank](/algorithms/pagerank)はさらに、各ノードが自分のスコアを「出次数で正規化して」隣接ノードに分配する仕組みと、ランダムジャンプ(ダンピングファクター)を導入することで、行き止まりノードやリンクの循環に起因する数学的な不安定性を解消し、有向グラフのWebリンク解析という実用的な問題に対してより頑健な指標になっている
- **使いどころ**: ソーシャルネットワークにおける影響力の分析(SNSの「重要アカウント」特定)、学術論文の引用ネットワークにおける権威性の評価、[PageRank](/algorithms/pagerank)・[Katz中心性](/algorithms/katz-centrality)・[HITS](/algorithms/hits)など多くのグラフベースランキング手法を理解するための基礎理論

## 実装例

```python
import math


def eigenvector_centrality(
    nodes: list[int],
    edges: dict[int, list[int]],
    iterations: int = 200,
    tol: float = 1e-10,
) -> dict[int, float]:
    n = len(nodes)
    x = {node: 1.0 for node in nodes}

    for _ in range(iterations):
        new_x = {node: 0.0 for node in nodes}
        for node in nodes:
            # ノードnodeの新しいスコアは、隣接ノードの現在のスコアの総和
            for neighbor in edges.get(node, []):
                new_x[node] += x[neighbor]

        # 発散・収束を防ぐためL2ノルムで正規化する
        norm = math.sqrt(sum(v * v for v in new_x.values()))
        if norm == 0:
            break
        new_x = {node: v / norm for node, v in new_x.items()}

        diff = sum(abs(new_x[node] - x[node]) for node in nodes)
        x = new_x
        if diff < tol:
            break

    return x
```

```typescript
function eigenvectorCentrality(
  nodes: number[],
  edges: Map<number, number[]>,
  iterations = 200,
  tol = 1e-10,
): Map<number, number> {
  let x = new Map(nodes.map((n) => [n, 1.0]));

  for (let iter = 0; iter < iterations; iter++) {
    const newX = new Map<number, number>(nodes.map((n) => [n, 0]));
    for (const node of nodes) {
      // ノードnodeの新しいスコアは、隣接ノードの現在のスコアの総和
      for (const neighbor of edges.get(node) ?? []) {
        newX.set(node, newX.get(node)! + (x.get(neighbor) ?? 0));
      }
    }

    // 発散・収束を防ぐためL2ノルムで正規化する
    let norm = 0;
    for (const v of newX.values()) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm === 0) break;
    for (const node of nodes) newX.set(node, newX.get(node)! / norm);

    let diff = 0;
    for (const node of nodes) diff += Math.abs(newX.get(node)! - x.get(node)!);
    x = newX;
    if (diff < tol) break;
  }

  return x;
}
```
