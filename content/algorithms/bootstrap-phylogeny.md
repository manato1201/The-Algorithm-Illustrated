---
name: ブートストラップ法による系統樹の信頼度評価
category: バイオインフォマティクス
subcategory: 系統樹・クラスタリング
complexity: O(B × 系統樹構築1回分のコスト)(Bはブートストラップ試行回数)
summary: 元の配列アラインメントの列を重複を許して無作為に再抽出した「疑似データ」を何百回も作り、そのたびに系統樹を再構築して、元の木の各分岐がどれだけ頻繁に再現されるかを数えることで、統計的な信頼度を与える。
---

## 概要

[最大節約法](/algorithms/maximum-parsimony)や[近隣結合法](/algorithms/neighbor-joining)によって系統樹が1本得られても、「この木の各分岐(枝分かれ)は、データがどれだけ強く支持しているのか」という信頼度の情報は、木の形そのものからは分からない。ブートストラップ法は、1985年にジョセフ・フェルゼンシュタインが分子系統学に導入した統計的なリサンプリング手法で、元の配列アラインメントの**列(サイト)を重複を許してランダムに再抽出した疑似データセット**を大量に作り、それぞれについて独立に系統樹を構築し直すことで、「元の木で見られた各分岐が、データのランダムな変動に対してどれだけ頑健に再現されるか」を統計的に評価する。統計学における一般的なブートストラップ法(標本から重複ありで再標本化し、統計量の分布を推定する手法)を系統樹の信頼度評価に応用したものである。

## 仕組み

1. 元の配列アラインメント(長さ`L`のサイト×`n`本の配列)から、[最大節約法](/algorithms/maximum-parsimony)や距離ベースの手法で元の系統樹(オリジナルツリー)を構築する
2. **ブートストラップサンプルの生成**: 元のアラインメントの`L`個のサイト(列)から、**重複を許して**`L`回サンプリングし、元と同じ長さの疑似アラインメントを作る(元のサイトの中には複数回選ばれるものもあれば、1回も選ばれないものもある)
3. この疑似アラインメントに対して、オリジナルと同じ手法(最大節約法など)で系統樹を再構築する
4. 2〜3を、十分な回数(典型的には100〜1000回)繰り返し、それぞれのブートストラップ試行から得られた系統樹を集める
5. オリジナルツリーの各分岐(内部の枝がどの配列群を分けているか、というクレード)について、**ブートストラップ試行で得られた木の中で同じ分岐が何回再現されたか**を数え、その割合を「ブートストラップ支持率」としてその分岐に付与する。支持率が高い(例えば70%以上)分岐は、データのランダムな変動に対して頑健であり、信頼性が高いと解釈される

## 特性・トレードオフ

- **系統樹の「形」だけでなく「信頼度」を定量化できる**: [最大節約法](/algorithms/maximum-parsimony)や[近隣結合法](/algorithms/neighbor-joining)自体は「最良の1本の木」を出力するが、その木の各部分がどれだけ確からしいかは教えてくれない。ブートストラップ法は、この不確実性をデータの統計的な変動という観点から定量化する、実務上ほぼ必須の後処理になっている
- **計算コストの高さ**: 系統樹の構築自体を数百回繰り返す必要があるため、1回の木構築が高コストな手法(最尤法など)と組み合わせると全体の計算時間が大きく伸びる。並列計算との相性が良く(各ブートストラップ試行は独立に実行できる)、実務では計算資源を並列に投入して対処することが多い
- **支持率の解釈における注意点**: ブートストラップ支持率は「データの統計的なノイズに対する頑健性」を測るものであり、必ずしも「その分岐が生物学的に正しい」ことを保証するものではない。系統的なバイアス(モデルの誤り、長枝誘引など)がある場合、高い支持率であっても誤った分岐を支持してしまうことがありうる
- **使いどころ**: 分子系統樹の信頼性評価(学術論文で系統樹の各枝に添えられるパーセンテージの多くはこの手法による)、系統ゲノミクスにおける種間関係の統計的評価、機械学習における特徴量の重要度評価やモデルの不確実性推定への同様のブートストラップ発想の応用

## 実装例

```python
import random
from collections import Counter

def resample_alignment(alignment: list[str]) -> list[str]:
    """alignment[i]はi番目の配列。列(サイト)単位で重複ありランダム再抽出する。"""
    n_sequences = len(alignment)
    length = len(alignment[0])
    sampled_columns = [random.randrange(length) for _ in range(length)]
    return ["".join(seq[c] for c in sampled_columns) for seq in alignment]

def bootstrap_support(
    alignment: list[str],
    build_tree_fn: "Callable[[list[str]], set[frozenset[int]]]",  # 木をクレードの集合として表す
    n_bootstrap: int = 100,
) -> dict[frozenset[int], float]:
    original_clades = build_tree_fn(alignment)
    support_counts: Counter[frozenset[int]] = Counter()

    for _ in range(n_bootstrap):
        pseudo_alignment = resample_alignment(alignment)
        pseudo_clades = build_tree_fn(pseudo_alignment)
        for clade in original_clades:
            if clade in pseudo_clades:
                support_counts[clade] += 1

    return {clade: support_counts[clade] / n_bootstrap for clade in original_clades}
```

