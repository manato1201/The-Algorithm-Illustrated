---
name: エイリアス法(O(1)重み付き抽選)
category: ゲーム/競技プログラミング
subcategory: ゲームバランス・乱数制御
complexity: O(n)(前処理)、O(1)(1回の抽選あたり)
summary: 重みの異なる複数の選択肢からの抽選を、前処理で各要素に「自分」と「もう1つの代役(エイリアス)」を割り当てたテーブルに変換することで、1回の抽選をコイン投げ1回+配列参照だけで済ませる。
---

## 概要

[ピティシステム](/algorithms/pity-system)のような単純な当たり/外れ判定と異なり、「レアリティの異なる複数のアイテムから、それぞれの排出率に応じて1つを選ぶ」というガチャ・ドロップテーブルの抽選は、素朴には累積分布を作って二分探索する(O(log n))か、線形に走査する(O(n))ことで実装される。エイリアス法(Alias Method、Vose法とも呼ばれる改良版が広く使われる)は、**前処理にO(n)かけて「エイリアステーブル」を構築しておけば、以後の抽選は乱数を2回生成して配列を1回参照するだけのO(1)で済む**という手法である。多くの選択肢から何度も重み付き抽選を繰り返す場面(モンテカルロシミュレーション、大量のドロップ抽選処理)で特に効果を発揮する。

## 仕組み

1. `n`個の選択肢それぞれの確率`p_1, ..., p_n`(合計1になるよう正規化済み)を用意する
2. 各確率を`n`倍した値`n・p_i`を計算する(**平均が1になるようにスケーリング**する——これがエイリアス法の核心となる工夫)
3. `n・p_i < 1`の要素を「小さい組(Small)」、`n・p_i ≥ 1`の要素を「大きい組(Large)」に振り分ける
4. Small・Largeの両方が空になるまで、以下を繰り返す:
   - Smallから1つ要素`s`を取り出す。そのマス目の「確率(Prob)」を`n・p_s`とし、余った分(1に足りない部分)を埋める「エイリアス(相方)」として、Largeから1つ要素`l`を割り当てる
   - `l`の重みから`s`に割り当てた分(`1 - n・p_s`)を差し引く。差し引いた後の`l`の重みが1未満になればSmallへ、1以上のままならLargeへ戻す
5. 構築が終わると、`n`マスそれぞれが「確率`Prob[i]`」と「エイリアス`Alias[i]`」を持つテーブルが得られる
6. **抽選時**: `0`から`n-1`の一様乱数でマス`i`を選び、`[0,1)`の一様乱数`u`を生成する。`u < Prob[i]`ならマス`i`自身の選択肢を、そうでなければ`Alias[i]`が指す選択肢を選ぶ。この2回の乱数生成と配列参照だけで、元の重み`p_i`に厳密に従った抽選ができる

## 特性・トレードオフ

- **抽選のたびの計算量がO(1)**: 累積分布上の二分探索(O(log n))や線形走査(O(n))と異なり、エイリアス法は前処理さえ済ませればどれだけ抽選を繰り返してもO(1)で済む。抽選回数が非常に多い(モンテカルロシミュレーション、大量のNPCのドロップ判定など)場合に真価を発揮する
- **重みが変化する場合は再構築が必要**: エイリアステーブルは特定の重み分布に対して構築されるため、確率分布が動的に変化する(例えば時間帯によってドロップ率が変わる)場合は、その都度O(n)の再構築が必要になる。頻繁に重みが変わる用途では、この再構築コストと抽選頻度のバランスを考慮する必要がある
- **実装の直感的な分かりにくさ**: 累積分布+二分探索に比べると、エイリアステーブルの構築ロジック(Small/Largeへの振り分けと相互のやり取り)はやや複雑で、初見では動作原理が直感的に分かりにくい。ただし一度実装すれば安定して動く枯れた技法である
- **使いどころ**: ガチャ・ドロップテーブルの大量抽選処理、モンテカルロ法における重み付きサンプリング、機械学習における負例サンプリング(word2vecのnegative samplingなど)、シミュレーションにおけるイベント種別の高速抽選

## 実装例

```python
import random

def build_alias_table(weights: list[float]) -> tuple[list[float], list[int]]:
    n = len(weights)
    total = sum(weights)
    scaled = [w * n / total for w in weights]

    prob = [0.0] * n
    alias = [0] * n
    small = [i for i, s in enumerate(scaled) if s < 1.0]
    large = [i for i, s in enumerate(scaled) if s >= 1.0]

    while small and large:
        s = small.pop()
        l = large.pop()
        prob[s] = scaled[s]
        alias[s] = l
        scaled[l] = scaled[l] + scaled[s] - 1.0
        if scaled[l] < 1.0:
            small.append(l)
        else:
            large.append(l)

    for i in large:
        prob[i] = 1.0
    for i in small:
        prob[i] = 1.0

    return prob, alias

def alias_sample(prob: list[float], alias: list[int]) -> int:
    n = len(prob)
    i = random.randrange(n)
    u = random.random()
    return i if u < prob[i] else alias[i]
```

