---
name: ブレント法(求根)
category: 数値計算
subcategory: 求根アルゴリズム
complexity: 収束は超1次(逆2次補間が効くとき)、最悪でも二分法の反復数の2乗程度で必ず収束
summary: 二分法の確実さと、割線法・逆2次補間の速さを組み合わせた求根法。区間が符号を挟んでいる限り必ず収束し、多くの数値計算ライブラリの標準の1変数求根器になっている。
---

## 概要

関数 `f(x) = 0` の解を求める基本手法には、それぞれ弱点がある。[二分法](/algorithms/bisection-method)は符号を挟む区間さえあれば必ず収束するが、1反復で桁が1ビット増えるだけで遅い。[割線法](/algorithms/secant-method)や[ニュートン法](/algorithms/newton-method)は速いが、初期値が悪いと発散したり、区間の外へ飛び出したりする。

Richard Brent(1973年の著書「Algorithms for Minimization without Derivatives」)は、Dekkerの方法(1969年)を改良して、**速い補間法を基本にしながら、うまく進まないときは必ず二分法に切り替える**アルゴリズムを示した。符号を挟んだ区間を保ち続けるので発散せず、補間が効く滑らかな関数では、二分法よりずっと少ない反復で収束する。「まず使う求根器」として、`scipy.optimize.brentq`、MATLABの`fzero`、各種数値計算ライブラリに採用されている。

## 仕組み

区間 `[a, b]` で `f(a)` と `f(b)` の符号が異なること(解を挟んでいる)が前提。`b` を常に「解に近い方の端点」として保つ。

1. 3点(`a, b, c`、`c` は1つ前の `b`)の `f` の値がすべて異なるなら、**逆2次補間**(`x` を `f` の2次関数として当てはめて `f = 0` となる `x` を求める)で次の候補 `s` を作る。そうでなければ割線法で `s` を作る
2. 次のいずれかに当てはまるなら、`s` を使わず**二分法**の中点を採用する
   - `s` が区間の「`b` に近い側の4分の3」の外にある(区間から外れそう)
   - 前の更新量の半分より、今回の更新量のほうが大きい(収束が遅い)
   - 区間の幅が許容誤差を下回っている
3. 新しい点 `s` で `f(s)` を計算し、符号が `f(a)` と逆なら `b = s`、そうでなければ `a = s` として、符号を挟む区間を保つ。`|f(a)| < |f(b)|` なら `a` と `b` を入れ替えて、`b` が解に近い側になるようにする
4. `f(b) = 0` か、区間の幅が許容誤差以下になったら `b` を返す

## 特性・トレードオフ

- **必ず収束する**: 符号を挟む区間があれば、二分法に切り替える条件のおかげで、収束が保証される。補間で進める限りは、二分法よりずっと速い
- **導関数が不要**: ニュートン法と違い、`f` の値だけで動く。導関数が高価・不明な問題に向く
- **符号を挟む区間が必要**: 解を挟む区間をあらかじめ見つけておく必要がある(包み込み)。重根(`f` が符号を変えない解)や、不連続な関数では使えない
- **実装が細かい**: 切り替えの条件の細部を誤ると、速さや安全性が損なわれる。実用では、標準ライブラリのものを使うのが無難
- **最小化への兄弟**: 同じBrentによる1変数関数の最小化法(黄金分割探索と放物線補間の組み合わせ)がある
- **使いどころ**: 方程式の解を1つ安全に求める場面全般(物理量の逆算、確率分布の分位点の計算、金融の利回り・内部収益率の計算)

## 実装例

```python
def brent(f, a, b, tol=1e-12, max_iter=100):
    fa, fb = f(a), f(b)
    if fa * fb > 0:
        raise ValueError("区間が解を挟んでいません")
    if abs(fa) < abs(fb):
        a, b, fa, fb = b, a, fb, fa
    c, fc = a, fa
    d = c
    mflag = True
    for _ in range(max_iter):
        if fb == 0 or abs(b - a) < tol:
            return b
        if fa != fc and fb != fc:      # 逆2次補間
            s = (a * fb * fc / ((fa - fb) * (fa - fc))
                 + b * fa * fc / ((fb - fa) * (fb - fc))
                 + c * fa * fb / ((fc - fa) * (fc - fb)))
        else:                          # 割線法
            s = b - fb * (b - a) / (fb - fa)
        low, high = sorted(((3 * a + b) / 4, b))
        if (not low < s < high
                or (mflag and abs(s - b) >= abs(b - c) / 2)
                or (not mflag and abs(s - b) >= abs(c - d) / 2)
                or (mflag and abs(b - c) < tol)
                or (not mflag and abs(c - d) < tol)):
            s = (a + b) / 2            # 二分法に切り替える
            mflag = True
        else:
            mflag = False
        fs = f(s)
        d, c, fc = c, b, fb
        if fa * fs < 0:
            b, fb = s, fs
        else:
            a, fa = s, fs
        if abs(fa) < abs(fb):
            a, b, fa, fb = b, a, fb, fa
    return b


print(brent(lambda x: x**3 - x - 2, 1, 2))  # 1.5213797068045676
```

```typescript
function brent(
  f: (x: number) => number,
  a0: number,
  b0: number,
  tol = 1e-12,
  maxIter = 100,
): number {
  let a = a0,
    b = b0;
  let fa = f(a),
    fb = f(b);
  if (fa * fb > 0) throw new Error("区間が解を挟んでいません");
  if (Math.abs(fa) < Math.abs(fb)) [a, b, fa, fb] = [b, a, fb, fa];
  let c = a,
    fc = fa,
    d = c;
  let mflag = true;
  for (let i = 0; i < maxIter; i++) {
    if (fb === 0 || Math.abs(b - a) < tol) return b;
    let s: number;
    if (fa !== fc && fb !== fc) {
      s =
        (a * fb * fc) / ((fa - fb) * (fa - fc)) +
        (b * fa * fc) / ((fb - fa) * (fb - fc)) +
        (c * fa * fb) / ((fc - fa) * (fc - fb));
    } else {
      s = b - (fb * (b - a)) / (fb - fa);
    }
    const [low, high] = [(3 * a + b) / 4, b].sort((x, y) => x - y);
    if (
      !(low < s && s < high) ||
      (mflag && Math.abs(s - b) >= Math.abs(b - c) / 2) ||
      (!mflag && Math.abs(s - b) >= Math.abs(c - d) / 2) ||
      (mflag && Math.abs(b - c) < tol) ||
      (!mflag && Math.abs(c - d) < tol)
    ) {
      s = (a + b) / 2;
      mflag = true;
    } else {
      mflag = false;
    }
    const fs = f(s);
    d = c;
    c = b;
    fc = fb;
    if (fa * fs < 0) {
      b = s;
      fb = fs;
    } else {
      a = s;
      fa = fs;
    }
    if (Math.abs(fa) < Math.abs(fb)) [a, b, fa, fb] = [b, a, fb, fa];
  }
  return b;
}

console.log(brent((x) => x ** 3 - x - 2, 1, 2)); // 1.5213797068045676
```
