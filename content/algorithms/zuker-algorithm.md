---
name: Zukerアルゴリズム(RNA二次構造の最小自由エネルギー法)
category: バイオインフォマティクス
subcategory: 構造予測
complexity: O(n³)(時間)、O(n²)(空間)
summary: RNA配列が取りうる二次構造を、塩基対の数ではなく熱力学的な自由エネルギーで評価し、ループの種類ごとに異なるエネルギーパラメータを使い分けながら区間分割DPで最小自由エネルギー構造を求める。
---

## 概要

[Nussinovアルゴリズム](/algorithms/nussinov-algorithm)は「できるだけ多くの塩基対を作る」という単純化された仮定でRNAの二次構造を予測したが、実際のRNAの安定性は塩基対の数だけでは決まらない——隣り合う塩基対同士が積み重なる「スタッキング」相互作用や、ループ(ヘアピンループ、内部ループ、バルジ、マルチループ)の大きさ・種類によって、構造全体の熱力学的な自由エネルギーが変化する。Zukerアルゴリズムは、1981年にマイケル・ズーカーとパトリック・スティーグラーが提案した手法で、実験的に測定された**熱力学パラメータ(各ループ・スタッキングのエネルギー値)を使い、区間分割型の動的計画法で自由エネルギーが最小になる二次構造**を求める。RNA二次構造予測ソフトウェア(mfold、RNAfoldなど)の基盤となっている、生物物理学的に妥当性の高いアプローチである。

## 仕組み

1. 配列の区間`[i, j]`について、複数のDPテーブルを同時に管理する。代表的なものが、**`W[i,j]`**(区間`[i,j]`全体の最小自由エネルギー)と**`V[i,j]`**(`i`番目と`j`番目の塩基が塩基対を作ると仮定した場合の、その部分構造の最小自由エネルギー)である
2. `V[i,j]`の計算では、`i`-`j`塩基対が作るループの種類に応じて場合分けする:
   - **ヘアピンループ**: `i`と`j`の間に他の塩基対がない場合。ループの大きさに応じたエネルギーテーブルを参照する
   - **スタッキング**: `i+1`-`j-1`も塩基対を作り、`i`-`j`と直接積み重なる場合。スタッキングエネルギー(隣接する塩基対の組み合わせごとに実験的に決まった値)を加算する
   - **内部ループ/バルジ**: `i`-`j`の内側に、間隔を空けて別の塩基対`i'`-`j'`がある場合。ループの大きさと非対称性に応じたエネルギーを加算する
   - **マルチループ**: `i`-`j`の内側に3つ以上の独立した塩基対の枝が分岐する場合。分岐数に応じたペナルティを加算する
3. `W[i,j]`は、「`i`が塩基対を作らない場合」「`j`が塩基対を作らない場合」「`i`-`j`が塩基対を作る場合(`V[i,j]`を使う)」「区間を2つに分割してそれぞれ独立な構造を作る場合」のうち、最もエネルギーが低い(最も安定な)ものを選ぶ
4. 全区間についてこれらのテーブルをボトムアップに(区間の長さが短い方から長い方へ)埋めていき、最終的に`W[1,n]`が配列全体の最小自由エネルギーとなる
5. トレースバックにより、実際にどの塩基対がその最小エネルギー構造を構成するかを復元する

## 特性・トレードオフ

- **熱力学的に妥当な構造予測**: [Nussinovアルゴリズム](/algorithms/nussinov-algorithm)の「塩基対数の最大化」という単純化と異なり、実測されたエネルギーパラメータに基づくため、実際のRNAの折り畳み挙動をより正確に反映した予測が得られる
- **計算量の増加とのトレードオフ**: ループの種類ごとに場合分けした複数のDPテーブルを管理する必要があり、Nussinovアルゴリズムに比べて実装が複雑になる。内部ループの計算を素朴に行うとO(n⁴)になるが、多くの実装ではループサイズに制限を設けたり、数学的な工夫でO(n³)に抑えている
- **擬似結節(pseudoknot)を扱えないという制約**: Zukerアルゴリズムを含む区間分割DPベースの手法は、[Nussinovアルゴリズム](/algorithms/nussinov-algorithm)と同様、塩基対が入れ子構造を保つ(交差しない)ことを前提としており、実際のRNAに見られる複雑な立体構造である擬似結節は表現できない。擬似結節を含む構造予測には、別の枠組み(整数計画法やより高度なモデル)が必要になる
- **使いどころ**: mRNA・非コードRNAの二次構造予測ソフトウェア(mfold、RNAfold、UNAFoldなど)、RNAワクチン設計における配列最適化、リボザイム・アプタマーの構造設計、RNA分子の機能予測研究

