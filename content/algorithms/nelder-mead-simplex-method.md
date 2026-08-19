---
name: Nelder-Mead法(勾配不要の単体法)
category: 最適化・確率的手法
subcategory: 局所探索
complexity: O(次元数nに比例する反復コスト、収束回数は問題依存)
summary: n+1個の点からなる単体を反射・拡大・収縮・縮小という操作で変形させながら関数値の低い方向へ移動させる、微分情報を使わない直接探索法。
---

## 概要

**名称についての重要な注意**: Nelder-Mead法は「シンプレックス法」と呼ばれることがあり、線形計画問題を解く[シンプレックス法](/algorithms/simplex-method)(ダンツィーグの単体法)と混同されやすいが、両者は名前が似ているだけで**全く別のアルゴリズム**である。[シンプレックス法](/algorithms/simplex-method)は線形計画問題の実行可能領域(多面体)の**頂点を巡回**しながら大域最適解に到達する厳密解法であるのに対し、Nelder-Mead法は一般の(線形とは限らない)関数`f(x)`を最小化するために、n次元空間上のn+1個の点が作る図形(**単体、simplex**)を反射・拡大・収縮といった幾何学的操作で変形させながら移動させていく、**勾配を一切使わない**局所探索の直接探索法である。両者に共通するのは「simplex(単体)」という幾何学的な図形の名称だけであり、扱う問題も保証される解の性質も異なる。Nelder-Mead法は1965年にジョン・ネルダーとロジャー・ミードが提案した。

## 仕組み

n次元の探索空間で、n+1個の点からなる単体(2次元なら三角形、3次元なら四面体)を維持しながら、以下の操作を繰り返す。

1. 単体を構成するn+1個の点それぞれで目的関数`f`を評価し、**最良点**・**最悪点**・**次に悪い点**を特定する
2. 最悪点を除いた残りn個の点の**重心**を計算する
3. 最悪点を重心を挟んで反対側に**反射**させた点を試す。反射点が最良点より良ければ、さらに重心から遠ざける方向に**拡大**した点も試し、より良い方を採用して最悪点と置き換える
4. 反射点が改善しなかった場合は、最悪点と重心の間に**収縮**した点を試し、それが最悪点より良ければ採用する
5. 収縮点も改善しなかった場合は、単体全体を最良点に向かって**縮小**させる(全ての点を最良点に近づける)
6. 単体のサイズ(各点の広がり)が十分小さくなるか、関数値の変化が収束条件を満たすまで、1〜5を繰り返す

「単体という図形自体を、良い方向には大胆に(反射・拡大)、悪い方向には慎重に(収縮・縮小)変形させながら移動させる」という、勾配を計算せずに関数の谷を這うように進んでいく戦略が核心である。

## 特性・トレードオフ

- **微分不要という強み**: 目的関数が微分不可能・不連続・ノイズを含む(シミュレーション結果など解析的な式で書けない)場合でも適用できる。関数値さえ評価できれば動くため、ブラックボックス最適化の代表的な手法の一つになっている
- **局所探索であり大域最適の保証はない**: [焼きなまし法](/algorithms/simulated-annealing)のような確率的な脱出機構を持たないため、単体が局所最適の周辺に収束して停止しやすい。多点からの再スタートや、[遺伝的アルゴリズム](/algorithms/genetic-algorithm)・[差分進化](/algorithms/differential-evolution)のような大域的な手法と組み合わせて使われることも多い
- **次元が大きくなると弱くなる**: 単体が持つ点の数(n+1個)は次元数に対して線形にしか増えないため、実用上は数十次元程度までが目安とされ、高次元問題では収束が遅くなったり停滞したりしやすい
- **勾配法との対比**: 勾配降下法・ニュートン法のような勾配ベースの手法は、微分可能な関数に対しては一般に高速に収束するが、Nelder-Mead法は微分情報が使えない・信頼できない状況での代替手段として位置づけられる
- **使いどころ**: シミュレーションベースの目的関数の最適化(解析式がなく関数値しか得られない場合)、少数パラメータ(数個〜十数個)のモデルのキャリブレーション、科学技術計算での初期の粗い最適化、より高度な手法([ベイズ最適化](/algorithms/bayesian-optimization)など)を使う前の簡便な基準手法

## 実装例

