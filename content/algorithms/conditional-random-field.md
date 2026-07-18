---
name: 条件付き確率場(CRF)
category: 自然言語処理
subcategory: 系列ラベリング・構文解析
complexity: O(n × k²)(推論時、n系列長、k状態数。ビタビ法と同様)
summary: 観測系列全体を条件として、ラベル系列全体の確率を1つのモデルとして直接定義する、隠れマルコフモデルより柔軟な系列ラベリングのための識別モデル。
---

## 概要

[隠れマルコフモデル(HMM)](/algorithms/viterbi-algorithm)は「各状態がどの単語を出力しやすいか」という生成的なモデルだが、これだと「直前の単語が大文字で始まる」「単語の末尾が'-ing'である」といった、単語そのもの以外の豊富な特徴量を自然に組み込みにくい。2001年にラファティらが提案した条件付き確率場(CRF)は、観測系列(単語の並び)全体を所与の条件として、ラベル系列(品詞や固有表現のタグの並び)全体の確率を、隣接ラベル間の整合性と各位置の特徴量の両方を加味した1つの指数関数モデルとして直接定義する識別モデルである。HMMのような「出力確率」の独立性の仮定に縛られず、任意の特徴量を自由に設計できる柔軟性が最大の利点になる。

## 仕組み

1. ラベル系列`y = (y1, ..., yn)`と観測系列`x`に対して、条件付き確率を`P(y|x) ∝ exp(Σt Σk λk × fk(y[t-1], y[t], x, t))`という形で定義する。`fk`は「特徴関数」で、例えば「`y[t-1]`が固有名詞かつ`y[t]`も固有名詞かつ`x[t]`が大文字で始まる」といった、ラベルの遷移と観測系列の任意の性質を自由に組み合わせて設計できる
2. 特徴関数の重み`λk`はコーパスから学習する(勾配降下法系の最適化アルゴリズムで対数尤度を最大化する、[勾配降下法](/algorithms/gradient-descent)がここでも使われる)
3. 学習済みのモデルで新しい観測系列`x`に対する最も尤もらしいラベル系列を求める推論には、[ビタビアルゴリズム](/algorithms/viterbi-algorithm)と全く同じ動的計画法の骨格が使える——特徴関数がラベルの隣接ペアにしか依存しない「線形鎖CRF」の場合、`dp[t][s]`のスコア最大化として効率的に計算できる
4. 学習時のパラメータ更新には、[前向き・後ろ向きアルゴリズム](/algorithms/forward-backward-algorithm)に相当する周辺確率の計算(分配関数の正規化のため)が必要になる

## 特性・トレードオフ

- **計算量**: 推論は線形鎖CRFであれば[ビタビアルゴリズム](/algorithms/viterbi-algorithm)と同じ`O(n × k²)`で済む。学習は反復的な最適化が必要で、[前向き・後ろ向きアルゴリズム](/algorithms/forward-backward-algorithm)相当の計算を繰り返すためHMMの単純な頻度カウントによる学習よりコストが高い
- **識別モデルと生成モデルの違い**: HMMは「ラベルから観測が生成される確率」をモデル化する生成モデルだが、CRFは「観測が与えられたときのラベルの確率」を直接モデル化する識別モデル。識別モデルは分類・タグ付けの精度に直結する条件付き確率を直接最適化するため、豊富な特徴量を使える場面ではHMMより高精度になりやすい
- **特徴量設計の自由度**: HMMでは表現しにくい「複数の観測にまたがる特徴」「非独立な特徴の組み合わせ」を自然に扱える。この柔軟性の代償として、良い特徴関数を設計する職人的な作業(特徴量エンジニアリング)が精度を左右する
- **使いどころ**: 固有表現認識(人名・組織名・地名の抽出)、品詞タグ付け、遺伝子配列のアノテーション。深層学習が普及する以前の統計的自然言語処理における系列ラベリングのデファクトスタンダードであり、現在もLSTM・Transformerの出力層に組み合わせて使われることがある(Bi-LSTM-CRF等)

## 実装例

線形鎖CRFの推論(最尤ラベル系列の復元)は、確率の積の代わりに特徴関数の重み付き和(スコア)を使うだけで、[ビタビアルゴリズム](/algorithms/viterbi-algorithm)と全く同じ動的計画法になる。

```python
def crf_decode(
    x: list[str],
    labels: list[str],
    trans_w: dict[str, dict[str, float]],  # 遷移特徴の重み
    emit_w: dict[str, dict[str, float]],  # 観測特徴の重み
    start_w: dict[str, float],
) -> tuple[list[str], float]:
    n = len(x)
    dp: list[dict[str, float]] = [{} for _ in range(n)]
    back: list[dict[str, str | None]] = [{} for _ in range(n)]
    for y in labels:
        dp[0][y] = start_w[y] + emit_w[y][x[0]]
        back[0][y] = None
    for t in range(1, n):
        for y in labels:
            best_prev, best_val = None, float("-inf")
            for yp in labels:
                val = dp[t - 1][yp] + trans_w[yp][y]
                if val > best_val:
                    best_val, best_prev = val, yp
            dp[t][y] = best_val + emit_w[y][x[t]]
            back[t][y] = best_prev

    last = max(labels, key=lambda y: dp[n - 1][y])
    best_score = dp[n - 1][last]
    path = [last]
    for t in range(n - 1, 0, -1):
        path.append(back[t][path[-1]])
    path.reverse()
    return path, best_score
```

