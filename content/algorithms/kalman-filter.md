---
name: カルマンフィルタ
category: 制御・ロボティクス
subcategory: 状態推定
complexity: O(1)(状態次元が固定の場合、1ステップあたり)
summary: ノイズを含む観測値と、システムの動きの予測モデルを、それぞれの不確実性の大きさに応じて最適な比率で融合し、真の状態を逐次的に推定し続けるアルゴリズム。
---

## 概要

GPSの位置情報にはノイズが乗り、加速度センサーの読み取りにも誤差が含まれる——実世界のセンサーは完璧ではない。1960年にルドルフ・カルマンが発表したカルマンフィルタは、「センサーの観測値」と「システムの動きに関する予測モデル」という、どちらも不確実性を含む2つの情報源を、それぞれの信頼度(分散)に応じた最適な重み付けで統合することで、単独のどちらよりも精度の高い状態推定を実現する。アポロ計画の宇宙船の航法システムに採用されたことで広く知られるようになり、以来、ロボット工学から金融工学まで極めて幅広い分野で使われ続けている。

## 仕組み

1. システムの状態(位置・速度など)を確率分布(平均と分散、多次元なら共分散行列)として表現する
2. **予測ステップ**: システムの動きのモデル(「次の瞬間、物体は現在の速度でおおよそこの位置に移動するはずだ」)を使って、次の時刻の状態を予測する。この予測には必ず不確実性(プロセスノイズ)が加わるため、予測の分散は少し大きくなる
3. **更新(補正)ステップ**: 新しい観測値(センサーの読み取り)が得られたら、予測値と観測値を、それぞれの不確実性の大きさに応じた重み(**カルマンゲイン**)で統合する。カルマンゲインは、予測の不確実性が観測の不確実性より大きければ観測値を重視し、逆なら予測値を重視するように、統計的に最適な比率を自動的に計算する
4. 統合された結果(新しい平均と分散)が、その時点での最良の状態推定になる。この分散は、2つの情報源を組み合わせたことで、どちらか単独よりも小さく(=より確信を持って)なる
5. 次の時刻でまた1〜4を繰り返す——予測と補正を交互に繰り返す、極めて軽量な逐次推定の仕組みになっている

## 特性・トレードオフ

- **計算量**: 状態の次元数が固定であれば、各ステップの計算(行列の掛け算・[ガウスの消去法](/algorithms/gaussian-elimination)に近い逆行列計算)は一定のコストで済むため、実質`O(1)`(状態の次元に対しては多項式時間)。過去の全観測を保持する必要がなく、直前の推定値だけを使って更新できるメモリ効率の良さも大きな利点
- **線形性とガウス分布の仮定**: 標準的なカルマンフィルタは、システムの動きが線形であり、ノイズがガウス分布(正規分布)に従うことを仮定した上で、その条件下で数学的に最適な推定量であることが証明されている。非線形なシステムには、モデルを局所的に線形近似する拡張カルマンフィルタ(EKF)や、確率分布をサンプル点の集合で表現する[パーティクルフィルタ](/algorithms/particle-filter)のような発展形が必要になる
- **信頼度の自動的な重み付け**: センサーの精度が悪化した(ノイズが増えた)状況でも、カルマンゲインの計算に組み込まれた不確実性の情報が自動的に観測値への依存度を下げ、予測モデルにより重きを置くよう調整される——この自己適応的な重み付けが、単純な平均化とは異なるカルマンフィルタの数学的な強さの源泉になっている
- **使いどころ**: GPS・慣性センサーを組み合わせたロボット・ドローン・自動運転車の自己位置推定(センサーフュージョン)、宇宙船の航法システム、金融時系列データのノイズ除去とトレンド推定、[Lucas-Kanade法](/algorithms/lucas-kanade-optical-flow)による物体追跡結果の平滑化

## 実装例

```python
def kalman_1d(
    measurements: list[float],
    x0: float,
    p0: float,
    process_var: float,
    meas_var: float,
) -> list[float]:
    """1次元スカラーカルマンフィルタ(静止量を観測するモデル)。各観測後の推定値を返す。"""
    x, p = x0, p0
    estimates = []
    for z in measurements:
        # 予測ステップ(静止モデルなので状態自体は変化せず、不確実性だけ増える)
        x_pred = x
        p_pred = p + process_var
        # 更新ステップ(カルマンゲインで予測と観測を融合)
        k = p_pred / (p_pred + meas_var)
        x = x_pred + k * (z - x_pred)
        p = (1 - k) * p_pred
        estimates.append(x)
    return estimates
```

```typescript
function kalman1D(
  measurements: number[],
  x0: number,
  p0: number,
  processVar: number,
  measVar: number
): number[] {
  let x = x0;
  let p = p0;
  const estimates: number[] = [];
  for (const z of measurements) {
    // 予測ステップ(静止モデルなので状態自体は変化せず、不確実性だけ増える)
    const xPred = x;
    const pPred = p + processVar;
    // 更新ステップ(カルマンゲインで予測と観測を融合)
    const k = pPred / (pPred + measVar);
    x = xPred + k * (z - xPred);
    p = (1 - k) * pPred;
    estimates.push(x);
  }
  return estimates;
}
```

```cpp
#include <vector>

std::vector<double> kalman1D(
    const std::vector<double>& measurements,
    double x0, double p0, double processVar, double measVar) {
    double x = x0, p = p0;
    std::vector<double> estimates;
    estimates.reserve(measurements.size());
    for (double z : measurements) {
        // 予測ステップ
        double xPred = x;
        double pPred = p + processVar;
        // 更新ステップ
        double k = pPred / (pPred + measVar);
        x = xPred + k * (z - xPred);
        p = (1 - k) * pPred;
        estimates.push_back(x);
    }
    return estimates;
}
```

```rust
fn kalman_1d(measurements: &[f64], x0: f64, p0: f64, process_var: f64, meas_var: f64) -> Vec<f64> {
    let mut x = x0;
    let mut p = p0;
    let mut estimates = Vec::with_capacity(measurements.len());
    for &z in measurements {
        // 予測ステップ
        let x_pred = x;
        let p_pred = p + process_var;
        // 更新ステップ
        let k = p_pred / (p_pred + meas_var);
        x = x_pred + k * (z - x_pred);
        p = (1.0 - k) * p_pred;
        estimates.push(x);
    }
    estimates
}
```

```csharp
static List<double> Kalman1D(
    List<double> measurements, double x0, double p0, double processVar, double measVar)
{
    double x = x0, p = p0;
    var estimates = new List<double>();
    foreach (var z in measurements)
    {
        // 予測ステップ
        double xPred = x;
        double pPred = p + processVar;
        // 更新ステップ
        double k = pPred / (pPred + measVar);
        x = xPred + k * (z - xPred);
        p = (1 - k) * pPred;
        estimates.Add(x);
    }
    return estimates;
}
```
