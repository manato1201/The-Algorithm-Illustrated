---
name: 前向き・後ろ向きアルゴリズム
category: 自然言語処理
subcategory: 系列ラベリング・構文解析
complexity: O(n × k²)(n系列長、k状態数)
summary: 隠れマルコフモデルで「最良の1つの経路」ではなく、各時刻・各状態の周辺確率を全ての経路を考慮して正確に計算する動的計画法。
---

## 概要

[ビタビアルゴリズム](/algorithms/viterbi-algorithm)は「最も確率の高い1つの状態系列」を求めるが、実際には「時刻`t`で状態`s`にいる確率はどれくらいか」という、あり得る全ての経路を加味した確率(周辺確率)を知りたい場面も多い——例えば隠れマルコフモデル自体のパラメータ(遷移確率・出力確率)を訓練データから学習する際には、この周辺確率が不可欠になる。前向き・後ろ向きアルゴリズムは、[ビタビアルゴリズム](/algorithms/viterbi-algorithm)の「最大値を取る」操作を「全ての経路について合計する」操作に置き換えることで、同じ動的計画法の骨格を使いながら、周辺確率を正確に計算する。

## 仕組み

1. **前向き確率**`α[t][s]`を「時刻1から`t`までの観測系列が実際に観測され、かつ時刻`t`で状態`s`にいる確率」と定義する。これは`α[t][s] = Σ_s'(α[t-1][s'] × 遷移確率(s'→s)) × 出力確率(s, 観測t)`という漸化式で、時刻1から前向きに計算できる([ビタビアルゴリズム](/algorithms/viterbi-algorithm)の`max`を`Σ`(合計)に置き換えただけの構造)
2. **後ろ向き確率**`β[t][s]`を「時刻`t`で状態`s`にいるという条件のもとで、時刻`t+1`から`n`までの残りの観測系列が観測される確率」と定義する。これは系列の末尾から逆向きに`β[t][s] = Σ_s'(遷移確率(s→s') × 出力確率(s', 観測t+1) × β[t+1][s'])`という漸化式で計算する
3. 前向き確率と後ろ向き確率を掛け合わせると、`α[t][s] × β[t][s]`は「観測系列全体が観測され、かつ時刻`t`で状態`s`にいる」同時確率になる。これを全状態について正規化すれば、時刻`t`で状態`s`にいる周辺確率(事後確率)が求まる
4. さらに隣接する2時刻の状態の組`(s, s')`についての同時確率も同様に計算でき、これらを使ってHMMのパラメータ(遷移確率・出力確率)を反復的に再推定する**バウム・ウェルチ法**(EMアルゴリズムのHMM版)が構成できる——ラベル付きデータがなくても、観測系列だけからHMMを訓練できる教師なし学習の枠組みになる

## 特性・トレードオフ

- **計算量**: 前向き・後ろ向きともに[ビタビアルゴリズム](/algorithms/viterbi-algorithm)と同じ`O(n × k²)`。両方の計算を合わせても定数倍の違いしかない
- **[ビタビアルゴリズム](/algorithms/viterbi-algorithm)との使い分け**: 「最終的に確定した1つの状態系列が欲しい」場合はビタビ、「各時点での状態の確信度(確率分布)を知りたい」「モデル自体のパラメータを訓練したい」場合は前向き・後ろ向きアルゴリズムを使う、という明確な役割分担がある
- **数値的アンダーフローへの注意**: 確率を単純に掛け合わせ続けると、系列が長くなるにつれ値が急激に小さくなり浮動小数点の精度を超えてアンダーフローすることがある。実装では対数を取って掛け算を足し算に変換する、あるいは各時刻でスケーリング(正規化)を行うといった数値的な工夫が必須になる
- **使いどころ**: 隠れマルコフモデルのパラメータ学習(バウム・ウェルチ法)、品詞タグ付けや音声認識における各時点のタグの確信度推定、遺伝子配列解析における状態の事後確率推定

## 実装例

```python
def forward(
    obs: list[str],
    states: list[str],
    start_p: dict[str, float],
    trans_p: dict[str, dict[str, float]],
    emit_p: dict[str, dict[str, float]],
) -> list[dict[str, float]]:
    n = len(obs)
    alpha: list[dict[str, float]] = [{} for _ in range(n)]
    for s in states:
        alpha[0][s] = start_p[s] * emit_p[s][obs[0]]
    for t in range(1, n):
        for s in states:
            alpha[t][s] = sum(alpha[t - 1][sp] * trans_p[sp][s] for sp in states) * emit_p[s][obs[t]]
    return alpha


def backward(
    obs: list[str],
    states: list[str],
    trans_p: dict[str, dict[str, float]],
    emit_p: dict[str, dict[str, float]],
) -> list[dict[str, float]]:
    n = len(obs)
    beta: list[dict[str, float]] = [{} for _ in range(n)]
    for s in states:
        beta[n - 1][s] = 1.0
    for t in range(n - 2, -1, -1):
        for s in states:
            beta[t][s] = sum(trans_p[s][sp] * emit_p[sp][obs[t + 1]] * beta[t + 1][sp] for sp in states)
    return beta


def forward_backward(
    obs: list[str],
    states: list[str],
    start_p: dict[str, float],
    trans_p: dict[str, dict[str, float]],
    emit_p: dict[str, dict[str, float]],
) -> tuple[list[dict[str, float]], float]:
    alpha = forward(obs, states, start_p, trans_p, emit_p)
    beta = backward(obs, states, trans_p, emit_p)
    n = len(obs)
    total = sum(alpha[n - 1][s] for s in states)  # 観測系列全体の尤度
    gamma = [{s: alpha[t][s] * beta[t][s] / total for s in states} for t in range(n)]
    return gamma, total
```

