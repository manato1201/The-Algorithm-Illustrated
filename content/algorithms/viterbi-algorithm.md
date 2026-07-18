---
name: ビタビアルゴリズム
category: 自然言語処理
subcategory: 系列ラベリング・構文解析
complexity: O(n × k²)(n系列長、k状態数)
summary: 隠れマルコフモデルにおいて、観測系列全体に対して最も確率が高い隠れ状態の系列を、動的計画法で効率的に発見するアルゴリズム。
---

## 概要

「I can fish」という文の"can"は助動詞か名詞か、"fish"は動詞か名詞か——単語の品詞のような「隠れた」情報は、文脈全体を見て初めて確定できることが多い。こうした問題は、観測できる系列(単語の並び)の背後に、直接は見えない状態の系列(品詞の並び)があるとみなす隠れマルコフモデル(HMM)として定式化できる。1967年にアンドリュー・ビタビが考案したビタビアルゴリズムは、あり得る全ての状態系列を総当たりで試す(状態数の系列長乗という指数的な組み合わせ)代わりに、[動的計画法](/algorithms/lcs)の考え方を使って、観測系列全体に対して最も尤もらしい隠れ状態系列をわずか多項式時間で発見する。

## 仕組み

1. 隠れマルコフモデルは、各時刻での「状態遷移確率」(ある品詞の次にどの品詞が来やすいか)と「出力確率」(その品詞のときにどの単語が観測されやすいか)で定義される
2. `dp[t][s]`を「時刻`t`で状態`s`にいて、そこまでの観測系列を説明する経路の中で最も高い確率」と定義する
3. 初期状態の確率と出力確率から`dp[1][s]`を全ての状態`s`について初期化する
4. 時刻`t`の`dp[t][s]`は、1つ前の時刻の全ての状態`s'`からの遷移を考え、`dp[t][s] = max_s'(dp[t-1][s'] × 遷移確率(s'→s)) × 出力確率(s, 観測t)`という漸化式で計算する——ここで「その時刻までの最良経路」だけを保持し、劣った経路を打ち切ることで、指数的な組み合わせ爆発を避けている
5. 各`dp[t][s]`を計算する際、どの`s'`から遷移してきたときに最大値になったかも記録しておく(バックポインタ)
6. 最終時刻で最大の`dp[n][s]`を持つ状態から、バックポインタを逆にたどることで、確率最大の状態系列全体を復元する

## 特性・トレードオフ

- **計算量**: 系列長`n`、状態数`k`に対して`O(n × k²)`(各時刻で全状態対の遷移を調べるため)。全状態系列を総当たりする`O(k^n)`と比べると劇的に高速で、実用上どんな長さの系列でも現実的な時間で解ける
- **[LCS](/algorithms/lcs)等の他のDPアルゴリズムとの構造的な類似性**: 「1つ前の時点での最良の部分解から、現在の最良解を組み立てる」という骨格は他の動的計画法と共通しており、テーブルの意味づけ(ここでは「時刻×状態」のグリッド)が異なるだけである
- **最尤推定であり真の分布の完全な把握ではない**: ビタビアルゴリズムが返すのは「最も確率が高い1つの系列」であり、次善の系列や状態の周辺確率分布を知りたい場合は、[前向き・後ろ向きアルゴリズム](/algorithms/forward-backward-algorithm)のような別のアルゴリズムが必要になる
- **使いどころ**: 品詞タグ付け(POS tagging)、音声認識における音素列から単語列への復号、生物学的配列の遺伝子領域予測、通信工学における畳み込み符号の誤り訂正復号(元々ビタビが考案した応用分野)

## 実装例

```python
def viterbi(
    obs: list[str],
    states: list[str],
    start_p: dict[str, float],
    trans_p: dict[str, dict[str, float]],
    emit_p: dict[str, dict[str, float]],
) -> tuple[list[str], float]:
    n = len(obs)
    dp: list[dict[str, float]] = [{} for _ in range(n)]
    back: list[dict[str, str | None]] = [{} for _ in range(n)]
    for s in states:
        dp[0][s] = start_p[s] * emit_p[s][obs[0]]
        back[0][s] = None
    for t in range(1, n):
        for s in states:
            best_prev, best_val = None, -1.0
            for sp in states:
                val = dp[t - 1][sp] * trans_p[sp][s]
                if val > best_val:
                    best_val, best_prev = val, sp
            dp[t][s] = best_val * emit_p[s][obs[t]]
            back[t][s] = best_prev

    last = max(states, key=lambda s: dp[n - 1][s])
    best_prob = dp[n - 1][last]
    path = [last]
    for t in range(n - 1, 0, -1):
        path.append(back[t][path[-1]])
    path.reverse()
    return path, best_prob


# 例: 「健康」「発熱」の2状態、「普通・寒気・めまい」の3観測(Wikipediaの古典例)
states = ["Healthy", "Fever"]
start_p = {"Healthy": 0.6, "Fever": 0.4}
trans_p = {
    "Healthy": {"Healthy": 0.7, "Fever": 0.3},
    "Fever": {"Healthy": 0.4, "Fever": 0.6},
}
emit_p = {
    "Healthy": {"normal": 0.5, "cold": 0.4, "dizzy": 0.1},
    "Fever": {"normal": 0.1, "cold": 0.3, "dizzy": 0.6},
}
```