## 実装例

簡略化した版(スタッキングとヘアピンループの2種類のみを考慮)で、Zukerアルゴリズムの核となる区間分割DPを示す。

```python
def can_pair(a: str, b: str) -> bool:
    pairs = {("A", "U"), ("U", "A"), ("G", "C"), ("C", "G"), ("G", "U"), ("U", "G")}
    return (a, b) in pairs

def hairpin_energy(loop_size: int) -> float:
    if loop_size < 3:
        return float("inf")  # ヘアピンループは最低3塩基必要
    return 4.5 + 1.5 * max(0, loop_size - 3)  # 簡略化したループサイズ依存エネルギー

def stacking_energy() -> float:
    return -2.0  # 簡略化した一律のスタッキング安定化エネルギー

def zuker_fold(seq: str) -> tuple[list[list[float]], list[list[float]]]:
    n = len(seq)
    inf = float("inf")
    v = [[inf] * n for _ in range(n)]
    w = [[0.0] * n for _ in range(n)]

    for length in range(4, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if can_pair(seq[i], seq[j]):
                hairpin = hairpin_energy(j - i - 1)
                stack = v[i + 1][j - 1] + stacking_energy() if i + 1 <= j - 1 and can_pair(seq[i + 1], seq[j - 1]) else inf
                v[i][j] = min(hairpin, stack)

            candidates = [w[i + 1][j], w[i][j - 1]]
            if v[i][j] < inf:
                candidates.append(v[i][j])
            for k in range(i, j):
                candidates.append(w[i][k] + w[k + 1][j])
            w[i][j] = min(candidates)

    return v, w
```

```typescript
function canPair(a: string, b: string): boolean {
  const pairs = new Set(["AU", "UA", "GC", "CG", "GU", "UG"]);
  return pairs.has(a + b);
}

function hairpinEnergy(loopSize: number): number {
  if (loopSize < 3) return Infinity;
  return 4.5 + 1.5 * Math.max(0, loopSize - 3);
}

const STACKING_ENERGY = -2.0;

function zukerFold(seq: string): { v: number[][]; w: number[][] } {
  const n = seq.length;
  const v: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(Infinity),
  );
  const w: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let length = 4; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length - 1;
      if (canPair(seq[i], seq[j])) {
        const hairpin = hairpinEnergy(j - i - 1);
        const stack =
          i + 1 <= j - 1 && canPair(seq[i + 1], seq[j - 1])
            ? v[i + 1][j - 1] + STACKING_ENERGY
            : Infinity;
        v[i][j] = Math.min(hairpin, stack);
      }

      let best = Math.min(w[i + 1][j], w[i][j - 1]);
      if (v[i][j] < Infinity) best = Math.min(best, v[i][j]);
      for (let k = i; k < j; k++) best = Math.min(best, w[i][k] + w[k + 1][j]);
      w[i][j] = best;
    }
  }

  return { v, w };
}
```

