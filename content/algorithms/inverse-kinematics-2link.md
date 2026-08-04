---
name: 逆運動学(2リンクアームの解析解)
category: 制御・ロボティクス
subcategory: 姿勢・軌道生成
complexity: O(1)(解析解が存在する場合)
summary: 「アームの先端をこの位置に持っていきたい」という目標座標から、各関節がどの角度を取るべきかを三角関数の幾何学的な関係だけで逆算する、ロボットアーム制御の基礎。
---

## 概要

ロボットアームを操作する際、「肩の関節を30度、肘の関節を45度曲げるとアームの先端はどこに来るか」を計算する順運動学は三角関数を使えば比較的簡単だが、実際に操作したいのは逆——「アームの先端をこの座標に持っていきたい、では各関節を何度曲げればよいか」という**逆運動学**の方である。2つの関節(肩と肘)を持つ最も単純な2リンクアームの場合、この逆問題は幾何学的な関係から解析的に(数式として明示的に)解くことができ、ロボット制御の基礎として広く教えられている。より多くの関節を持つ複雑なアームでは、解析解が存在しないことが多く、数値的な反復解法が必要になる。

## 仕組み

1. 第1リンク(肩から肘まで)の長さを`L1`、第2リンク(肘から先端まで)の長さを`L2`とし、目標とするアーム先端の座標を`(x, y)`とする
2. 肩関節から目標点までの距離`d = √(x² + y²)`を計算する。この距離が`L1 + L2`(アームを完全に伸ばした長さ)より大きい、または`|L1 - L2|`より小さい場合、その目標点は物理的に到達不可能である
3. 三角形の余弦定理を使い、肘関節の角度`θ2`を求める: `cos(θ2) = (d² - L1² - L2²) / (2×L1×L2)`。この式から`θ2`が2通り(正の値と負の値、「肘が上を向く」姿勢と「肘が下を向く」姿勢に対応する)求まる——これが逆運動学の特徴的な性質である**複数解の存在**である
4. 求めた`θ2`を使って、肩関節の角度`θ1`を求める。目標点への方向`atan2(y, x)`から、余弦定理で計算される肘の張り出し角度分を差し引く形で`θ1 = atan2(y, x) - atan2(L2×sin(θ2), L1+L2×cos(θ2))`という式が導ける
5. こうして得られた`(θ1, θ2)`が、アーム先端を目標座標`(x, y)`に到達させるための関節角度になる

## 特性・トレードオフ

- **計算量**: 三角関数の計算だけで済むため`O(1)`。2リンクという単純な構造であれば、反復計算を一切必要とせず瞬時に解が求まる
- **解の多重性(複数の姿勢)**: 同じ目標座標に対して、通常「肘が上を向く」姿勢と「肘が下を向く」姿勢の2通りの解が存在する。実際のロボット制御では、周囲の障害物との干渉や、現在の姿勢からの動きの滑らかさを考慮して、どちらの解を採用するかを決める必要がある
- **関節数が増えると解析解は困難に**: 2リンク・3自由度程度までは幾何学的な解析解が求まることが多いが、人間の腕のように6自由度以上を持つ複雑なロボットアームでは、解析解が存在しない、あるいは非常に複雑になることが多く、[ヤコビ行列](/algorithms/gaussian-elimination)を使った反復的な数値解法(逆運動学のニュートン法的アプローチ、[ニュートン法](/algorithms/newton-method)と同じ考え方)が実務では広く使われる
- **使いどころ**: 産業用ロボットアームの制御(目標物をつかむ位置への到達計算)、ゲーム・アニメーションのキャラクターの手足の自然な動きの生成(モーションキャプチャデータの再ターゲティング等)、義手・義足のような装着型ロボティクスの制御

## 実装例

```python
import math

def forward_kinematics(l1: float, l2: float, theta1: float, theta2: float) -> tuple[float, float]:
    x1 = l1 * math.cos(theta1)
    y1 = l1 * math.sin(theta1)
    x2 = x1 + l2 * math.cos(theta1 + theta2)
    y2 = y1 + l2 * math.sin(theta1 + theta2)
    return x2, y2


def inverse_kinematics(l1: float, l2: float, x: float, y: float):
    """目標(x, y)に到達する(theta1, theta2)の2解(肘が上/下)を返す。到達不能ならNone"""
    d = math.hypot(x, y)
    if d > l1 + l2 or d < abs(l1 - l2):
        return None  # 到達不可能
    cos_theta2 = (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2)
    cos_theta2 = max(-1.0, min(1.0, cos_theta2))
    theta2_a = math.acos(cos_theta2)   # 肘が上を向く姿勢
    theta2_b = -theta2_a               # 肘が下を向く姿勢

    def theta1_for(theta2: float) -> float:
        return math.atan2(y, x) - math.atan2(l2 * math.sin(theta2), l1 + l2 * math.cos(theta2))

    return (theta1_for(theta2_a), theta2_a), (theta1_for(theta2_b), theta2_b)
```

