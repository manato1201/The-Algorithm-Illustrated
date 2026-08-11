---
name: ガソリンスタンド問題(貪欲による周回可能性判定)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n)
summary: 円環状に並んだガソリンスタンドを1周できる出発点が存在するかを、全ての組み合わせを試すことなく、累積残量が最小になる地点の直後から出発すればよいという貪欲な洞察だけでO(n)で判定する。
---

## 概要

円形のコース上にn個のガソリンスタンドがあり、各スタンドで補給できるガソリン量と、次のスタンドまでの移動に必要なガソリン量が決まっているとき、「どこか1箇所から出発してタンクを空にせずに1周できる出発点が存在するか、あるならどこか」を求める問題を考える。素朴には全てのスタンドを出発点として試す(O(n²))ことになるが、**「全スタンドの補給量の合計が消費量の合計以上であれば、必ずどこかに実行可能な出発点が存在し、それは"道中の累積残量が最も落ち込んだ地点"の直後である」**という貪欲な洞察を使うことで、1回の走査だけでO(n)で解ける。配車・巡回スケジューリングの基本的なパズルとして、競技プログラミングでも定番の問題である。

## 仕組み

1. 各スタンド`i`について、「補給できる量`gas[i]`」と「次のスタンドまでの消費量`cost[i]`」の差`net[i] = gas[i] - cost[i]`を計算する
2. 全スタンドの`net`の合計が負であれば、どこから出発しても1周できないので「不可能」と判定する
3. 合計が0以上であれば、必ずどこかに実行可能な出発点が存在する。これを見つけるため、任意の地点(通常は0番目)から出発したと仮定して、`net`を順に足し込んでいく累積和`tank`を計算する
4. `tank`が負になった時点(その地点まででは補給が足りず立ち往生する)で、**その地点までの区間はどこも出発点になり得ない**と判定できる(そこまでのどのスタンドから出発しても、同じ理由で立ち往生するタンク残量の落ち込みを避けられないため)。`tank`をリセットし、次のスタンド(立ち往生した地点の直後)を新たな出発点候補とする
5. 最後まで走査を終えたとき、最後にリセットした地点が実行可能な出発点になる(2の条件から、合計が0以上であれば必ずこの地点から1周できることが保証される)

## 特性・トレードオフ

- **全探索を避ける貪欲な証明の美しさ**: 一見するとどの地点が出発点になるかを判定するには全地点を試す必要がありそうだが、「タンク残量が最も落ち込む直前の区間はどこから出発しても失敗する」という観察だけで、O(n)の1回の走査に落とし込める。この手の「貪欲な観察が全探索を代替する」という発想は競技プログラミングで頻出するパターンである
- **累積和・[いもす法](/algorithms/imos-method)との親和性**: 「区間の累積値がどこで最小になるか」を追跡するというアイデアは、[いもす法](/algorithms/imos-method)のような差分累積の技法とも通じるものがあり、区間・周回問題を扱う際の基本的な考え方の一つとして応用が利く
- **合計値による実行可能性の事前判定**: 実際にどの地点から出発するかを求める前に、全体の合計`net`の符号だけで「そもそも実行可能な出発点が存在するか」を即座に判定できる点も、この問題の貪欲な性質の分かりやすい表れである
- **使いどころ**: 配送・巡回ルートの燃料計画、循環型のスケジューリング問題(タスクの依存関係が円環状になっている場合の実行可能な開始点探索)、競技プログラミングにおける貪欲法の典型パターンとしての教育的な題材

## 実装例

```python
def can_complete_circuit(gas: list[int], cost: list[int]) -> int:
    """1周できる出発点のインデックスを返す。存在しなければ-1を返す。"""
    total_tank = 0
    current_tank = 0
    start = 0

    for i in range(len(gas)):
        net = gas[i] - cost[i]
        total_tank += net
        current_tank += net
        if current_tank < 0:
            start = i + 1
            current_tank = 0

    return start if total_tank >= 0 else -1
```

```typescript
function canCompleteCircuit(gas: number[], cost: number[]): number {
  let totalTank = 0;
  let currentTank = 0;
  let start = 0;

  for (let i = 0; i < gas.length; i++) {
    const net = gas[i] - cost[i];
    totalTank += net;
    currentTank += net;
    if (currentTank < 0) {
      start = i + 1;
      currentTank = 0;
    }
  }

  return totalTank >= 0 ? start : -1;
}
```

```cpp
#include <vector>

int canCompleteCircuit(const std::vector<int>& gas, const std::vector<int>& cost) {
    int totalTank = 0, currentTank = 0, start = 0;

    for (size_t i = 0; i < gas.size(); i++) {
        int net = gas[i] - cost[i];
        totalTank += net;
        currentTank += net;
        if (currentTank < 0) {
            start = static_cast<int>(i) + 1;
            currentTank = 0;
        }
    }

    return totalTank >= 0 ? start : -1;
}
```

```rust
fn can_complete_circuit(gas: &[i32], cost: &[i32]) -> i32 {
    let mut total_tank = 0;
    let mut current_tank = 0;
    let mut start = 0i32;

    for i in 0..gas.len() {
        let net = gas[i] - cost[i];
        total_tank += net;
        current_tank += net;
        if current_tank < 0 {
            start = i as i32 + 1;
            current_tank = 0;
        }
    }

    if total_tank >= 0 { start } else { -1 }
}
```

```csharp
static int CanCompleteCircuit(int[] gas, int[] cost)
{
    int totalTank = 0, currentTank = 0, start = 0;

    for (int i = 0; i < gas.Length; i++)
    {
        int net = gas[i] - cost[i];
        totalTank += net;
        currentTank += net;
        if (currentTank < 0)
        {
            start = i + 1;
            currentTank = 0;
        }
    }

    return totalTank >= 0 ? start : -1;
}
```