```typescript
function buildAliasTable(weights: number[]): {
  prob: number[];
  alias: number[];
} {
  const n = weights.length;
  const total = weights.reduce((a, b) => a + b, 0);
  const scaled = weights.map((w) => (w * n) / total);

  const prob = new Array(n).fill(0);
  const alias = new Array(n).fill(0);
  const small: number[] = [];
  const large: number[] = [];
  scaled.forEach((s, i) => (s < 1.0 ? small : large).push(i));

  while (small.length && large.length) {
    const s = small.pop()!;
    const l = large.pop()!;
    prob[s] = scaled[s];
    alias[s] = l;
    scaled[l] = scaled[l] + scaled[s] - 1.0;
    (scaled[l] < 1.0 ? small : large).push(l);
  }
  for (const i of [...large, ...small]) prob[i] = 1.0;

  return { prob, alias };
}

function aliasSample(
  prob: number[],
  alias: number[],
  rand: () => number = Math.random,
): number {
  const n = prob.length;
  const i = Math.floor(rand() * n);
  const u = rand();
  return u < prob[i] ? i : alias[i];
}
```

```cpp
#include <vector>
#include <random>
#include <numeric>

void buildAliasTable(const std::vector<double>& weights, std::vector<double>& prob, std::vector<int>& alias) {
    int n = static_cast<int>(weights.size());
    double total = std::accumulate(weights.begin(), weights.end(), 0.0);
    std::vector<double> scaled(n);
    for (int i = 0; i < n; i++) scaled[i] = weights[i] * n / total;

    prob.assign(n, 0.0);
    alias.assign(n, 0);
    std::vector<int> small, large;
    for (int i = 0; i < n; i++) (scaled[i] < 1.0 ? small : large).push_back(i);

    while (!small.empty() && !large.empty()) {
        int s = small.back(); small.pop_back();
        int l = large.back(); large.pop_back();
        prob[s] = scaled[s];
        alias[s] = l;
        scaled[l] = scaled[l] + scaled[s] - 1.0;
        (scaled[l] < 1.0 ? small : large).push_back(l);
    }
    for (int i : large) prob[i] = 1.0;
    for (int i : small) prob[i] = 1.0;
}

int aliasSample(const std::vector<double>& prob, const std::vector<int>& alias, std::mt19937& rng) {
    int n = static_cast<int>(prob.size());
    std::uniform_int_distribution<int> idxDist(0, n - 1);
    std::uniform_real_distribution<double> uDist(0.0, 1.0);
    int i = idxDist(rng);
    double u = uDist(rng);
    return u < prob[i] ? i : alias[i];
}
```

```rust
fn build_alias_table(weights: &[f64]) -> (Vec<f64>, Vec<usize>) {
    let n = weights.len();
    let total: f64 = weights.iter().sum();
    let mut scaled: Vec<f64> = weights.iter().map(|&w| w * n as f64 / total).collect();

    let mut prob = vec![0.0; n];
    let mut alias = vec![0usize; n];
    let mut small: Vec<usize> = (0..n).filter(|&i| scaled[i] < 1.0).collect();
    let mut large: Vec<usize> = (0..n).filter(|&i| scaled[i] >= 1.0).collect();

    while let (Some(s), Some(l)) = (small.pop(), large.pop()) {
        prob[s] = scaled[s];
        alias[s] = l;
        scaled[l] = scaled[l] + scaled[s] - 1.0;
        if scaled[l] < 1.0 {
            small.push(l);
        } else {
            large.push(l);
        }
    }
    for &i in large.iter().chain(small.iter()) {
        prob[i] = 1.0;
    }

    (prob, alias)
}

fn alias_sample(prob: &[f64], alias: &[usize], idx_rand: f64, u: f64) -> usize {
    let n = prob.len();
    let i = (idx_rand * n as f64) as usize;
    if u < prob[i] { i } else { alias[i] }
}
```

```csharp
static (double[] prob, int[] alias) BuildAliasTable(double[] weights)
{
    int n = weights.Length;
    double total = weights.Sum();
    var scaled = weights.Select(w => w * n / total).ToArray();

    var prob = new double[n];
    var alias = new int[n];
    var small = new List<int>();
    var large = new List<int>();
    for (int i = 0; i < n; i++) (scaled[i] < 1.0 ? small : large).Add(i);

    while (small.Count > 0 && large.Count > 0)
    {
        int s = small[^1]; small.RemoveAt(small.Count - 1);
        int l = large[^1]; large.RemoveAt(large.Count - 1);
        prob[s] = scaled[s];
        alias[s] = l;
        scaled[l] = scaled[l] + scaled[s] - 1.0;
        (scaled[l] < 1.0 ? small : large).Add(l);
    }
    foreach (int i in large.Concat(small)) prob[i] = 1.0;

    return (prob, alias);
}

static int AliasSample(double[] prob, int[] alias, Random rand)
{
    int n = prob.Length;
    int i = rand.Next(n);
    double u = rand.NextDouble();
    return u < prob[i] ? i : alias[i];
}
```