2次元のRosenbrock関数(バナナ関数)`f(x, y) = (1-x)^2 + 100(y - x^2)^2`(最小値は`(1, 1)`で`0`)を最小化する例。

```python
def rosenbrock(p: list[float]) -> float:
    x, y = p
    return (1 - x) ** 2 + 100 * (y - x * x) ** 2


def nelder_mead(
    f,
    initial_simplex: list[list[float]],
    alpha: float = 1.0,   # 反射
    gamma: float = 2.0,   # 拡大
    rho: float = 0.5,     # 収縮
    sigma: float = 0.5,   # 縮小
    max_iterations: int = 500,
    tol: float = 1e-8,
) -> list[float]:
    simplex = [list(p) for p in initial_simplex]
    n = len(simplex) - 1

    for _ in range(max_iterations):
        simplex.sort(key=f)
        best, worst, second_worst = simplex[0], simplex[-1], simplex[-2]

        if abs(f(worst) - f(best)) < tol:
            break

        centroid = [sum(p[i] for p in simplex[:-1]) / n for i in range(n)]

        # 反射
        reflected = [centroid[i] + alpha * (centroid[i] - worst[i]) for i in range(n)]
        f_reflected = f(reflected)

        if f(best) <= f_reflected < f(second_worst):
            simplex[-1] = reflected
        elif f_reflected < f(best):
            # 拡大
            expanded = [centroid[i] + gamma * (reflected[i] - centroid[i]) for i in range(n)]
            simplex[-1] = expanded if f(expanded) < f_reflected else reflected
        else:
            # 収縮
            contracted = [centroid[i] + rho * (worst[i] - centroid[i]) for i in range(n)]
            if f(contracted) < f(worst):
                simplex[-1] = contracted
            else:
                # 縮小
                simplex = [best] + [
                    [best[i] + sigma * (p[i] - best[i]) for i in range(n)] for p in simplex[1:]
                ]

    simplex.sort(key=f)
    return simplex[0]


result = nelder_mead(rosenbrock, [[0.0, 0.0], [1.2, 0.0], [0.0, 1.2]])
```

```typescript
function rosenbrock(p: number[]): number {
  const [x, y] = p;
  return (1 - x) ** 2 + 100 * (y - x * x) ** 2;
}

function nelderMead(
  f: (p: number[]) => number,
  initialSimplex: number[][],
  alpha = 1.0, // 反射
  gamma = 2.0, // 拡大
  rho = 0.5, // 収縮
  sigma = 0.5, // 縮小
  maxIterations = 500,
  tol = 1e-8,
): number[] {
  let simplex = initialSimplex.map((p) => [...p]);
  const n = simplex.length - 1;

  for (let iter = 0; iter < maxIterations; iter++) {
    simplex.sort((a, b) => f(a) - f(b));
    const best = simplex[0];
    const worst = simplex[simplex.length - 1];
    const secondWorst = simplex[simplex.length - 2];

    if (Math.abs(f(worst) - f(best)) < tol) break;

    const centroid = Array.from(
      { length: n },
      (_, i) => simplex.slice(0, -1).reduce((s, p) => s + p[i], 0) / n,
    );

    // 反射
    const reflected = centroid.map((c, i) => c + alpha * (c - worst[i]));
    const fReflected = f(reflected);

    if (f(best) <= fReflected && fReflected < f(secondWorst)) {
      simplex[simplex.length - 1] = reflected;
    } else if (fReflected < f(best)) {
      // 拡大
      const expanded = centroid.map((c, i) => c + gamma * (reflected[i] - c));
      simplex[simplex.length - 1] =
        f(expanded) < fReflected ? expanded : reflected;
    } else {
      // 収縮
      const contracted = centroid.map((c, i) => c + rho * (worst[i] - c));
      if (f(contracted) < f(worst)) {
        simplex[simplex.length - 1] = contracted;
      } else {
        // 縮小
        simplex = [
          best,
          ...simplex
            .slice(1)
            .map((p) => p.map((v, i) => best[i] + sigma * (v - best[i]))),
        ];
      }
    }
  }

  simplex.sort((a, b) => f(a) - f(b));
  return simplex[0];
}

const result = nelderMead(rosenbrock, [
  [0.0, 0.0],
  [1.2, 0.0],
  [0.0, 1.2],
]);
```
