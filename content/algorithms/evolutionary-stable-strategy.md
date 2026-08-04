---
name: 進化的に安定な戦略(ESS)
category: ゲーム
subcategory: 数理ゲーム理論
complexity: O(戦略数^2)(ペアワイズ利得比較)
summary: 集団の大多数がその戦略を取る限り、少数の変異戦略が侵入しても淘汰されて元に戻る、進化ゲーム理論における安定性の概念。
---

## 概要

[ナッシュ均衡](/algorithms/nash-equilibrium)は「合理的なプレイヤーが意図的に選ぶ均衡」を扱うが、進化生物学では、動物は意図的に戦略を選んでいるわけではなく、より多くの子孫を残す戦略が自然選択によって集団内で広まっていく。1973年にジョン・メイナード=スミスが提唱した進化的に安定な戦略(ESS)は、この「意思決定なしに、繁殖成功率の違いだけで集団の戦略構成が変化していく」という力学のもとでの安定性を定式化したもので、「集団のほぼ全員がその戦略を取っているとき、ごく少数の変異体が別の戦略で侵入してきても、変異体は既存の多数派より得をせず、結局淘汰されてしまう」という戦略を指す。タカ・ハトゲーム(資源を巡って攻撃的に戦うか譲るか)がこの理論の代表的な例としてよく使われる。

## 仕組み

1. 集団内の個体がランダムに2体ずつペアになって「ゲーム」(資源を巡る争い等)をプレイし、その結果(利得)が繁殖成功率に反映されると仮定する
2. 集団の大多数が戦略`I`を取っているとし、そこにごく少数(頻度`ε`)の変異戦略`J`が侵入した状況を考える
3. 変異体`J`の個体が得る平均利得と、多数派`I`の個体が得る平均利得を比較する。この利得はどちらの相手と対戦するかで決まるため、`ε`が十分小さいときの極限で「ほぼ`I`とだけ対戦したときの利得」で評価する
4. 戦略`I`がESSであるための条件は: (a) `I`対`I`の利得が`J`対`I`の利得**以上**であり、かつ (b) それが等しい場合は`I`対`J`の利得が`J`対`J`の利得より**厳密に大きい**こと。この条件を満たせば、`J`は集団に定着できず淘汰される
5. 全ての可能な変異戦略`J`についてこの条件が成り立つとき、`I`は進化的に安定である

## 特性・トレードオフ

- **ナッシュ均衡との関係**: 全てのESSはナッシュ均衡でもあるが、逆は必ずしも成り立たない(ナッシュ均衡の中には、変異体の侵入を許してしまう「不安定」なものもある)。ESSはナッシュ均衡よりも強い安定性を要求する概念
- **意思決定を仮定しない**: プレイヤーが合理的に戦略を選ぶという前提が要らず、「利得が高い戦略の個体ほど多く子孫を残す」という自然選択の力学だけで安定な戦略構成が説明できる。この非意図的な安定性は生物学的な現象の説明に特に強力
- **混合戦略と多型均衡**: タカ・ハトゲームのように純粋戦略ではESSが存在しない場合、集団内に複数の戦略が一定の比率で共存する「多型均衡」(または個体ごとに確率的に戦略を選ぶ混合ESS)が安定解になることがある——自然界に複数の生存戦略が共存する現象の説明に使われる
- **使いどころ**: 動物行動学(縄張り争い・求愛行動の説明)、進化ゲーム理論、マルチエージェントシステムにおける学習アルゴリズムの収束先の分析、ゲームバランス調整における「特定の戦略への一極集中(メタの固定化)」の分析にも応用される

## 実装例

```python
def is_ess(payoff: list[list[float]], i: int) -> bool:
    n = len(payoff)
    for j in range(n):
        if j == i:
            continue
        if payoff[i][i] > payoff[j][i]:
            continue
        if payoff[i][i] == payoff[j][i] and payoff[i][j] > payoff[j][j]:
            continue
        return False
    return True


# タカ・ハトゲーム: V=資源の価値, C=争いのコスト(V < C なら純粋戦略ESSは存在しない)
V, C = 2.0, 4.0
payoff = [
    [(V - C) / 2, V],  # Hawk vs (Hawk, Dove)
    [0.0, V / 2],      # Dove vs (Hawk, Dove)
]
print(is_ess(payoff, 0), is_ess(payoff, 1))  # False False -> 混合ESSが安定解
```

```typescript
function isEss(payoff: number[][], i: number): boolean {
  const n = payoff.length;
  for (let j = 0; j < n; j++) {
    if (j === i) continue;
    if (payoff[i][i] > payoff[j][i]) continue;
    if (payoff[i][i] === payoff[j][i] && payoff[i][j] > payoff[j][j]) continue;
    return false;
  }
  return true;
}

const V = 2.0;
const C = 4.0;
const payoff = [
  [(V - C) / 2, V],
  [0.0, V / 2],
];
console.log(isEss(payoff, 0), isEss(payoff, 1)); // false false
```

```cpp
#include <vector>

bool isEss(const std::vector<std::vector<double>>& payoff, int i) {
    int n = static_cast<int>(payoff.size());
    for (int j = 0; j < n; j++) {
        if (j == i) continue;
        if (payoff[i][i] > payoff[j][i]) continue;
        if (payoff[i][i] == payoff[j][i] && payoff[i][j] > payoff[j][j]) continue;
        return false;
    }
    return true;
}
```

```rust
fn is_ess(payoff: &[Vec<f64>], i: usize) -> bool {
    for (j, row) in payoff.iter().enumerate() {
        if j == i {
            continue;
        }
        if payoff[i][i] > row[i] {
            continue;
        }
        if payoff[i][i] == row[i] && payoff[i][j] > row[j] {
            continue;
        }
        return false;
    }
    true
}
```

```csharp
static bool IsEss(double[][] payoff, int i)
{
    int n = payoff.Length;
    for (int j = 0; j < n; j++)
    {
        if (j == i) continue;
        if (payoff[i][i] > payoff[j][i]) continue;
        if (payoff[i][i] == payoff[j][i] && payoff[i][j] > payoff[j][j]) continue;
        return false;
    }
    return true;
}
```
