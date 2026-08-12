---
name: 最大節約法(Maximum Parsimony)による系統樹探索
category: バイオインフォマティクス
subcategory: 系統樹・クラスタリング
complexity: O((2n-5)!! × n・k)(全探索の場合、nは配列数、実務は分枝限定法・局所探索で削減)
summary: Fitchアルゴリズムで各候補系統樹の必要変化回数を評価できることを土台に、あり得る木の形の中から節約スコアが最小になる木を探索し、「最も少ない進化的変化で説明できる系統樹」を求める。
---

## 概要

[Fitchアルゴリズム](/algorithms/fitch-algorithm)は「系統樹の形が1つ与えられたとき、その木の上での最小変化回数(節約スコア)」をO(n・k)で厳密に計算できるが、最大節約法はさらに一歩進んで**「あり得る全ての木の形の中から、節約スコアが最小になる木はどれか」**を探索する問題を扱う。`n`個の配列に対してあり得る根なし2分木の形の総数は`(2n-5)!!`という超指数関数的な数になるため、配列数が数十を超えると全ての木を試すことは非現実的になる。実務では、[分枝限定法](/algorithms/branch-and-bound)による厳密探索(小規模な場合)や、木を少しずつ変形させながらより良い木を探す局所探索(NNI: Nearest Neighbor Interchange、SPR: Subtree Pruning and Regraftingなどの木変形操作を使う)が、[Fitchアルゴリズム](/algorithms/fitch-algorithm)を評価関数として使いながら適用される。

## 仕組み

1. 初期の系統樹(ランダムな木、または[近隣結合法](/algorithms/neighbor-joining)のような距離ベース手法で素早く得た木)を用意する
2. 現在の木の節約スコアを、[Fitchアルゴリズム](/algorithms/fitch-algorithm)を使って計算する
3. **木の局所的な変形**を試す。代表的な操作に、隣接する2つの枝を入れ替える**NNI(Nearest Neighbor Interchange)**、部分木を切り離して別の枝に接ぎ木する**SPR(Subtree Pruning and Regrafting)** がある
4. 変形後の木について、再び[Fitchアルゴリズム](/algorithms/fitch-algorithm)で節約スコアを計算する。スコアが改善していれば(変化回数がより少なければ)、その変形を採用して木を更新する
5. 改善が見られなくなるまで(局所最適に達するまで)3〜4を繰り返す。複数の初期木から独立に探索を行い、得られた複数の局所最適解のうち最も良いものを最終的な答えとする、というランダム再始動の戦略もよく併用される
6. 小規模な問題(配列数が十分少ない場合)では、[分枝限定法](/algorithms/branch-and-bound)を使い、部分的に構築した木の節約スコアの下界を使って枝刈りしながら、厳密な最節約木を保証付きで探索することもできる

## 特性・トレードオフ

- **木の探索空間の爆発的な広さ**: あり得る系統樹の形の数は配列数に対して超指数関数的に増加するため(10配列で200万通り以上、20配列では天文学的な数になる)、厳密な全探索は現実的な配列数ではほぼ不可能であり、局所探索やヒューリスティックな手法への依存が避けられない
- **[Fitchアルゴリズム](/algorithms/fitch-algorithm)を評価関数として使う探索の一般的な型**: 「候補解の評価は高速な部分アルゴリズムで行い、候補解自体の探索は局所探索・分枝限定法などのメタなアルゴリズムで行う」という2層構造は、多くの組合せ最適化問題に共通するパターンであり、最大節約法はその生物学的な応用例として理解できる
- **最節約法という原理自体への批判**: 「変化回数が最も少ない木が真の系統樹である」という最節約法の前提は、進化速度が系統によって大きく異なる場合(長枝誘引、Long Branch Attraction)に誤った木を選んでしまう既知の弱点を持つ。この弱点を統計的に扱う最尤法のような確率モデルベースの手法が、より精緻な代替として使われることも多い
- **使いどころ**: 分子系統学における系統樹推定(PAUP*、TNTなどの専用ソフトウェアで実装)、言語学・文献学における系統関係の推定、[ブートストラップ法](/algorithms/bootstrap-phylogeny)による探索結果の信頼度評価との組み合わせ

## 実装例

NNI(隣接枝の入れ替え)による局所探索の骨格を示す。

```python
import random

def nni_swap(tree_edges: list[tuple[int, int]], edge_index: int) -> list[tuple[int, int]]:
    """簡略化した表現: 隣接する2つの部分木を入れ替える1回のNNI操作を模したプレースホルダ実装。"""
    new_edges = list(tree_edges)
    i, j = edge_index, (edge_index + 1) % len(new_edges)
    new_edges[i], new_edges[j] = new_edges[j], new_edges[i]
    return new_edges

def local_search_max_parsimony(
    initial_edges: list[tuple[int, int]],
    score_fn: "Callable[[list[tuple[int, int]]], int]",  # 内部でFitchアルゴリズムを呼び出す想定
    max_iterations: int = 1000,
) -> tuple[list[tuple[int, int]], int]:
    current_edges = initial_edges
    current_score = score_fn(current_edges)

    for _ in range(max_iterations):
        improved = False
        for edge_index in range(len(current_edges)):
            candidate = nni_swap(current_edges, edge_index)
            candidate_score = score_fn(candidate)
            if candidate_score < current_score:
                current_edges, current_score = candidate, candidate_score
                improved = True
                break
        if not improved:
            break

    return current_edges, current_score
```