```typescript
type Weights = Record<string, number>;

function crfDecode(
  x: string[],
  labels: string[],
  transW: Record<string, Weights>,
  emitW: Record<string, Weights>,
  startW: Weights
): { path: string[]; score: number } {
  const n = x.length;
  const dp: Weights[] = Array.from({ length: n }, () => ({}));
  const back: Record<string, string | null>[] = Array.from({ length: n }, () => ({}));
  for (const y of labels) {
    dp[0][y] = startW[y] + emitW[y][x[0]];
    back[0][y] = null;
  }
  for (let t = 1; t < n; t++) {
    for (const y of labels) {
      let bestPrev: string | null = null;
      let bestVal = -Infinity;
      for (const yp of labels) {
        const val = dp[t - 1][yp] + transW[yp][y];
        if (val > bestVal) {
          bestVal = val;
          bestPrev = yp;
        }
      }
      dp[t][y] = bestVal + emitW[y][x[t]];
      back[t][y] = bestPrev;
    }
  }

  let last = labels[0];
  for (const y of labels) if (dp[n - 1][y] > dp[n - 1][last]) last = y;
  const bestScore = dp[n - 1][last];
  const path = [last];
  for (let t = n - 1; t > 0; t--) path.push(back[t][path[path.length - 1]]!);
  path.reverse();
  return { path, score: bestScore };
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <limits>
#include <algorithm>

struct CrfResult {
    std::vector<std::string> path;
    double score;
};

CrfResult crfDecode(
    const std::vector<std::string>& x,
    const std::vector<std::string>& labels,
    const std::unordered_map<std::string, std::unordered_map<std::string, double>>& transW,
    const std::unordered_map<std::string, std::unordered_map<std::string, double>>& emitW,
    const std::unordered_map<std::string, double>& startW) {
    int n = static_cast<int>(x.size());
    std::vector<std::unordered_map<std::string, double>> dp(n);
    std::vector<std::unordered_map<std::string, std::string>> back(n);

    for (const auto& y : labels) dp[0][y] = startW.at(y) + emitW.at(y).at(x[0]);
    for (int t = 1; t < n; t++) {
        for (const auto& y : labels) {
            std::string bestPrev;
            double bestVal = -std::numeric_limits<double>::infinity();
            for (const auto& yp : labels) {
                double val = dp[t - 1][yp] + transW.at(yp).at(y);
                if (val > bestVal) {
                    bestVal = val;
                    bestPrev = yp;
                }
            }
            dp[t][y] = bestVal + emitW.at(y).at(x[t]);
            back[t][y] = bestPrev;
        }
    }

    std::string last = labels[0];
    for (const auto& y : labels)
        if (dp[n - 1][y] > dp[n - 1][last]) last = y;
    double bestScore = dp[n - 1][last];
    std::vector<std::string> path = {last};
    for (int t = n - 1; t > 0; t--) path.push_back(back[t][path.back()]);
    std::reverse(path.begin(), path.end());
    return {path, bestScore};
}
```

```rust
use std::collections::HashMap;

fn crf_decode(
    x: &[&str],
    labels: &[&str],
    trans_w: &HashMap<&str, HashMap<&str, f64>>,
    emit_w: &HashMap<&str, HashMap<&str, f64>>,
    start_w: &HashMap<&str, f64>,
) -> (Vec<String>, f64) {
    let n = x.len();
    let mut dp: Vec<HashMap<&str, f64>> = vec![HashMap::new(); n];
    let mut back: Vec<HashMap<&str, Option<&str>>> = vec![HashMap::new(); n];

    for &y in labels {
        dp[0].insert(y, start_w[y] + emit_w[y][x[0]]);
        back[0].insert(y, None);
    }
    for t in 1..n {
        for &y in labels {
            let mut best_prev: Option<&str> = None;
            let mut best_val = f64::NEG_INFINITY;
            for &yp in labels {
                let val = dp[t - 1][yp] + trans_w[yp][y];
                if val > best_val {
                    best_val = val;
                    best_prev = Some(yp);
                }
            }
            dp[t].insert(y, best_val + emit_w[y][x[t]]);
            back[t].insert(y, best_prev);
        }
    }

    let last = *labels.iter().max_by(|&&a, &&b| dp[n - 1][a].partial_cmp(&dp[n - 1][b]).unwrap()).unwrap();
    let best_score = dp[n - 1][last];
    let mut path = vec![last.to_string()];
    let mut cur = last;
    for t in (1..n).rev() {
        cur = back[t][cur].unwrap();
        path.push(cur.to_string());
    }
    path.reverse();
    (path, best_score)
}
```

```csharp
static (List<string> Path, double Score) CrfDecode(
    List<string> x, List<string> labels,
    Dictionary<string, Dictionary<string, double>> transW,
    Dictionary<string, Dictionary<string, double>> emitW,
    Dictionary<string, double> startW)
{
    int n = x.Count;
    var dp = new List<Dictionary<string, double>>();
    var back = new List<Dictionary<string, string?>>();
    for (int t = 0; t < n; t++) { dp.Add(new Dictionary<string, double>()); back.Add(new Dictionary<string, string?>()); }

    foreach (var y in labels) { dp[0][y] = startW[y] + emitW[y][x[0]]; back[0][y] = null; }
    for (int t = 1; t < n; t++)
    {
        foreach (var y in labels)
        {
            string? bestPrev = null; double bestVal = double.NegativeInfinity;
            foreach (var yp in labels)
            {
                double val = dp[t - 1][yp] + transW[yp][y];
                if (val > bestVal) { bestVal = val; bestPrev = yp; }
            }
            dp[t][y] = bestVal + emitW[y][x[t]];
            back[t][y] = bestPrev;
        }
    }

    string last = labels[0];
    foreach (var y in labels) if (dp[n - 1][y] > dp[n - 1][last]) last = y;
    double bestScore = dp[n - 1][last];
    var path = new List<string> { last };
    for (int t = n - 1; t > 0; t--) path.Add(back[t][path[^1]]!);
    path.Reverse();
    return (path, bestScore);
}
```