```typescript
type Probs = Record<string, number>;

function forwardAlg(
  obs: string[],
  states: string[],
  startP: Probs,
  transP: Record<string, Probs>,
  emitP: Record<string, Probs>,
): Probs[] {
  const n = obs.length;
  const alpha: Probs[] = Array.from({ length: n }, () => ({}));
  for (const s of states) alpha[0][s] = startP[s] * emitP[s][obs[0]];
  for (let t = 1; t < n; t++) {
    for (const s of states) {
      let sum = 0;
      for (const sp of states) sum += alpha[t - 1][sp] * transP[sp][s];
      alpha[t][s] = sum * emitP[s][obs[t]];
    }
  }
  return alpha;
}

function backwardAlg(
  obs: string[],
  states: string[],
  transP: Record<string, Probs>,
  emitP: Record<string, Probs>,
): Probs[] {
  const n = obs.length;
  const beta: Probs[] = Array.from({ length: n }, () => ({}));
  for (const s of states) beta[n - 1][s] = 1;
  for (let t = n - 2; t >= 0; t--) {
    for (const s of states) {
      let sum = 0;
      for (const sp of states)
        sum += transP[s][sp] * emitP[sp][obs[t + 1]] * beta[t + 1][sp];
      beta[t][s] = sum;
    }
  }
  return beta;
}

function forwardBackward(
  obs: string[],
  states: string[],
  startP: Probs,
  transP: Record<string, Probs>,
  emitP: Record<string, Probs>,
): { gamma: Probs[]; total: number } {
  const alpha = forwardAlg(obs, states, startP, transP, emitP);
  const beta = backwardAlg(obs, states, transP, emitP);
  const n = obs.length;
  const total = states.reduce((s, st) => s + alpha[n - 1][st], 0);
  const gamma = Array.from({ length: n }, (_, t) => {
    const g: Probs = {};
    for (const s of states) g[s] = (alpha[t][s] * beta[t][s]) / total;
    return g;
  });
  return { gamma, total };
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>

using ProbMap = std::unordered_map<std::string, double>;
using TransMap = std::unordered_map<std::string, ProbMap>;

std::vector<ProbMap> forwardAlg(const std::vector<std::string>& obs, const std::vector<std::string>& states,
                                 const ProbMap& startP, const TransMap& transP, const TransMap& emitP) {
    int n = static_cast<int>(obs.size());
    std::vector<ProbMap> alpha(n);
    for (const auto& s : states) alpha[0][s] = startP.at(s) * emitP.at(s).at(obs[0]);
    for (int t = 1; t < n; t++) {
        for (const auto& s : states) {
            double sum = 0.0;
            for (const auto& sp : states) sum += alpha[t - 1][sp] * transP.at(sp).at(s);
            alpha[t][s] = sum * emitP.at(s).at(obs[t]);
        }
    }
    return alpha;
}

std::vector<ProbMap> backwardAlg(const std::vector<std::string>& obs, const std::vector<std::string>& states,
                                  const TransMap& transP, const TransMap& emitP) {
    int n = static_cast<int>(obs.size());
    std::vector<ProbMap> beta(n);
    for (const auto& s : states) beta[n - 1][s] = 1.0;
    for (int t = n - 2; t >= 0; t--) {
        for (const auto& s : states) {
            double sum = 0.0;
            for (const auto& sp : states) sum += transP.at(s).at(sp) * emitP.at(sp).at(obs[t + 1]) * beta[t + 1][sp];
            beta[t][s] = sum;
        }
    }
    return beta;
}

std::pair<std::vector<ProbMap>, double> forwardBackward(
    const std::vector<std::string>& obs, const std::vector<std::string>& states,
    const ProbMap& startP, const TransMap& transP, const TransMap& emitP) {
    auto alpha = forwardAlg(obs, states, startP, transP, emitP);
    auto beta = backwardAlg(obs, states, transP, emitP);
    int n = static_cast<int>(obs.size());
    double total = 0.0;
    for (const auto& s : states) total += alpha[n - 1][s];
    std::vector<ProbMap> gamma(n);
    for (int t = 0; t < n; t++)
        for (const auto& s : states) gamma[t][s] = alpha[t][s] * beta[t][s] / total;
    return {gamma, total};
}
```

