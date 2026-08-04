---
name: 拡張カルマンフィルタ(EKF)
category: 制御・ロボティクス
subcategory: 状態推定
complexity: O(n³)(nは状態変数の次元数、共分散行列の更新に伴う行列演算)
summary: "[カルマンフィルタ](/algorithms/kalman-filter)が線形なシステムにしか適用できないのに対し、非線形なシステムの各時刻での動きを局所的に線形近似(ヤコビ行列による1次テイラー展開)することで、実世界の多くの非線形なロボット・センサーシステムにも同じ枠組みを適用できるようにした拡張版。"
---

## 概要

[カルマンフィルタ](/algorithms/kalman-filter)は、状態の変化とセンサーの観測がどちらも線形な関数で表される場合に、ノイズを含む観測から真の状態を最適に推定する強力な手法だが、現実のロボットの動き(回転を伴う運動など)やセンサーの観測モデル(距離センサーが角度と距離で観測するなど)の多くは本質的に非線形である。拡張カルマンフィルタ(EKF)は、この制約を乗り越えるための最も広く使われる拡張であり、非線形な状態遷移・観測モデルを、現在の推定値の周りで[多変数ニュートン法](/algorithms/multivariate-newton-method)と同じ考え方——ヤコビ行列(偏微分の行列)による1次のテイラー展開——を使って局所的に線形近似することで、通常のカルマンフィルタの数式をほぼそのまま適用できるようにする。

## 仕組み

1. 非線形な状態遷移関数`x_k = f(x_{k-1}, u_k) + プロセスノイズ`と、非線形な観測関数`z_k = h(x_k) + 観測ノイズ`が与えられているとする(`f`はロボットの運動モデル、`h`はセンサーの観測モデル)
2. **予測ステップ**: 現在の状態推定値`x̂_{k-1}`を非線形関数`f`にそのまま代入して次の状態を予測する(`x̂_k⁻ = f(x̂_{k-1}, u_k)`)。共分散(推定の不確かさ)の伝播には、`f`を現在の推定値の周りで線形近似したヤコビ行列`F_k = ∂f/∂x`を使い、通常の[カルマンフィルタ](/algorithms/kalman-filter)と同じ形の共分散更新式(`P_k⁻ = F_k P_{k-1} F_kᵀ + Q`)を適用する
3. **更新ステップ**: 実際の観測値`z_k`が得られたら、観測関数`h`もヤコビ行列`H_k = ∂h/∂x`によって局所的に線形近似する。予測した観測値`h(x̂_k⁻)`と実際の観測値の差(残差)に、カルマンゲイン(観測をどれだけ信頼するかを表す重み)を掛けて状態推定値を補正する
4. カルマンゲイン自体も、線形近似された`H_k`を使って通常のカルマンフィルタと同じ数式で計算する
5. この「非線形関数をそのまま状態の予測・観測に使い、共分散の伝播にはヤコビ行列による線形近似を使う」という組み合わせを、時刻ステップごとに繰り返す

## 特性・トレードオフ

- **計算量**: 状態の次元数`n`に対して共分散行列の更新が`O(n³)`——[カルマンフィルタ](/algorithms/kalman-filter)と同じオーダーだが、各時刻でヤコビ行列を計算し直す分だけ定数倍のコストが増える
- **局所線形近似という前提の限界**: EKFは、現在の推定値の周りで非線形関数を1次までのテイラー展開で近似するため、非線形性が強い(推定誤差が大きい、あるいは関数の曲率が急な)状況では、この近似誤差が推定精度を大きく損ない、最悪の場合発散することがある——線形カルマンフィルタが持つ「最適性の理論的保証」は、EKFでは近似の分だけ失われている
- **[粒子フィルタ](/algorithms/particle-filter)との対比**: [粒子フィルタ](/algorithms/particle-filter)は多数のサンプル(粒子)によって任意の非線形性・非ガウス性をモンテカルロ的に扱えるが計算コストが高い。EKFはヤコビ行列による線形近似という妥協と引き換えに、粒子フィルタよりずっと軽い計算量で非線形システムに対応できる——「近似の精度」と「計算コスト」のトレードオフにおいて中間的な位置を占める
- **より高精度な代替手法(アンセンテッドカルマンフィルタ)**: ヤコビ行列による1次近似では精度が不十分な場合、シグマ点と呼ばれる代表的な点をいくつか選んで非線形変換を直接適用する「アンセンテッドカルマンフィルタ(UKF)」が、ヤコビ行列の計算(解析的な微分の導出)を避けつつEKFより高い精度を実現する発展形として使われることがある
- **使いどころ**: 自動運転車・ドローンの自己位置推定(GPS・IMU・カメラなどの非線形な観測モデルを統合するセンサーフュージョン)、ロボットの[SLAM(自己位置推定と地図構築の同時実行)](/algorithms/particle-filter)、航空機・ミサイルの誘導システムにおける状態推定、[カルマンフィルタ](/algorithms/kalman-filter)が適用できない非線形な運動・観測モデルを持つあらゆる推定問題

