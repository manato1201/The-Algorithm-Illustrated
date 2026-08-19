---
name: ロンバーグ積分(Romberg Integration)
category: 数値計算
subcategory: 数値積分・微分方程式
complexity: O(n²)(n段のロンバーグ表、各段の台形則計算を含む)
summary: 台形則を分割数を倍にしながら繰り返し計算し、リチャードソン外挿で結果を組み合わせることで、少ない関数評価回数で高精度な数値積分を実現する手法。
---

## 概要

[台形則](/algorithms/trapezoidal-rule)は分割数`n`を増やせば増やすほど精度が上がるが、誤差が`O(h²)`(`h`は刻み幅)でしか減少しないため、桁数を1桁増やすには分割数を大幅に増やす必要があり非効率になりやすい。ロンバーグ積分は、[台形則](/algorithms/trapezoidal-rule)を分割数を倍にしながら段階的に何度も計算し、その結果の列に対して**リチャードソン外挿**(誤差の理論的なべき乗則を利用して、複数の粗い近似値から真値をより精度良く推定する数学的テクニック)を繰り返し適用することで、比較的少ない関数評価回数のまま急速に精度を高める手法である。うまくいけば[台形則](/algorithms/trapezoidal-rule)を極めて細かく分割するよりもはるかに少ない計算量で、高次の数値積分法に匹敵する精度が得られる。

## 仕組み

1. 分割数`n = 1, 2, 4, 8, ...`(2倍ずつ増やす)のそれぞれについて、[台形則](/algorithms/trapezoidal-rule)による積分の近似値`T(0,0), T(1,0), T(2,0), ...`を計算する(`T(k,0)`は分割数`2^k`での台形則の結果)
2. これらを「ロンバーグ表」の第0列に並べ、リチャードソン外挿の漸化式で列を右へ伸ばしていく:
   `T(k,j) = T(k,j-1) + [T(k,j-1) - T(k-1,j-1)] / (4^j - 1)`
   ここで`j`は外挿の段数(`j=1`は台形則同士を組み合わせてシンプソン則相当の精度に、`j=2`はさらに高次の精度になる、というように段数が上がるごとに理論上の精度の次数が2ずつ上がっていく)
3. 表を対角線方向(`k`が増えるごとに`j`も増やす)に埋めていき、`T(n,n)`が最も精度の高い近似値になる
4. 隣接する対角成分`T(n,n)`と`T(n-1,n-1)`の差が許容誤差より小さくなったら打ち切る。実務上、分割数`n`を大きく増やす前に数回のリチャードソン外挿だけで大幅に精度が上がることが多い

各段の[台形則](/algorithms/trapezoidal-rule)の計算では、分割数を倍にする際に「新しく追加された中点」だけを評価すればよく(既存の分割点の関数値は再利用できる)、関数評価の総回数を抑えられる。

## 特性・トレードオフ

- **[台形則](/algorithms/trapezoidal-rule)単体との比較**: 素の[台形則](/algorithms/trapezoidal-rule)は誤差`O(h²)`だが、ロンバーグ積分は外挿を`j`回重ねるごとに理論上の誤差の次数が`O(h^(2j+2))`まで上がっていく。滑らかな(高階微分が有界な)関数に対しては、[台形則](/algorithms/trapezoidal-rule)を単純に細かく分割するよりもはるかに少ない関数評価回数で高精度を達成できる
- **関数が滑らかであることが前提**: リチャードソン外挿は誤差が刻み幅`h`の整数べきで展開できることを前提にしているため、関数に特異点や急激な変化がある場合は外挿の効果が薄れたり、かえって精度が悪化することがある。そのような関数には適応型の分割(区間ごとに分割の細かさを変える適応型シンプソン則など)が向く
- **[シンプソンの公式](/algorithms/simpsons-rule)との関係**: ロンバーグ表の1段目の外挿(`j=1`)は、実は[シンプソンの公式](/algorithms/simpsons-rule)と数学的に同じ結果になる。ロンバーグ積分は、いわば「[シンプソンの公式](/algorithms/simpsons-rule)よりさらに高次の外挿を体系的に繰り返す一般化」と位置づけられる
- **実装の単純さ**: 高次の公式を個別に導出・実装する必要がなく、[台形則](/algorithms/trapezoidal-rule)という単純な計算とリチャードソン外挿という共通の手続きの組み合わせだけで任意の次数の精度に(理論上は)到達できる点が実装上の利点
- **使いどころ**: 滑らかな関数の高精度な定積分が必要な科学技術計算、数値計算ライブラリの適応的積分アルゴリズムの内部(SciPyの`quad`など)、[モンテカルロ積分](/algorithms/monte-carlo-integration)が不向きな低次元・滑らかな被積分関数の積分

## 実装例(f(x) = x² を区間[0, 4]で積分する。真値は64/3 ≈ 21.333)

```python
from typing import Callable


def romberg_integration(
    f: Callable[[float], float], a: float, b: float, max_steps: int = 6, tol: float = 1e-10
) -> float:
    r = [[0.0] * max_steps for _ in range(max_steps)]
    h = b - a
    r[0][0] = h / 2 * (f(a) + f(b))

    for k in range(1, max_steps):
        h /= 2
        # 新しく追加された中点だけを評価して台形則を更新する
        total = sum(f(a + (2 * i - 1) * h) for i in range(1, 2 ** (k - 1) + 1))
        r[k][0] = r[k - 1][0] / 2 + h * total

        for j in range(1, k + 1):
            r[k][j] = r[k][j - 1] + (r[k][j - 1] - r[k - 1][j - 1]) / (4**j - 1)

        if abs(r[k][k] - r[k - 1][k - 1]) < tol:
            return r[k][k]

    return r[max_steps - 1][max_steps - 1]


# f(x) = x^2 を [0, 4] で積分する(真値は 64/3 ≈ 21.333)
result = romberg_integration(lambda x: x**2, 0, 4)
```

```typescript
function rombergIntegration(
  f: (x: number) => number,
  a: number,
  b: number,
  maxSteps: number = 6,
  tol: number = 1e-10,
): number {
  const r: number[][] = Array.from({ length: maxSteps }, () =>
    new Array(maxSteps).fill(0),
  );
  let h = b - a;
  r[0][0] = (h / 2) * (f(a) + f(b));

  for (let k = 1; k < maxSteps; k++) {
    h /= 2;
    // 新しく追加された中点だけを評価して台形則を更新する
    let total = 0;
    const count = 2 ** (k - 1);
    for (let i = 1; i <= count; i++) total += f(a + (2 * i - 1) * h);
    r[k][0] = r[k - 1][0] / 2 + h * total;

    for (let j = 1; j <= k; j++) {
      r[k][j] = r[k][j - 1] + (r[k][j - 1] - r[k - 1][j - 1]) / (4 ** j - 1);
    }

    if (Math.abs(r[k][k] - r[k - 1][k - 1]) < tol) return r[k][k];
  }

  return r[maxSteps - 1][maxSteps - 1];
}

// f(x) = x^2 を [0, 4] で積分する(真値は 64/3 ≈ 21.333)
const result = rombergIntegration((x) => x ** 2, 0, 4);
```
