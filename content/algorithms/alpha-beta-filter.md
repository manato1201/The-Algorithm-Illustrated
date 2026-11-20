---
name: α-βフィルタ
category: 制御・ロボティクス
subcategory: 状態推定
complexity: 1ステップ O(1)(位置と速度の2状態の更新)
summary: 位置と速度を予測し、測定との差(残差)の一部だけを2つの固定ゲイン α・β で取り込む、カルマンフィルタを定常状態に固定した単純な追跡フィルタ。
---

## 概要

センサの測定値には雑音が乗る。測定値をそのまま使うと位置がふらつき、速度を差分で求めると雑音が増幅される。かといって、強く平滑化すると遅れが出て、動く対象に追従できない。目標が動く場合は、「いまどこにいるか」だけでなく、「どれくらいの速さで動いているか」も推定して、予測と測定を組み合わせるのがよい。

α-βフィルタは、レーダーによる目標の追跡など、1950〜60年代から使われてきた古典的な手法で、**位置と速度の2つの状態を、固定の2つのゲイン `α`・`β` だけで更新する**。[カルマンフィルタ](/algorithms/kalman-filter)は、状態の不確かさ(共分散)を毎回更新して最適なゲインを計算するが、等速運動と一定の雑音を仮定すれば、ゲインは定常状態では一定の値に落ち着く。その値をあらかじめ決めておけば、行列計算なしで、ほとんど同じ追跡ができる。小さなマイコンでも動く軽さが利点である(`g-h` フィルタとも呼ばれる)。

## 仕組み

推定する状態は、位置 `x̂` と速度 `v̂`。測定は位置 `z` だけ。時間間隔を `Δt` とする。

1. **予測**: 前の推定値から、等速運動を仮定して次の位置を予測する
   `x̂⁻ = x̂ + v̂ · Δt`(速度は変わらないと仮定: `v̂⁻ = v̂`)
2. **残差**: 測定値と予測の差 `r = z − x̂⁻`
3. **更新**: 残差の一部を取り込んで、位置と速度を補正する
   `x̂ = x̂⁻ + α · r`
   `v̂ = v̂⁻ + (β / Δt) · r`
4. 次の測定が来るたびに1〜3を繰り返す

`α` は位置を測定にどれだけ寄せるか(0なら予測だけを信じ、1なら測定をそのまま採用)、`β` は速度の補正の強さ。測定の雑音が大きければ小さく、目標の動きが急に変わるなら大きくする。安定のためには `0 < α < 1`、`0 < β < 2`、`0 < 4 − 2α − β` の条件を満たす必要がある(Δt を単位時間として)。`β` を `α` から決める定番の関係(`β = α² / (2 − α)`、Benedict–Bordner の条件など)もある。

## 特性・トレードオフ

- **単純で軽い**: 乗算と加算が数回だけ。行列も共分散も持たない
- **ゲインが固定**: 起動直後や、雑音の大きさが変わる状況で、最適なゲインは変わる。カルマンフィルタは自動で調整するが、α-βは調整済みの値で固定する(最初は大きめのゲインから始めて、下げていく方法もある)
- **等速運動が前提**: 加速する対象では、速度の推定が遅れて定常的な誤差が出る。加速度まで推定する `α-β-γ` フィルタが拡張として使われる
- **チューニングが要る**: `α`・`β` の選び方で、雑音の抑え方と追従の速さのバランスが決まる。この2つにはトレードオフがある(雑音を抑えると、急な動きへの遅れが大きくなる)
- **使いどころ**: レーダー・ソナーの目標追跡、マイコンでの速度推定(エンコーダの位置から)、ゲームやUIのスムージング、センサの簡易な平滑化

## 実装例

```python
import random


def alpha_beta_filter(measurements, dt=1.0, alpha=0.5, beta=0.2, x0=0.0, v0=0.0):
    x, v = x0, v0
    estimates = []
    for z in measurements:
        x_pred = x + v * dt            # 等速運動で予測
        r = z - x_pred                 # 残差
        x = x_pred + alpha * r         # 位置の補正
        v = v + (beta / dt) * r        # 速度の補正
        estimates.append(x)
    return estimates, v


rng = random.Random(0)
truth = [2.0 * k for k in range(60)]                 # 速度 2 で等速運動する対象
noisy = [t + rng.gauss(0, 3.0) for t in truth]       # 標準偏差 3 の測定雑音
est, v = alpha_beta_filter(noisy)


def rms(a, b):
    return (sum((p - q) ** 2 for p, q in zip(a, b)) / len(a)) ** 0.5


print("測定の誤差:", round(rms(noisy, truth), 2))          # 約3
print("推定の誤差:", round(rms(est[10:], truth[10:]), 2))  # 測定より小さい
print("推定した速度:", round(v, 2))                         # 2 付近(雑音に応じて揺れる。実行ごとの値は固定シードで決まる)
```

```typescript
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function alphaBetaFilter(
  zs: number[],
  dt = 1,
  alpha = 0.5,
  beta = 0.2,
): { estimates: number[]; velocity: number } {
  let x = 0;
  let v = 0;
  const estimates: number[] = [];
  for (const z of zs) {
    const xPred = x + v * dt;
    const r = z - xPred;
    x = xPred + alpha * r;
    v = v + (beta / dt) * r;
    estimates.push(x);
  }
  return { estimates, velocity: v };
}

const rng = makeRng(0);
const gauss = () =>
  Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(2 * Math.PI * rng());
const truth = Array.from({ length: 60 }, (_, k) => 2 * k);
const noisy = truth.map((t) => t + 3 * gauss());
const { estimates, velocity } = alphaBetaFilter(noisy);
const rms = (a: number[], b: number[]) =>
  Math.sqrt(a.reduce((s, p, i) => s + (p - b[i]) ** 2, 0) / a.length);
console.log("測定の誤差:", rms(noisy, truth).toFixed(2));
console.log(
  "推定の誤差:",
  rms(estimates.slice(10), truth.slice(10)).toFixed(2),
);
console.log("推定した速度:", velocity.toFixed(2));
```