## 実装例

2次元位置`(px, py)`を、原点からの距離(レンジ)だけを観測する非線形センサーで追跡する最小のEKF。観測関数`h(x) = sqrt(px²+py²)`は非線形なので、そのヤコビ行列`H = [px/r, py/r]`を使って共分散を更新する。

```python
import math

def h(x: list[float]) -> float:
    return math.sqrt(x[0] ** 2 + x[1] ** 2)


def jacobian_h(x: list[float]) -> list[float]:
    r = math.sqrt(x[0] ** 2 + x[1] ** 2)
    if r < 1e-9:
        return [0.0, 0.0]
    return [x[0] / r, x[1] / r]


def ekf_step(
    x: list[float], p: list[list[float]], z: float, q: float, r_noise: float
) -> tuple[list[float], list[list[float]]]:
    # 予測ステップ(静止モデル: F = 単位行列)
    x_pred = x[:]
    p_pred = [[p[0][0] + q, p[0][1]], [p[1][0], p[1][1] + q]]

    # 更新ステップ(観測モデル h をヤコビ行列で線形近似)
    hj = jacobian_h(x_pred)
    y = z - h(x_pred)  # 残差

    hp = [hj[0] * p_pred[0][0] + hj[1] * p_pred[1][0], hj[0] * p_pred[0][1] + hj[1] * p_pred[1][1]]
    s = hp[0] * hj[0] + hp[1] * hj[1] + r_noise  # 残差の共分散(スカラー)

    pht = [p_pred[0][0] * hj[0] + p_pred[0][1] * hj[1], p_pred[1][0] * hj[0] + p_pred[1][1] * hj[1]]
    k = [pht[0] / s, pht[1] / s]  # カルマンゲイン

    x_new = [x_pred[0] + k[0] * y, x_pred[1] + k[1] * y]

    kh = [[k[0] * hj[0], k[0] * hj[1]], [k[1] * hj[0], k[1] * hj[1]]]
    i_kh = [[1 - kh[0][0], -kh[0][1]], [-kh[1][0], 1 - kh[1][1]]]
    p_new = [
        [
            i_kh[0][0] * p_pred[0][0] + i_kh[0][1] * p_pred[1][0],
            i_kh[0][0] * p_pred[0][1] + i_kh[0][1] * p_pred[1][1],
        ],
        [
            i_kh[1][0] * p_pred[0][0] + i_kh[1][1] * p_pred[1][0],
            i_kh[1][0] * p_pred[0][1] + i_kh[1][1] * p_pred[1][1],
        ],
    ]
    return x_new, p_new
```

