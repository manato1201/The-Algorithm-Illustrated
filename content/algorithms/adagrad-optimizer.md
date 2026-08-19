---
name: AdaGradオプティマイザ
category: 機械学習
subcategory: 最適化基礎
complexity: O(1)(1パラメータあたりの更新)
summary: パラメータごとに過去の勾配の二乗和を蓄積し、その平方根で学習率を割り引くことで、頻繁に大きく更新されるパラメータの学習率を自動的に下げる適応的勾配法。
---

## 概要

通常の[勾配降下法](/algorithms/gradient-descent)は、すべてのパラメータに対して同じ学習率`α`を使うが、実際の問題では特徴量やパラメータごとに勾配のスケールが大きく異なることが多い——例えば疎な(まれにしか出現しない)特徴に対応するパラメータは、勾配がたまにしか更新されないため、密な特徴のパラメータと同じ学習率では学習が遅すぎる。AdaGrad(Adaptive Gradient algorithm)は、2011年にジョン・デュシらによって提案された、この問題に対する最初の体系的な解決策である。各パラメータについて**過去の勾配の二乗を累積**し、その累積値の平方根で学習率を割り引くことで、勾配が繰り返し大きかったパラメータの実効学習率を自動的に縮小し、逆に勾配がまれにしか観測されなかったパラメータには相対的に大きな学習率を維持する。パラメータごとに手動でチューニングしていた学習率を自動化した点で画期的だったが、後述する構造的な弱点があり、それを改善する形で[RMSProp](/algorithms/rmsprop)が提案されることになる。

## 仕組み

1. パラメータ`θ`に加え、**勾配の二乗の累積和**`G`を0で初期化する
2. 各ステップで、現在の勾配`g = ∇L(θ)`を計算する
3. `G`を更新する:`G ← G + g²`(過去のすべてのステップの勾配の二乗を、減衰させずにそのまま足し合わせ続ける)
4. パラメータを更新する:`θ ← θ - α・g / (√G + ε)`(`α`は基準となる学習率、`ε`はゼロ除算を防ぐ微小な定数)。`G`は各ステップで単調に増加するため、学習が進むほど`√G`は大きくなり続け、実効的な更新幅`α / (√G + ε)`は必然的に単調に縮小していく
5. 2〜4を収束するまで(あるいは更新がほぼ止まるまで)繰り返す

## 特性・トレードオフ

- **疎な勾配への強さ**: まれにしか非ゼロの勾配を持たない特徴(自然言語処理でのレアな単語の埋め込みなど)に対しては、その特徴のパラメータの`G`があまり増加しないため、相対的に大きな学習率が維持される。この性質により、AdaGradは元々、疎な特徴を持つ大規模な分類問題(広告のクリック率予測など)で高い効果を示した
- **学習が早期に停滞するという弱点**: `G`は過去の勾配の二乗を**減衰なしに全て累積**し続けるため、学習が進めば進むほど`G`は単調に増加し、実効学習率`α / (√G + ε)`はいずれ限りなく0に近づいてしまう。これは訓練の後半で(まだ改善の余地があるにもかかわらず)パラメータの更新がほぼ完全に止まってしまうという実務上の大きな問題を引き起こす
- **[RMSProp](/algorithms/rmsprop)による改善**: [RMSProp](/algorithms/rmsprop)は、この「学習が止まる」問題に対し、`G`を無限に累積する代わりに**指数移動平均**(`s ← β・s + (1-β)・g²`)に置き換えることで解決した——直近の勾配の大きさを重視し、古い勾配の影響を徐々に「忘れる」ことで、学習が長く続いても実効学習率が0に張り付かず適応的であり続けられるようにした。AdaGradの「各パラメータに個別の学習率を持たせる」というアイデアはそのまま受け継ぎつつ、累積の仕方だけを変えたのがRMSPropだと理解すると両者の関係が明確になる
- **凸最適化での理論的裏付け**: 累積和を使う設計は、実は凸最適化の理論(オンライン学習における後悔最小化)の枠組みでは望ましい収束特性を持つことが証明されている——非凸なニューラルネットワークの学習で問題になる「停滞」は、この理論的な文脈とは別の実務上の課題として現れる
- **使いどころ**: 疎な特徴量を持つ線形モデルの学習(広告CTR予測、テキスト分類でのbag-of-words表現)、[RMSProp](/algorithms/rmsprop)や[Adamオプティマイザ](/algorithms/adam-optimizer)といった後継の適応的最適化手法の理論的な出発点としての教育的価値、比較的短いエポック数で学習が完了する問題

## 実装例

```python
def adagrad_step(
    params: list[float], gradients: list[float], G: list[float],
    lr: float = 0.01, eps: float = 1e-8,
) -> tuple[list[float], list[float]]:
    new_G = [Gi + g * g for Gi, g in zip(G, gradients)]  # 勾配の二乗を減衰なしに累積する
    new_params = [p - lr * g / (Gi ** 0.5 + eps) for p, g, Gi in zip(params, gradients, new_G)]
    return new_params, new_G

def optimize(
    initial_params: list[float], grad_fn: "Callable[[list[float]], list[float]]",
    lr: float = 0.01, steps: int = 100,
) -> list[float]:
    params = list(initial_params)
    G = [0.0] * len(params)
    for _ in range(steps):
        gradients = grad_fn(params)
        params, G = adagrad_step(params, gradients, G, lr)
    return params
```

```typescript
function adagradStep(
  params: number[],
  gradients: number[],
  G: number[],
  lr = 0.01,
  eps = 1e-8,
): { params: number[]; G: number[] } {
  // 勾配の二乗を減衰なしに累積する
  const newG = G.map((Gi, i) => Gi + gradients[i] * gradients[i]);
  const newParams = params.map(
    (p, i) => p - (lr * gradients[i]) / (Math.sqrt(newG[i]) + eps),
  );
  return { params: newParams, G: newG };
}

function optimize(
  initialParams: number[],
  gradFn: (params: number[]) => number[],
  lr = 0.01,
  steps = 100,
): number[] {
  let params = [...initialParams];
  let G = new Array(params.length).fill(0);
  for (let i = 0; i < steps; i++) {
    const gradients = gradFn(params);
    ({ params, G } = adagradStep(params, gradients, G, lr));
  }
  return params;
}
```
