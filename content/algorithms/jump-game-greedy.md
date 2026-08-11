---
name: ジャンプゲーム(貪欲到達可能性判定)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n)
summary: 各マスに書かれた最大ジャンプ距離をもとに配列の末尾まで到達できるかを、各マスからの飛び先を個別に試すことなく「今までに到達可能な最遠マス」を1本の変数で追跡するだけでO(n)判定する。
---

## 概要

配列の各マス`i`に「そのマスから最大`nums[i]`マス先までジャンプできる」という値が書かれているとき、マス0から出発して最後のマスまで到達できるかを判定する「ジャンプゲーム」は、素朴に考えると各マスから可能な全てのジャンプ先を再帰的に試す必要がありそうに見える(指数時間の探索木)。しかし、この問題は**「今のマスまでの情報を使って、これまでに到達可能だと分かっている最も遠いマスがどこか」だけを1つの変数で追跡する**という貪欲な視点に立つと、配列を1回走査するだけのO(n)で解ける。個々のジャンプの経路そのものではなく「到達可能範囲がどこまで伸びるか」という集約された情報に着目する点が、この貪欲法の核心である。

## 仕組み

1. 「これまでに到達可能だと判明している最も遠いマスの位置」を表す変数`farthest`を0で初期化する
2. 配列の先頭から順にマス`i`を見ていく。ただし`i`が`farthest`を超えていたら、そのマスにはそもそも到達できないことが確定しているため、その時点で「到達不可能」と判定して終了する
3. `i`に到達できることが分かっているとき、マス`i`からのジャンプで到達できる最遠マス`i + nums[i]`を計算し、`farthest`をその値で更新する(`farthest = max(farthest, i + nums[i])`)
4. `farthest`が配列の最後のインデックス以上になった時点で、「最後のマスに到達可能」と判定して終了する(まだ`i`がそこまで進んでいなくても、到達可能性が確定した時点で判定を打ち切れる)
5. 配列の最後まで走査して`farthest`が最後のインデックスに届かなければ、「到達不可能」と判定する

## 特性・トレードオフ

- **個々の経路ではなく到達可能範囲の集約に着目する発想**: 「マス0からどう飛べば最後に着けるか」という具体的な経路を追跡する代わりに、「これまでの情報を総合すると、どこまで到達可能と言えるか」という抽象化された量だけを追跡することで、組み合わせ爆発を避けられる。この「集約された状態量だけを貪欲に更新する」という考え方は、[ガソリンスタンド問題](/algorithms/gas-station-greedy)の累積タンク残量の追跡とも共通する発想である
- **最小ジャンプ回数を求める拡張**: 到達可能かどうかの判定だけでなく、「最後のマスまで到達するのに必要な最小ジャンプ回数」を求める発展問題も、同じ`farthest`の考え方に「現在のジャンプ範囲の境界」を追加で管理することで、同じくO(n)で解ける(幅優先探索の各階層の境界を貪欲に追跡するのと同じ発想)
- **動的計画法との比較**: 各マスへの到達可能性を`dp[i] = true/false`として素朴に動的計画法で解くとO(n²)(各マスについて、それ以前の全マスからジャンプできるか確認する必要がある)になるが、貪欲法は状態を`farthest`という1つのスカラー値に圧縮することで、同じ問題をO(n)まで落とし込んでいる
- **使いどころ**: 競技プログラミングにおける到達可能性判定問題の典型パターン、ネットワークのホップ数制約下での到達可能性解析、ゲームにおけるジャンプ・移動力を使った到達可能マス判定、資源の消費可能距離を使った経路の実行可能性判定全般

## 実装例

```python
def can_jump(nums: list[int]) -> bool:
    farthest = 0
    for i, num in enumerate(nums):
        if i > farthest:
            return False
        farthest = max(farthest, i + num)
        if farthest >= len(nums) - 1:
            return True
    return True
```

```typescript
function canJump(nums: number[]): boolean {
  let farthest = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > farthest) return false;
    farthest = Math.max(farthest, i + nums[i]);
    if (farthest >= nums.length - 1) return true;
  }
  return true;
}
```

```cpp
#include <vector>
#include <algorithm>

bool canJump(const std::vector<int>& nums) {
    int farthest = 0;
    for (size_t i = 0; i < nums.size(); i++) {
        if (static_cast<int>(i) > farthest) return false;
        farthest = std::max(farthest, static_cast<int>(i) + nums[i]);
        if (farthest >= static_cast<int>(nums.size()) - 1) return true;
    }
    return true;
}
```

```rust
fn can_jump(nums: &[i32]) -> bool {
    let mut farthest = 0i32;
    for (i, &num) in nums.iter().enumerate() {
        if i as i32 > farthest {
            return false;
        }
        farthest = farthest.max(i as i32 + num);
        if farthest >= nums.len() as i32 - 1 {
            return true;
        }
    }
    true
}
```

```csharp
static bool CanJump(int[] nums)
{
    int farthest = 0;
    for (int i = 0; i < nums.Length; i++)
    {
        if (i > farthest) return false;
        farthest = Math.Max(farthest, i + nums[i]);
        if (farthest >= nums.Length - 1) return true;
    }
    return true;
}
```