```typescript
function h(x: [number, number]): number {
  return Math.sqrt(x[0] * x[0] + x[1] * x[1]);
}

function jacobianH(x: [number, number]): [number, number] {
  const r = Math.sqrt(x[0] * x[0] + x[1] * x[1]);
  if (r < 1e-9) return [0, 0];
  return [x[0] / r, x[1] / r];
}

function ekfStep(
  x: [number, number],
  p: number[][],
  z: number,
  q: number,
  rNoise: number
): [[number, number], number[][]] {
  const xPred: [number, number] = [x[0], x[1]];
  const pPred = [
    [p[0][0] + q, p[0][1]],
    [p[1][0], p[1][1] + q],
  ];

  const hj = jacobianH(xPred);
  const y = z - h(xPred);

  const hp = [hj[0] * pPred[0][0] + hj[1] * pPred[1][0], hj[0] * pPred[0][1] + hj[1] * pPred[1][1]];
  const s = hp[0] * hj[0] + hp[1] * hj[1] + rNoise;

  const pht = [pPred[0][0] * hj[0] + pPred[0][1] * hj[1], pPred[1][0] * hj[0] + pPred[1][1] * hj[1]];
  const k = [pht[0] / s, pht[1] / s];

  const xNew: [number, number] = [xPred[0] + k[0] * y, xPred[1] + k[1] * y];

  const kh = [
    [k[0] * hj[0], k[0] * hj[1]],
    [k[1] * hj[0], k[1] * hj[1]],
  ];
  const iKh = [
    [1 - kh[0][0], -kh[0][1]],
    [-kh[1][0], 1 - kh[1][1]],
  ];
  const pNew = [
    [iKh[0][0] * pPred[0][0] + iKh[0][1] * pPred[1][0], iKh[0][0] * pPred[0][1] + iKh[0][1] * pPred[1][1]],
    [iKh[1][0] * pPred[0][0] + iKh[1][1] * pPred[1][0], iKh[1][0] * pPred[0][1] + iKh[1][1] * pPred[1][1]],
  ];
  return [xNew, pNew];
}
```

```cpp
#include <array>
#include <cmath>

double h(const std::array<double, 2>& x) {
    return std::sqrt(x[0] * x[0] + x[1] * x[1]);
}

std::array<double, 2> jacobianH(const std::array<double, 2>& x) {
    double r = std::sqrt(x[0] * x[0] + x[1] * x[1]);
    if (r < 1e-9) return {0.0, 0.0};
    return {x[0] / r, x[1] / r};
}

void ekfStep(std::array<double, 2>& x, std::array<std::array<double, 2>, 2>& p,
             double z, double q, double rNoise) {
    std::array<double, 2> xPred = x;
    std::array<std::array<double, 2>, 2> pPred = {{
        {p[0][0] + q, p[0][1]},
        {p[1][0], p[1][1] + q},
    }};

    auto hj = jacobianH(xPred);
    double y = z - h(xPred);

    std::array<double, 2> hp = {
        hj[0] * pPred[0][0] + hj[1] * pPred[1][0],
        hj[0] * pPred[0][1] + hj[1] * pPred[1][1],
    };
    double s = hp[0] * hj[0] + hp[1] * hj[1] + rNoise;

    std::array<double, 2> pht = {
        pPred[0][0] * hj[0] + pPred[0][1] * hj[1],
        pPred[1][0] * hj[0] + pPred[1][1] * hj[1],
    };
    std::array<double, 2> k = {pht[0] / s, pht[1] / s};

    x = {xPred[0] + k[0] * y, xPred[1] + k[1] * y};

    std::array<std::array<double, 2>, 2> kh = {{
        {k[0] * hj[0], k[0] * hj[1]},
        {k[1] * hj[0], k[1] * hj[1]},
    }};
    std::array<std::array<double, 2>, 2> iKh = {{
        {1 - kh[0][0], -kh[0][1]},
        {-kh[1][0], 1 - kh[1][1]},
    }};
    p = {{
        {iKh[0][0] * pPred[0][0] + iKh[0][1] * pPred[1][0], iKh[0][0] * pPred[0][1] + iKh[0][1] * pPred[1][1]},
        {iKh[1][0] * pPred[0][0] + iKh[1][1] * pPred[1][0], iKh[1][0] * pPred[0][1] + iKh[1][1] * pPred[1][1]},
    }};
}
```