```typescript
type Edge = [number, number];

function nniSwap(treeEdges: Edge[], edgeIndex: number): Edge[] {
  const newEdges = [...treeEdges];
  const i = edgeIndex;
  const j = (edgeIndex + 1) % newEdges.length;
  [newEdges[i], newEdges[j]] = [newEdges[j], newEdges[i]];
  return newEdges;
}

function localSearchMaxParsimony(
  initialEdges: Edge[], scoreFn: (edges: Edge[]) => number, maxIterations = 1000,
): { edges: Edge[]; score: number } {
  let currentEdges = initialEdges;
  let currentScore = scoreFn(currentEdges);

  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;
    for (let edgeIndex = 0; edgeIndex < currentEdges.length; edgeIndex++) {
      const candidate = nniSwap(currentEdges, edgeIndex);
      const candidateScore = scoreFn(candidate);
      if (candidateScore < currentScore) {
        currentEdges = candidate;
        currentScore = candidateScore;
        improved = true;
        break;
      }
    }
    if (!improved) break;
  }

  return { edges: currentEdges, score: currentScore };
}
```

```cpp
#include <vector>
#include <utility>
#include <functional>

using Edge = std::pair<int, int>;

std::vector<Edge> nniSwap(const std::vector<Edge>& treeEdges, int edgeIndex) {
    std::vector<Edge> newEdges = treeEdges;
    int i = edgeIndex, j = (edgeIndex + 1) % static_cast<int>(newEdges.size());
    std::swap(newEdges[i], newEdges[j]);
    return newEdges;
}

std::pair<std::vector<Edge>, int> localSearchMaxParsimony(
    std::vector<Edge> initialEdges, std::function<int(const std::vector<Edge>&)> scoreFn, int maxIterations = 1000) {
    auto currentEdges = initialEdges;
    int currentScore = scoreFn(currentEdges);

    for (int iter = 0; iter < maxIterations; iter++) {
        bool improved = false;
        for (size_t edgeIndex = 0; edgeIndex < currentEdges.size(); edgeIndex++) {
            auto candidate = nniSwap(currentEdges, static_cast<int>(edgeIndex));
            int candidateScore = scoreFn(candidate);
            if (candidateScore < currentScore) {
                currentEdges = candidate;
                currentScore = candidateScore;
                improved = true;
                break;
            }
        }
        if (!improved) break;
    }

    return {currentEdges, currentScore};
}
```

```rust
type Edge = (i32, i32);

fn nni_swap(tree_edges: &[Edge], edge_index: usize) -> Vec<Edge> {
    let mut new_edges = tree_edges.to_vec();
    let i = edge_index;
    let j = (edge_index + 1) % new_edges.len();
    new_edges.swap(i, j);
    new_edges
}

fn local_search_max_parsimony(
    initial_edges: Vec<Edge>, score_fn: impl Fn(&[Edge]) -> i32, max_iterations: usize,
) -> (Vec<Edge>, i32) {
    let mut current_edges = initial_edges;
    let mut current_score = score_fn(&current_edges);

    for _ in 0..max_iterations {
        let mut improved = false;
        for edge_index in 0..current_edges.len() {
            let candidate = nni_swap(&current_edges, edge_index);
            let candidate_score = score_fn(&candidate);
            if candidate_score < current_score {
                current_edges = candidate;
                current_score = candidate_score;
                improved = true;
                break;
            }
        }
        if !improved {
            break;
        }
    }

    (current_edges, current_score)
}
```

```csharp
static (int, int)[] NniSwap((int, int)[] treeEdges, int edgeIndex)
{
    var newEdges = (( int, int)[])treeEdges.Clone();
    int i = edgeIndex, j = (edgeIndex + 1) % newEdges.Length;
    (newEdges[i], newEdges[j]) = (newEdges[j], newEdges[i]);
    return newEdges;
}

static ((int, int)[] Edges, int Score) LocalSearchMaxParsimony(
    (int, int)[] initialEdges, Func<(int, int)[], int> scoreFn, int maxIterations = 1000)
{
    var currentEdges = initialEdges;
    int currentScore = scoreFn(currentEdges);

    for (int iter = 0; iter < maxIterations; iter++)
    {
        bool improved = false;
        for (int edgeIndex = 0; edgeIndex < currentEdges.Length; edgeIndex++)
        {
            var candidate = NniSwap(currentEdges, edgeIndex);
            int candidateScore = scoreFn(candidate);
            if (candidateScore < currentScore)
            {
                currentEdges = candidate;
                currentScore = candidateScore;
                improved = true;
                break;
            }
        }
        if (!improved) break;
    }

    return (currentEdges, currentScore);
}
```