```typescript
function forwardKinematics(l1: number, l2: number, theta1: number, theta2: number): [number, number] {
  const x1 = l1 * Math.cos(theta1);
  const y1 = l1 * Math.sin(theta1);
  const x2 = x1 + l2 * Math.cos(theta1 + theta2);
  const y2 = y1 + l2 * Math.sin(theta1 + theta2);
  return [x2, y2];
}

function inverseKinematics(
  l1: number,
  l2: number,
  x: number,
  y: number
): [[number, number], [number, number]] | null {
  const d = Math.hypot(x, y);
  if (d > l1 + l2 || d < Math.abs(l1 - l2)) return null;
  let cosTheta2 = (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  cosTheta2 = Math.max(-1, Math.min(1, cosTheta2));
  const theta2A = Math.acos(cosTheta2);
  const theta2B = -theta2A;

  const theta1For = (theta2: number) =>
    Math.atan2(y, x) - Math.atan2(l2 * Math.sin(theta2), l1 + l2 * Math.cos(theta2));

  return [
    [theta1For(theta2A), theta2A],
    [theta1For(theta2B), theta2B],
  ];
}
```

```cpp
#include <cmath>
#include <optional>
#include <utility>
#include <algorithm>

std::pair<double, double> forwardKinematics(double l1, double l2, double theta1, double theta2) {
    double x1 = l1 * std::cos(theta1);
    double y1 = l1 * std::sin(theta1);
    double x2 = x1 + l2 * std::cos(theta1 + theta2);
    double y2 = y1 + l2 * std::sin(theta1 + theta2);
    return {x2, y2};
}

using Solution = std::pair<std::pair<double, double>, std::pair<double, double>>;

std::optional<Solution> inverseKinematics(double l1, double l2, double x, double y) {
    double d = std::hypot(x, y);
    if (d > l1 + l2 || d < std::abs(l1 - l2)) return std::nullopt;
    double cosTheta2 = (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2);
    cosTheta2 = std::max(-1.0, std::min(1.0, cosTheta2));
    double theta2A = std::acos(cosTheta2);
    double theta2B = -theta2A;

    auto theta1For = [&](double theta2) {
        return std::atan2(y, x) - std::atan2(l2 * std::sin(theta2), l1 + l2 * std::cos(theta2));
    };

    return Solution{{theta1For(theta2A), theta2A}, {theta1For(theta2B), theta2B}};
}
```

```rust
fn forward_kinematics(l1: f64, l2: f64, theta1: f64, theta2: f64) -> (f64, f64) {
    let x1 = l1 * theta1.cos();
    let y1 = l1 * theta1.sin();
    let x2 = x1 + l2 * (theta1 + theta2).cos();
    let y2 = y1 + l2 * (theta1 + theta2).sin();
    (x2, y2)
}

fn inverse_kinematics(l1: f64, l2: f64, x: f64, y: f64) -> Option<((f64, f64), (f64, f64))> {
    let d = x.hypot(y);
    if d > l1 + l2 || d < (l1 - l2).abs() {
        return None; // 到達不可能
    }
    let cos_theta2 = ((d * d - l1 * l1 - l2 * l2) / (2.0 * l1 * l2)).clamp(-1.0, 1.0);
    let theta2_a = cos_theta2.acos();
    let theta2_b = -theta2_a;

    let theta1_for = |theta2: f64| y.atan2(x) - (l2 * theta2.sin()).atan2(l1 + l2 * theta2.cos());

    Some(((theta1_for(theta2_a), theta2_a), (theta1_for(theta2_b), theta2_b)))
}
```

```csharp
static (double x, double y) ForwardKinematics(double l1, double l2, double theta1, double theta2)
{
    double x1 = l1 * Math.Cos(theta1);
    double y1 = l1 * Math.Sin(theta1);
    double x2 = x1 + l2 * Math.Cos(theta1 + theta2);
    double y2 = y1 + l2 * Math.Sin(theta1 + theta2);
    return (x2, y2);
}

static ((double, double), (double, double))? InverseKinematics(double l1, double l2, double x, double y)
{
    double d = Math.Sqrt(x * x + y * y);
    if (d > l1 + l2 || d < Math.Abs(l1 - l2)) return null;
    double cosTheta2 = (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2);
    cosTheta2 = Math.Max(-1.0, Math.Min(1.0, cosTheta2));
    double theta2A = Math.Acos(cosTheta2);
    double theta2B = -theta2A;

    double Theta1For(double theta2) => Math.Atan2(y, x) - Math.Atan2(l2 * Math.Sin(theta2), l1 + l2 * Math.Cos(theta2));

    return ((Theta1For(theta2A), theta2A), (Theta1For(theta2B), theta2B));
}
```