```rust
fn h(x: [f64; 2]) -> f64 {
    (x[0] * x[0] + x[1] * x[1]).sqrt()
}

fn jacobian_h(x: [f64; 2]) -> [f64; 2] {
    let r = (x[0] * x[0] + x[1] * x[1]).sqrt();
    if r < 1e-9 {
        return [0.0, 0.0];
    }
    [x[0] / r, x[1] / r]
}

fn ekf_step(x: [f64; 2], p: [[f64; 2]; 2], z: f64, q: f64, r_noise: f64) -> ([f64; 2], [[f64; 2]; 2]) {
    let x_pred = x;
    let p_pred = [[p[0][0] + q, p[0][1]], [p[1][0], p[1][1] + q]];

    let hj = jacobian_h(x_pred);
    let y = z - h(x_pred);

    let hp = [
        hj[0] * p_pred[0][0] + hj[1] * p_pred[1][0],
        hj[0] * p_pred[0][1] + hj[1] * p_pred[1][1],
    ];
    let s = hp[0] * hj[0] + hp[1] * hj[1] + r_noise;

    let pht = [
        p_pred[0][0] * hj[0] + p_pred[0][1] * hj[1],
        p_pred[1][0] * hj[0] + p_pred[1][1] * hj[1],
    ];
    let k = [pht[0] / s, pht[1] / s];

    let x_new = [x_pred[0] + k[0] * y, x_pred[1] + k[1] * y];

    let kh = [[k[0] * hj[0], k[0] * hj[1]], [k[1] * hj[0], k[1] * hj[1]]];
    let i_kh = [[1.0 - kh[0][0], -kh[0][1]], [-kh[1][0], 1.0 - kh[1][1]]];
    let p_new = [
        [
            i_kh[0][0] * p_pred[0][0] + i_kh[0][1] * p_pred[1][0],
            i_kh[0][0] * p_pred[0][1] + i_kh[0][1] * p_pred[1][1],
        ],
        [
            i_kh[1][0] * p_pred[0][0] + i_kh[1][1] * p_pred[1][0],
            i_kh[1][0] * p_pred[0][1] + i_kh[1][1] * p_pred[1][1],
        ],
    ];
    (x_new, p_new)
}
```

```csharp
static double H(double[] x) => Math.Sqrt(x[0] * x[0] + x[1] * x[1]);

static double[] JacobianH(double[] x)
{
    double r = Math.Sqrt(x[0] * x[0] + x[1] * x[1]);
    if (r < 1e-9) return new double[] { 0, 0 };
    return new double[] { x[0] / r, x[1] / r };
}

static (double[] x, double[][] P) EkfStep(double[] x, double[][] p, double z, double q, double rNoise)
{
    var xPred = new double[] { x[0], x[1] };
    var pPred = new double[][]
    {
        new double[] { p[0][0] + q, p[0][1] },
        new double[] { p[1][0], p[1][1] + q },
    };

    var hj = JacobianH(xPred);
    double y = z - H(xPred);

    var hp = new double[] { hj[0] * pPred[0][0] + hj[1] * pPred[1][0], hj[0] * pPred[0][1] + hj[1] * pPred[1][1] };
    double s = hp[0] * hj[0] + hp[1] * hj[1] + rNoise;

    var pht = new double[] { pPred[0][0] * hj[0] + pPred[0][1] * hj[1], pPred[1][0] * hj[0] + pPred[1][1] * hj[1] };
    var k = new double[] { pht[0] / s, pht[1] / s };

    var xNew = new double[] { xPred[0] + k[0] * y, xPred[1] + k[1] * y };

    var kh = new double[][]
    {
        new double[] { k[0] * hj[0], k[0] * hj[1] },
        new double[] { k[1] * hj[0], k[1] * hj[1] },
    };
    var iKh = new double[][]
    {
        new double[] { 1 - kh[0][0], -kh[0][1] },
        new double[] { -kh[1][0], 1 - kh[1][1] },
    };
    var pNew = new double[][]
    {
        new double[]
        {
            iKh[0][0] * pPred[0][0] + iKh[0][1] * pPred[1][0],
            iKh[0][0] * pPred[0][1] + iKh[0][1] * pPred[1][1],
        },
        new double[]
        {
            iKh[1][0] * pPred[0][0] + iKh[1][1] * pPred[1][0],
            iKh[1][0] * pPred[0][1] + iKh[1][1] * pPred[1][1],
        },
    };
    return (xNew, pNew);
}
```
