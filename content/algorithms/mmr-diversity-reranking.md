---
name: MMR(Maximal Marginal Relevance)による多様性考慮型再ランキング
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(k・n)(結果k件を選ぶ場合、nは候補文書数)
summary: 関連度の高さだけでなく、既に選ばれた結果との類似度の低さ(多様性)も考慮しながら検索結果を貪欲に再ランキングする手法。
---

## 概要

[BM25](/algorithms/bm25)や[ベクトル空間モデル](/algorithms/vector-space-model)のような通常の検索ランキングは、クエリとの関連度が高い順に文書を並べるが、これだけでは**検索結果の上位が似たような内容の文書ばかりで占められてしまう**という問題が起きやすい——「同じニュースを異なる媒体が報じた記事」が上位10件を独占し、ユーザーが本当に知りたかった多様な観点の情報にたどり着けない、といった状況である。MMR(Maximal Marginal Relevance、最大限界関連性)は、1998年にJaime CarbonellとJade Goldsteinが提案した再ランキング手法で、この問題に対して「関連度」と「新規性(既に選んだ結果との違い)」という2つの基準を同時に最適化するという発想で応える。文書を1件ずつ**貪欲に**選んでいき、各ステップで「クエリとの関連度が高く、かつ、既に選ばれた結果群とはできるだけ似ていない」文書を選ぶことで、関連性を保ちながら結果全体の多様性を高める。

## 仕組み

1. 候補文書集合`R`(通常は[BM25](/algorithms/bm25)や[ベクトル空間モデル](/algorithms/vector-space-model)などの第一段階検索で絞り込んだ上位n件)と、選択済み結果集合`S`(初期状態は空)を用意する
2. 各候補文書`d_i`について、以下のMMRスコアを計算する:
   `MMR(d_i) = λ・Sim1(d_i, q) - (1-λ)・max_{d_j∈S} Sim2(d_i, d_j)`
   - `Sim1(d_i, q)`: クエリ`q`と文書`d_i`の関連度([BM25](/algorithms/bm25)スコアや埋め込みのコサイン類似度など)
   - `max_{d_j∈S} Sim2(d_i, d_j)`: 文書`d_i`と、**既に選ばれた結果集合`S`の中で最も似ている文書との類似度**(この値が高いほど、その文書は既存の結果と重複した内容である可能性が高い)
   - `λ`(0〜1): 関連度と多様性のどちらを重視するかを制御するパラメータ。`λ=1`なら通常の関連度順ランキングと一致し、`λ=0`なら関連度を無視して純粋に多様性だけを最大化する
3. `R\S`(まだ選ばれていない候補)の中からMMRスコアが最大の文書を選び、`S`に追加する
4. 望む結果件数`k`に達するまで、2〜3を繰り返す。1回選ぶたびに`S`が更新されるため、後続のステップでは常に最新の選択結果を基準に多様性が評価される
5. 最終的な`S`の並び(選ばれた順)が、関連性と多様性のバランスを取った再ランキング結果になる

## 特性・トレードオフ

- **計算量**: 結果を`k`件選ぶまでに、各ステップで残り候補(最大`n`件)全てとMMRスコアを計算するため、素朴な実装でO(k・n)。候補数`n`が数百〜数千件程度の第一段階検索後の再ランキングに使うことを前提とした計算量であり、コーパス全体には直接適用しない
- **貪欲法であることの限界**: MMRは各ステップで局所的に最良の文書を選ぶ貪欲法であり、結果集合全体としての最適な多様性の組み合わせ(大域的最適解)を保証するわけではない。しかし計算コストの低さと実装のシンプルさから、実務では十分な近似として広く使われている
- **`λ`の選び方が結果を大きく左右する**: `λ`が1に近いほど[BM25](/algorithms/bm25)などの通常のランキングに近づき、0に近いほど関連度を無視した多様性優先の結果になる。ニュース記事の見出し一覧やレコメンドのように「似たような結果の連続」を避けたい用途では`λ`をやや低めに設定することが多い
- **[クロスエンコーダによる再ランキング](/algorithms/cross-encoder-reranking)との併用**: MMRは「多様性」という軸で再ランキングするのに対し、[クロスエンコーダ](/algorithms/cross-encoder-reranking)は「関連度の精度」という別の軸で再ランキングする——両者は排他的ではなく、クロスエンコーダで精密にスコアリングした後、そのスコアを`Sim1`としてMMRにかける、という多段の構成も可能である
- **使いどころ**: 検索結果・レコメンドにおける重複コンテンツの抑制、ニュース記事の要約・トピック多様化、検索拡張生成(RAG)で言語モデルに渡すコンテキストを選ぶ際の冗長性削減(同じ情報を繰り返し渡さないようにする)、要約タスクにおける代表文選択

## 実装例

```python
def mmr_rerank(
    query_similarities: dict[int, float],
    doc_similarities: dict[tuple[int, int], float],
    k: int,
    lambda_param: float = 0.5,
) -> list[int]:
    """
    query_similarities: 文書ID -> クエリとの関連度
    doc_similarities: (文書IDペア) -> 文書間の類似度
    """
    remaining = set(query_similarities.keys())
    selected: list[int] = []

    def similarity(a: int, b: int) -> float:
        if a == b:
            return 1.0
        return doc_similarities.get((a, b), doc_similarities.get((b, a), 0.0))

    while remaining and len(selected) < k:
        best_doc = None
        best_score = float("-inf")

        for doc_id in remaining:
            relevance = query_similarities[doc_id]
            if selected:
                max_sim_to_selected = max(similarity(doc_id, s) for s in selected)
            else:
                max_sim_to_selected = 0.0

            mmr_score = lambda_param * relevance - (1 - lambda_param) * max_sim_to_selected
            if mmr_score > best_score:
                best_score = mmr_score
                best_doc = doc_id

        selected.append(best_doc)
        remaining.remove(best_doc)

    return selected
```

```typescript
function mmrRerank(
  querySimilarities: Map<number, number>,
  docSimilarities: Map<string, number>,
  k: number,
  lambdaParam = 0.5,
): number[] {
  const remaining = new Set(querySimilarities.keys());
  const selected: number[] = [];

  const similarity = (a: number, b: number): number => {
    if (a === b) return 1.0;
    return (
      docSimilarities.get(`${a},${b}`) ??
      docSimilarities.get(`${b},${a}`) ??
      0.0
    );
  };

  while (remaining.size > 0 && selected.length < k) {
    let bestDoc: number | null = null;
    let bestScore = -Infinity;

    for (const docId of remaining) {
      const relevance = querySimilarities.get(docId)!;
      const maxSimToSelected =
        selected.length > 0
          ? Math.max(...selected.map((s) => similarity(docId, s)))
          : 0;

      const mmrScore =
        lambdaParam * relevance - (1 - lambdaParam) * maxSimToSelected;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestDoc = docId;
      }
    }

    selected.push(bestDoc!);
    remaining.delete(bestDoc!);
  }

  return selected;
}
```
