---
name: タンパク質スレッディング法(フォールド認識)
category: バイオインフォマティクス
subcategory: 構造予測
complexity: O(n・m)(nは対象配列長、mは鋳型構造の残基数、単純なアラインメントベースの場合)
summary: 立体構造が未知のアミノ酸配列を、既知の立体構造(鋳型)の骨格に沿って「着せ替え」しながら、アミノ酸の環境適合性スコアで最も自然に収まる鋳型を選ぶことで、新規の折り畳みを予測しなくても構造を推定する。
---

## 概要

[Zukerアルゴリズム](/algorithms/zuker-algorithm)がRNAの塩基対形成を熱力学的なエネルギーで評価するのに対し、タンパク質の立体構造予測では、アミノ酸配列がどう折り畳まれるかを一から計算するのは非常に難しい問題である。しかし自然界に存在するタンパク質の立体構造(フォールド)の種類は、配列の多様性に比べて実は限られている(異なる配列でも似た形に折り畳まれることが多い)という経験的な知見がある。スレッディング法(フォールド認識とも呼ばれる)は、この知見を利用し、**構造が未知の対象配列を、既に立体構造が解明されている「鋳型(テンプレート)」の骨格に沿って仮想的に配置(スレッド、糸を通すように)し**、そのアミノ酸配列がその立体構造の環境(埋没しているか露出しているか、周囲にどんな残基があるかなど)に照らしてどれだけ自然に収まるかをスコア化することで、最も適合する鋳型構造を選び出す。

## 仕組み

1. 立体構造データベース(PDBなど)から、候補となる複数の鋳型構造を用意する。各鋳型は、骨格の3次元座標と、各位置(残基)がどのような構造的環境(埋没度、二次構造の種類など)にあるかの情報を持つ
2. 対象のアミノ酸配列を、各鋳型の骨格に沿って**アラインメント**する。これは[Needleman-Wunschアルゴリズム](/algorithms/needleman-wunsch)のような配列アラインメントに似ているが、単純なアミノ酸の一致・不一致ではなく、**「このアミノ酸をこの構造的環境に置いたときの適合度」を表す環境依存スコア(タッチポテンシャル)** を使う点が異なる
3. 環境適合性スコアは、統計的に「疎水性のアミノ酸はタンパク質の内部(埋没した環境)に来やすい」「小さいアミノ酸は密に詰まった環境に来やすい」といった経験則を、既知の構造データベースから学習した統計ポテンシャルとして表現する
4. 動的計画法(または、残基間の相互作用まで考慮する場合はより複雑な最適化)を使い、対象配列と鋳型構造の間で、環境適合性スコアの合計が最大になるアラインメントを求める
5. 複数の鋳型候補についてこの手順を繰り返し、**最もスコアの高い鋳型**を、対象配列が取りうる立体構造として採用する。採用した鋳型の骨格座標に、対象配列のアミノ酸側鎖を当てはめることで、具体的な立体構造モデルが得られる

## 特性・トレードオフ

- **配列類似性が低くても構造を予測できる**: 単純な配列アラインメント(相同性モデリング)は、対象配列と鋳型配列の間にある程度の配列類似性があることを前提とするが、スレッディング法は配列がほとんど似ていなくても、構造的な適合性さえあれば正しい鋳型を選び出せる可能性がある。これは「配列は大きく異なっても立体構造は似ている」という進化的に離れたタンパク質の関係を捉えるのに有効である
- **環境適合性スコアの精度に依存する**: スレッディング法の予測精度は、統計ポテンシャル(どのアミノ酸がどんな環境に来やすいかの統計モデル)の質に大きく依存する。このモデルが実際の物理化学を十分に反映していないと、誤った鋳型を選んでしまうことがある
- **新規フォールドには対応できない限界**: スレッディング法は既知の立体構造データベースの中から鋳型を選ぶという性質上、データベースに類似の折り畳みパターンが存在しない全く新規なフォールドを持つタンパク質には原理的に対応できない。この限界を超えるアプローチとして、深層学習ベースの構造予測手法(AlphaFoldなど)が近年大きな成果を上げている
- **使いどころ**: 構造ゲノミクスにおける機能未知タンパク質の立体構造予測、創薬標的タンパク質の構造モデリング、タンパク質の進化的関係の推定、[コンタクトマップ予測](/algorithms/contact-map-prediction)と組み合わせた統合的な構造予測パイプライン

## 実装例

簡略化した1次元的な環境適合性スコア(疎水性アミノ酸が「埋没環境」に来るほど高スコア)によるスレッディングのアラインメントスコア計算を示す。

```python
HYDROPHOBIC = set("AVLIMFWY")

def environment_score(amino_acid: str, is_buried: bool) -> float:
    if is_buried:
        return 2.0 if amino_acid in HYDROPHOBIC else -1.0
    else:
        return -1.0 if amino_acid in HYDROPHOBIC else 1.0

def thread_sequence_onto_template(sequence: str, buried_profile: list[bool]) -> tuple[float, list[float]]:
    """buried_profile[i] = Trueなら鋳型のi番目の位置は埋没環境。単純な1対1アラインメントを仮定する。"""
    scores = [environment_score(aa, buried) for aa, buried in zip(sequence, buried_profile)]
    return sum(scores), scores

def best_template_match(sequence: str, templates: dict[str, list[bool]]) -> tuple[str, float]:
    best_name, best_score = "", float("-inf")
    for name, profile in templates.items():
        if len(profile) != len(sequence):
            continue
        total, _ = thread_sequence_onto_template(sequence, profile)
        if total > best_score:
            best_score, best_name = total, name
    return best_name, best_score
```

