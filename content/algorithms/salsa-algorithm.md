---
name: SALSA(Stochastic Approach for Link-Structure Analysis)
category: 情報検索・ランキング
subcategory: グラフベースランキング
complexity: O(V + E)(反復1回あたり)
summary: HITSのhub-authority構造をランダムウォークの確率過程として再定式化し、リンクスパムへの耐性を高めたランキング手法。
---

## 概要

2000年にLemphelとMoranが提案した、HITSアルゴリズムの弱点を補うランキング手法。HITSは「hubスコアとauthorityスコアが相互に強化しあう」という反復計算だったが、少数の密結合したページ群(いわゆる「タイトなクリーク」)によってスコアが不当に支配されてしまう脆弱性があった。SALSAは、この相互強化の構造を**二部グラフ上のランダムウォーク**として再定式化することで、HITSよりもリンクスパムに対して頑健なランキングを実現する。

## 仕組み

1. 検索結果周辺のページ集合から、hub側のノード集合とauthority側のノード集合からなる**二部グラフ**を構築する(あるページがリンク元ならhub側、リンク先ならauthority側のノードとして扱われる)
2. authorityスコアは、「authority側のノードから出発し、そこにリンクしているhubへ1歩戻り、そのhubが持つ別のリンク先へ1歩進む」という2ステップのランダムウォークが、そのノードに訪れる定常確率として定義される
3. 同様にhubスコアも、hub側から出発する2ステップのランダムウォークの定常確率として定義される
4. この定常分布は、二部グラフの隣接構造から直接(反復計算なしで)閉じた式で計算できることが示されており、次数(リンク数)に基づく比較的単純な正規化計算に帰着する
5. HITSと異なり、少数の密結合したノード群に定常確率が集中しにくい構造になっているため、リンクファームのような操作に対して相対的に頑健である

## 特性・トレードオフ

- **計算量**: 二部グラフの構築とランダムウォークの定常分布計算はO(V + E)程度(閉じた式で近似計算できるため、HITSのような反復収束を待つ必要が少ない)
- **HITSとの違い**: HITSは相互強化の反復計算でスコアが決まるため、密結合したクリークにスコアが集中しやすい。SALSAはランダムウォークの定常分布という確率的な枠組みに基づくため、そうした集中が起きにくく、より均等な評価になる
- **PageRankとの関係**: SALSAのauthorityスコアは、特定の条件下でPageRankと数学的に類似した振る舞いをすることが知られており、両者はランダムウォークベースのランキングという共通の系譜に位置づけられる
- **使いどころ**: 検索結果の関連ページ群からのトピック特化型ランキング、リンクスパムへの耐性が求められるWebグラフ分析、HITSの改良版としての学術的なリンク解析研究

## 実装例

```python
def salsa(adj: dict[int, list[int]], n: int) -> tuple[dict[int, float], dict[int, float]]:
    """二部グラフ上のランダムウォークの定常分布を直接計算する簡易版SALSA。"""
    # authority側の入次数(そのノードを指すリンクの数)
    in_degree = {v: 0 for v in range(n)}
    out_degree = {v: len(adj.get(v, [])) for v in range(n)}
    for u in range(n):
        for v in adj.get(u, []):
            in_degree[v] += 1

    total_edges = sum(out_degree.values()) or 1

    # authorityスコア: そのノードへの入次数に比例(高次数のauthorityほど高スコア)
    authority = {v: in_degree[v] / total_edges for v in range(n)}
    # hubスコア: そのノードの出次数に比例(多くリンクしているhubほど高スコア)
    hub = {v: out_degree[v] / total_edges for v in range(n)}

    return hub, authority
```

```typescript
function salsa(
  adj: Map<number, number[]>,
  n: number,
): { hub: Map<number, number>; authority: Map<number, number> } {
  const inDegree = new Map<number, number>();
  const outDegree = new Map<number, number>();
  for (let v = 0; v < n; v++) {
    inDegree.set(v, 0);
    outDegree.set(v, (adj.get(v) ?? []).length);
  }
  for (let u = 0; u < n; u++) {
    for (const v of adj.get(u) ?? []) {
      inDegree.set(v, inDegree.get(v)! + 1);
    }
  }

  let totalEdges = 0;
  for (const d of outDegree.values()) totalEdges += d;
  totalEdges = totalEdges || 1;

  const authority = new Map<number, number>();
  const hub = new Map<number, number>();
  for (let v = 0; v < n; v++) {
    // authorityスコア: そのノードへの入次数に比例(高次数のauthorityほど高スコア)
    authority.set(v, inDegree.get(v)! / totalEdges);
    // hubスコア: そのノードの出次数に比例(多くリンクしているhubほど高スコア)
    hub.set(v, outDegree.get(v)! / totalEdges);
  }

  return { hub, authority };
}
```