```typescript
function resampleAlignment(alignment: string[], rand: () => number = Math.random): string[] {
  const length = alignment[0].length;
  const sampledColumns = Array.from({ length }, () => Math.floor(rand() * length));
  return alignment.map((seq) => sampledColumns.map((c) => seq[c]).join(""));
}

function bootstrapSupport(
  alignment: string[],
  buildTreeFn: (alignment: string[]) => Set<string>,
  nBootstrap = 100,
): Map<string, number> {
  const originalClades = buildTreeFn(alignment);
  const supportCounts = new Map<string, number>();

  for (let i = 0; i < nBootstrap; i++) {
    const pseudoAlignment = resampleAlignment(alignment);
    const pseudoClades = buildTreeFn(pseudoAlignment);
    for (const clade of originalClades) {
      if (pseudoClades.has(clade)) {
        supportCounts.set(clade, (supportCounts.get(clade) ?? 0) + 1);
      }
    }
  }

  const result = new Map<string, number>();
  for (const clade of originalClades) result.set(clade, (supportCounts.get(clade) ?? 0) / nBootstrap);
  return result;
}
```

```cpp
#include <vector>
#include <string>
#include <set>
#include <map>
#include <random>
#include <functional>

std::vector<std::string> resampleAlignment(const std::vector<std::string>& alignment, std::mt19937& rng) {
    int length = static_cast<int>(alignment[0].size());
    std::uniform_int_distribution<int> dist(0, length - 1);
    std::vector<int> sampledColumns(length);
    for (auto& c : sampledColumns) c = dist(rng);

    std::vector<std::string> result;
    for (auto& seq : alignment) {
        std::string newSeq;
        for (int c : sampledColumns) newSeq += seq[c];
        result.push_back(newSeq);
    }
    return result;
}

std::map<std::string, double> bootstrapSupport(
    const std::vector<std::string>& alignment,
    std::function<std::set<std::string>(const std::vector<std::string>&)> buildTreeFn,
    int nBootstrap, std::mt19937& rng) {
    auto originalClades = buildTreeFn(alignment);
    std::map<std::string, int> supportCounts;

    for (int i = 0; i < nBootstrap; i++) {
        auto pseudoAlignment = resampleAlignment(alignment, rng);
        auto pseudoClades = buildTreeFn(pseudoAlignment);
        for (auto& clade : originalClades) {
            if (pseudoClades.count(clade)) supportCounts[clade]++;
        }
    }

    std::map<std::string, double> result;
    for (auto& clade : originalClades) result[clade] = static_cast<double>(supportCounts[clade]) / nBootstrap;
    return result;
}
```

```rust
use std::collections::{HashMap, HashSet};
use rand::Rng;

fn resample_alignment(alignment: &[String], rng: &mut impl Rng) -> Vec<String> {
    let length = alignment[0].len();
    let sampled_columns: Vec<usize> = (0..length).map(|_| rng.gen_range(0..length)).collect();

    alignment
        .iter()
        .map(|seq| {
            let chars: Vec<char> = seq.chars().collect();
            sampled_columns.iter().map(|&c| chars[c]).collect()
        })
        .collect()
}

fn bootstrap_support(
    alignment: &[String], build_tree_fn: impl Fn(&[String]) -> HashSet<String>, n_bootstrap: usize, rng: &mut impl Rng,
) -> HashMap<String, f64> {
    let original_clades = build_tree_fn(alignment);
    let mut support_counts: HashMap<String, i32> = HashMap::new();

    for _ in 0..n_bootstrap {
        let pseudo_alignment = resample_alignment(alignment, rng);
        let pseudo_clades = build_tree_fn(&pseudo_alignment);
        for clade in &original_clades {
            if pseudo_clades.contains(clade) {
                *support_counts.entry(clade.clone()).or_insert(0) += 1;
            }
        }
    }

    original_clades
        .into_iter()
        .map(|clade| {
            let count = *support_counts.get(&clade).unwrap_or(&0);
            (clade, count as f64 / n_bootstrap as f64)
        })
        .collect()
}
```

```csharp
static List<string> ResampleAlignment(List<string> alignment, Random rand)
{
    int length = alignment[0].Length;
    var sampledColumns = Enumerable.Range(0, length).Select(_ => rand.Next(length)).ToList();
    return alignment.Select(seq => new string(sampledColumns.Select(c => seq[c]).ToArray())).ToList();
}

static Dictionary<string, double> BootstrapSupport(
    List<string> alignment, Func<List<string>, HashSet<string>> buildTreeFn, int nBootstrap, Random rand)
{
    var originalClades = buildTreeFn(alignment);
    var supportCounts = new Dictionary<string, int>();

    for (int i = 0; i < nBootstrap; i++)
    {
        var pseudoAlignment = ResampleAlignment(alignment, rand);
        var pseudoClades = buildTreeFn(pseudoAlignment);
        foreach (var clade in originalClades)
        {
            if (pseudoClades.Contains(clade))
                supportCounts[clade] = supportCounts.GetValueOrDefault(clade) + 1;
        }
    }

    return originalClades.ToDictionary(clade => clade, clade => (double)supportCounts.GetValueOrDefault(clade) / nBootstrap);
}
```