```typescript
const HYDROPHOBIC = new Set("AVLIMFWY".split(""));

function environmentScore(aminoAcid: string, isBuried: boolean): number {
  if (isBuried) return HYDROPHOBIC.has(aminoAcid) ? 2.0 : -1.0;
  return HYDROPHOBIC.has(aminoAcid) ? -1.0 : 1.0;
}

function threadSequenceOntoTemplate(sequence: string, buriedProfile: boolean[]): { total: number; scores: number[] } {
  const scores = sequence.split("").map((aa, i) => environmentScore(aa, buriedProfile[i]));
  return { total: scores.reduce((a, b) => a + b, 0), scores };
}

function bestTemplateMatch(sequence: string, templates: Map<string, boolean[]>): { name: string; score: number } {
  let bestName = "";
  let bestScore = -Infinity;
  for (const [name, profile] of templates) {
    if (profile.length !== sequence.length) continue;
    const { total } = threadSequenceOntoTemplate(sequence, profile);
    if (total > bestScore) {
      bestScore = total;
      bestName = name;
    }
  }
  return { name: bestName, score: bestScore };
}
```

```cpp
#include <string>
#include <vector>
#include <map>
#include <set>
#include <limits>

double environmentScore(char aminoAcid, bool isBuried) {
    static const std::set<char> hydrophobic = {'A', 'V', 'L', 'I', 'M', 'F', 'W', 'Y'};
    bool isHydrophobic = hydrophobic.count(aminoAcid) > 0;
    if (isBuried) return isHydrophobic ? 2.0 : -1.0;
    return isHydrophobic ? -1.0 : 1.0;
}

double threadSequenceOntoTemplate(const std::string& sequence, const std::vector<bool>& buriedProfile) {
    double total = 0.0;
    for (size_t i = 0; i < sequence.size(); i++) total += environmentScore(sequence[i], buriedProfile[i]);
    return total;
}

std::pair<std::string, double> bestTemplateMatch(const std::string& sequence, const std::map<std::string, std::vector<bool>>& templates) {
    std::string bestName;
    double bestScore = -std::numeric_limits<double>::infinity();
    for (auto& [name, profile] : templates) {
        if (profile.size() != sequence.size()) continue;
        double total = threadSequenceOntoTemplate(sequence, profile);
        if (total > bestScore) { bestScore = total; bestName = name; }
    }
    return {bestName, bestScore};
}
```

```rust
use std::collections::HashMap;

fn is_hydrophobic(amino_acid: char) -> bool {
    "AVLIMFWY".contains(amino_acid)
}

fn environment_score(amino_acid: char, is_buried: bool) -> f64 {
    if is_buried {
        if is_hydrophobic(amino_acid) { 2.0 } else { -1.0 }
    } else if is_hydrophobic(amino_acid) {
        -1.0
    } else {
        1.0
    }
}

fn thread_sequence_onto_template(sequence: &str, buried_profile: &[bool]) -> f64 {
    sequence.chars().zip(buried_profile.iter()).map(|(aa, &buried)| environment_score(aa, buried)).sum()
}

fn best_template_match(sequence: &str, templates: &HashMap<String, Vec<bool>>) -> (String, f64) {
    let mut best_name = String::new();
    let mut best_score = f64::NEG_INFINITY;
    for (name, profile) in templates {
        if profile.len() != sequence.chars().count() {
            continue;
        }
        let total = thread_sequence_onto_template(sequence, profile);
        if total > best_score {
            best_score = total;
            best_name = name.clone();
        }
    }
    (best_name, best_score)
}
```

```csharp
static bool IsHydrophobic(char aminoAcid) => "AVLIMFWY".Contains(aminoAcid);

static double EnvironmentScore(char aminoAcid, bool isBuried)
{
    if (isBuried) return IsHydrophobic(aminoAcid) ? 2.0 : -1.0;
    return IsHydrophobic(aminoAcid) ? -1.0 : 1.0;
}

static double ThreadSequenceOntoTemplate(string sequence, List<bool> buriedProfile)
{
    double total = 0;
    for (int i = 0; i < sequence.Length; i++) total += EnvironmentScore(sequence[i], buriedProfile[i]);
    return total;
}

static (string Name, double Score) BestTemplateMatch(string sequence, Dictionary<string, List<bool>> templates)
{
    string bestName = "";
    double bestScore = double.NegativeInfinity;
    foreach (var (name, profile) in templates)
    {
        if (profile.Count != sequence.Length) continue;
        double total = ThreadSequenceOntoTemplate(sequence, profile);
        if (total > bestScore) { bestScore = total; bestName = name; }
    }
    return (bestName, bestScore);
}
```