```rust
use std::collections::HashMap;

fn forward<'a>(
    obs: &[&str],
    states: &[&'a str],
    start_p: &HashMap<&str, f64>,
    trans_p: &HashMap<&str, HashMap<&str, f64>>,
    emit_p: &HashMap<&str, HashMap<&str, f64>>,
) -> Vec<HashMap<&'a str, f64>> {
    let n = obs.len();
    let mut alpha: Vec<HashMap<&str, f64>> = vec![HashMap::new(); n];
    for &s in states {
        alpha[0].insert(s, start_p[s] * emit_p[s][obs[0]]);
    }
    for t in 1..n {
        for &s in states {
            let sum: f64 = states.iter().map(|&sp| alpha[t - 1][sp] * trans_p[sp][s]).sum();
            alpha[t].insert(s, sum * emit_p[s][obs[t]]);
        }
    }
    alpha
}

fn backward<'a>(
    obs: &[&str],
    states: &[&'a str],
    trans_p: &HashMap<&str, HashMap<&str, f64>>,
    emit_p: &HashMap<&str, HashMap<&str, f64>>,
) -> Vec<HashMap<&'a str, f64>> {
    let n = obs.len();
    let mut beta: Vec<HashMap<&str, f64>> = vec![HashMap::new(); n];
    for &s in states {
        beta[n - 1].insert(s, 1.0);
    }
    for t in (0..n - 1).rev() {
        for &s in states {
            let sum: f64 = states.iter().map(|&sp| trans_p[s][sp] * emit_p[sp][obs[t + 1]] * beta[t + 1][sp]).sum();
            beta[t].insert(s, sum);
        }
    }
    beta
}

fn forward_backward<'a>(
    obs: &[&str],
    states: &[&'a str],
    start_p: &HashMap<&str, f64>,
    trans_p: &HashMap<&str, HashMap<&str, f64>>,
    emit_p: &HashMap<&str, HashMap<&str, f64>>,
) -> (Vec<HashMap<&'a str, f64>>, f64) {
    let alpha = forward(obs, states, start_p, trans_p, emit_p);
    let beta = backward(obs, states, trans_p, emit_p);
    let n = obs.len();
    let total: f64 = states.iter().map(|&s| alpha[n - 1][s]).sum();
    let mut gamma: Vec<HashMap<&str, f64>> = vec![HashMap::new(); n];
    for t in 0..n {
        for &s in states {
            gamma[t].insert(s, alpha[t][s] * beta[t][s] / total);
        }
    }
    (gamma, total)
}
```

```csharp
static List<Dictionary<string, double>> ForwardAlg(
    List<string> obs, List<string> states,
    Dictionary<string, double> startP,
    Dictionary<string, Dictionary<string, double>> transP,
    Dictionary<string, Dictionary<string, double>> emitP)
{
    int n = obs.Count;
    var alpha = new List<Dictionary<string, double>>();
    for (int t = 0; t < n; t++) alpha.Add(new Dictionary<string, double>());
    foreach (var s in states) alpha[0][s] = startP[s] * emitP[s][obs[0]];
    for (int t = 1; t < n; t++)
        foreach (var s in states)
        {
            double sum = 0;
            foreach (var sp in states) sum += alpha[t - 1][sp] * transP[sp][s];
            alpha[t][s] = sum * emitP[s][obs[t]];
        }
    return alpha;
}

static List<Dictionary<string, double>> BackwardAlg(
    List<string> obs, List<string> states,
    Dictionary<string, Dictionary<string, double>> transP,
    Dictionary<string, Dictionary<string, double>> emitP)
{
    int n = obs.Count;
    var beta = new List<Dictionary<string, double>>();
    for (int t = 0; t < n; t++) beta.Add(new Dictionary<string, double>());
    foreach (var s in states) beta[n - 1][s] = 1.0;
    for (int t = n - 2; t >= 0; t--)
        foreach (var s in states)
        {
            double sum = 0;
            foreach (var sp in states) sum += transP[s][sp] * emitP[sp][obs[t + 1]] * beta[t + 1][sp];
            beta[t][s] = sum;
        }
    return beta;
}

static (List<Dictionary<string, double>> Gamma, double Total) ForwardBackward(
    List<string> obs, List<string> states,
    Dictionary<string, double> startP,
    Dictionary<string, Dictionary<string, double>> transP,
    Dictionary<string, Dictionary<string, double>> emitP)
{
    var alpha = ForwardAlg(obs, states, startP, transP, emitP);
    var beta = BackwardAlg(obs, states, transP, emitP);
    int n = obs.Count;
    double total = states.Sum(s => alpha[n - 1][s]);
    var gamma = new List<Dictionary<string, double>>();
    for (int t = 0; t < n; t++)
    {
        var g = new Dictionary<string, double>();
        foreach (var s in states) g[s] = alpha[t][s] * beta[t][s] / total;
        gamma.Add(g);
    }
    return (gamma, total);
}
```