```cpp
#include <vector>
#include <string>
#include <limits>
#include <algorithm>
#include <set>

bool canPair(char a, char b) {
    static const std::set<std::string> pairs = {"AU", "UA", "GC", "CG", "GU", "UG"};
    return pairs.count(std::string{a, b}) > 0;
}

double hairpinEnergy(int loopSize) {
    if (loopSize < 3) return std::numeric_limits<double>::infinity();
    return 4.5 + 1.5 * std::max(0, loopSize - 3);
}

const double STACKING_ENERGY = -2.0;

std::pair<std::vector<std::vector<double>>, std::vector<std::vector<double>>> zukerFold(const std::string& seq) {
    int n = static_cast<int>(seq.size());
    double inf = std::numeric_limits<double>::infinity();
    std::vector<std::vector<double>> v(n, std::vector<double>(n, inf));
    std::vector<std::vector<double>> w(n, std::vector<double>(n, 0.0));

    for (int length = 4; length <= n; length++) {
        for (int i = 0; i <= n - length; i++) {
            int j = i + length - 1;
            if (canPair(seq[i], seq[j])) {
                double hairpin = hairpinEnergy(j - i - 1);
                double stack = (i + 1 <= j - 1 && canPair(seq[i + 1], seq[j - 1])) ? v[i + 1][j - 1] + STACKING_ENERGY : inf;
                v[i][j] = std::min(hairpin, stack);
            }

            double best = std::min(w[i + 1][j], w[i][j - 1]);
            if (v[i][j] < inf) best = std::min(best, v[i][j]);
            for (int k = i; k < j; k++) best = std::min(best, w[i][k] + w[k + 1][j]);
            w[i][j] = best;
        }
    }

    return {v, w};
}
```

```rust
use std::collections::HashSet;

fn can_pair(a: char, b: char) -> bool {
    let pairs: HashSet<(char, char)> =
        [('A', 'U'), ('U', 'A'), ('G', 'C'), ('C', 'G'), ('G', 'U'), ('U', 'G')].into_iter().collect();
    pairs.contains(&(a, b))
}

fn hairpin_energy(loop_size: i32) -> f64 {
    if loop_size < 3 {
        return f64::INFINITY;
    }
    4.5 + 1.5 * (loop_size - 3).max(0) as f64
}

const STACKING_ENERGY: f64 = -2.0;

fn zuker_fold(seq: &[char]) -> (Vec<Vec<f64>>, Vec<Vec<f64>>) {
    let n = seq.len();
    let mut v = vec![vec![f64::INFINITY; n]; n];
    let mut w = vec![vec![0.0; n]; n];

    for length in 4..=n {
        for i in 0..=n - length {
            let j = i + length - 1;
            if can_pair(seq[i], seq[j]) {
                let hairpin = hairpin_energy((j - i - 1) as i32);
                let stack = if i + 1 <= j.saturating_sub(1) && can_pair(seq[i + 1], seq[j - 1]) {
                    v[i + 1][j - 1] + STACKING_ENERGY
                } else {
                    f64::INFINITY
                };
                v[i][j] = hairpin.min(stack);
            }

            let mut best = w[i + 1][j].min(w[i][j - 1]);
            if v[i][j] < f64::INFINITY {
                best = best.min(v[i][j]);
            }
            for k in i..j {
                best = best.min(w[i][k] + w[k + 1][j]);
            }
            w[i][j] = best;
        }
    }

    (v, w)
}
```

```csharp
static bool CanPair(char a, char b)
{
    var pairs = new HashSet<string> { "AU", "UA", "GC", "CG", "GU", "UG" };
    return pairs.Contains($"{a}{b}");
}

static double HairpinEnergy(int loopSize)
{
    if (loopSize < 3) return double.PositiveInfinity;
    return 4.5 + 1.5 * Math.Max(0, loopSize - 3);
}

const double StackingEnergy = -2.0;

static (double[][] V, double[][] W) ZukerFold(string seq)
{
    int n = seq.Length;
    var v = new double[n][];
    var w = new double[n][];
    for (int i = 0; i < n; i++)
    {
        v[i] = Enumerable.Repeat(double.PositiveInfinity, n).ToArray();
        w[i] = new double[n];
    }

    for (int length = 4; length <= n; length++)
    {
        for (int i = 0; i <= n - length; i++)
        {
            int j = i + length - 1;
            if (CanPair(seq[i], seq[j]))
            {
                double hairpin = HairpinEnergy(j - i - 1);
                double stack = (i + 1 <= j - 1 && CanPair(seq[i + 1], seq[j - 1])) ? v[i + 1][j - 1] + StackingEnergy : double.PositiveInfinity;
                v[i][j] = Math.Min(hairpin, stack);
            }

            double best = Math.Min(w[i + 1][j], w[i][j - 1]);
            if (v[i][j] < double.PositiveInfinity) best = Math.Min(best, v[i][j]);
            for (int k = i; k < j; k++) best = Math.Min(best, w[i][k] + w[k + 1][j]);
            w[i][j] = best;
        }
    }

    return (v, w);
}
```