```typescript
type Probs = Record<string, number>;

function viterbi(
  obs: string[],
  states: string[],
  startP: Probs,
  transP: Record<string, Probs>,
  emitP: Record<string, Probs>
): { path: string[]; prob: number } {
  const n = obs.length;
  const dp: Probs[] = Array.from({ length: n }, () => ({}));
  const back: Record<string, string | null>[] = Array.from({ length: n }, () => ({}));
  for (const s of states) {
    dp[0][s] = startP[s] * emitP[s][obs[0]];
    back[0][s] = null;
  }
  for (let t = 1; t < n; t++) {
    for (const s of states) {
      let bestPrev: string | null = null;
      let bestVal = -1;
      for (const sp of states) {
        const val = dp[t - 1][sp] * transP[sp][s];
        if (val > bestVal) {
          bestVal = val;
          bestPrev = sp;
        }
      }
      dp[t][s] = bestVal * emitP[s][obs[t]];
      back[t][s] = bestPrev;
    }
  }

  let last = states[0];
  for (const s of states) if (dp[n - 1][s] > dp[n - 1][last]) last = s;
  const bestProb = dp[n - 1][last];
  const path = [last];
  for (let t = n - 1; t > 0; t--) path.push(back[t][path[path.length - 1]]!);
  path.reverse();
  return { path, prob: bestProb };
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <optional>

struct ViterbiResult {
    std::vector<std::string> path;
    double prob;
};

ViterbiResult viterbi(
    const std::vector<std::string>& obs,
    const std::vector<std::string>& states,
    const std::unordered_map<std::string, double>& startP,
    const std::unordered_map<std::string, std::unordered_map<std::string, double>>& transP,
    const std::unordered_map<std::string, std::unordered_map<std::string, double>>& emitP) {
    int n = static_cast<int>(obs.size());
    std::vector<std::unordered_map<std::string, double>> dp(n);
    std::vector<std::unordered_map<std::string, std::string>> back(n);

    for (const auto& s : states) {
        dp[0][s] = startP.at(s) * emitP.at(s).at(obs[0]);
    }
    for (int t = 1; t < n; t++) {
        for (const auto& s : states) {
            std::string bestPrev;
            double bestVal = -1.0;
            for (const auto& sp : states) {
                double val = dp[t - 1][sp] * transP.at(sp).at(s);
                if (val > bestVal) {
                    bestVal = val;
                    bestPrev = sp;
                }
            }
            dp[t][s] = bestVal * emitP.at(s).at(obs[t]);
            back[t][s] = bestPrev;
        }
    }

    std::string last = states[0];
    for (const auto& s : states)
        if (dp[n - 1][s] > dp[n - 1][last]) last = s;
    double bestProb = dp[n - 1][last];
    std::vector<std::string> path = {last};
    for (int t = n - 1; t > 0; t--) path.push_back(back[t][path.back()]);
    std::reverse(path.begin(), path.end());
    return {path, bestProb};
}
```

```rust
use std::collections::HashMap;

fn viterbi(
    obs: &[&str],
    states: &[&str],
    start_p: &HashMap<&str, f64>,
    trans_p: &HashMap<&str, HashMap<&str, f64>>,
    emit_p: &HashMap<&str, HashMap<&str, f64>>,
) -> (Vec<String>, f64) {
    let n = obs.len();
    let mut dp: Vec<HashMap<&str, f64>> = vec![HashMap::new(); n];
    let mut back: Vec<HashMap<&str, Option<&str>>> = vec![HashMap::new(); n];

    for &s in states {
        dp[0].insert(s, start_p[s] * emit_p[s][obs[0]]);
        back[0].insert(s, None);
    }
    for t in 1..n {
        for &s in states {
            let mut best_prev: Option<&str> = None;
            let mut best_val = -1.0;
            for &sp in states {
                let val = dp[t - 1][sp] * trans_p[sp][s];
                if val > best_val {
                    best_val = val;
                    best_prev = Some(sp);
                }
            }
            dp[t].insert(s, best_val * emit_p[s][obs[t]]);
            back[t].insert(s, best_prev);
        }
    }

    let last = *states.iter().max_by(|&&a, &&b| dp[n - 1][a].partial_cmp(&dp[n - 1][b]).unwrap()).unwrap();
    let best_prob = dp[n - 1][last];
    let mut path = vec![last.to_string()];
    let mut cur = last;
    for t in (1..n).rev() {
        cur = back[t][cur].unwrap();
        path.push(cur.to_string());
    }
    path.reverse();
    (path, best_prob)
}
```

```csharp
static (List<string> Path, double Prob) Viterbi(
    List<string> obs, List<string> states,
    Dictionary<string, double> startP,
    Dictionary<string, Dictionary<string, double>> transP,
    Dictionary<string, Dictionary<string, double>> emitP)
{
    int n = obs.Count;
    var dp = new List<Dictionary<string, double>>();
    var back = new List<Dictionary<string, string?>>();
    for (int t = 0; t < n; t++) { dp.Add(new Dictionary<string, double>()); back.Add(new Dictionary<string, string?>()); }

    foreach (var s in states) { dp[0][s] = startP[s] * emitP[s][obs[0]]; back[0][s] = null; }
    for (int t = 1; t < n; t++)
    {
        foreach (var s in states)
        {
            string? bestPrev = null; double bestVal = -1;
            foreach (var sp in states)
            {
                double val = dp[t - 1][sp] * transP[sp][s];
                if (val > bestVal) { bestVal = val; bestPrev = sp; }
            }
            dp[t][s] = bestVal * emitP[s][obs[t]];
            back[t][s] = bestPrev;
        }
    }

    string last = states[0];
    foreach (var s in states) if (dp[n - 1][s] > dp[n - 1][last]) last = s;
    double bestProb = dp[n - 1][last];
    var path = new List<string> { last };
    for (int t = n - 1; t > 0; t--) path.Add(back[t][path[^1]]!);
    path.Reverse();
    return (path, bestProb);
}
```
