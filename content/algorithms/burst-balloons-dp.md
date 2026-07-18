---
name: 風船割りDP(Burst Balloons)
category: 動的計画法
subcategory: 区間分割DP
complexity: O(n³)(nは風船の数)
summary: n個の風船を1つずつ割っていき、割った風船と両隣の値の積を得点として総得点を最大化する問題で、「最後にどの風船を割るか」を軸に区間を捉え直す逆転の発想が解法の鍵になる区間分割DPの応用問題。
---

## 概要

`n`個の風船が一列に並んでおり、それぞれに数値が書かれている。風船を1つ割るたびに、その風船に書かれた数値と、その時点での両隣に残っている風船の数値(左右の風船がすでに割られていれば1とみなす)の積が得点として加算される。全ての風船を割り終えたときの総得点を最大化する割る順番を求めたい。この問題の難しさは、風船を割る順番によって「両隣」が刻々と変化してしまう点にあり、素朴に「最初にどの風船を割るか」を軸に考えると部分問題が独立しなくなってしまう。この問題を解く鍵は**逆転の発想**——「最初に割る風船」ではなく「区間の中で最後に割る風船」を軸に考えることで、区間が左右の独立した部分問題へきれいに分割できる、動的計画法の設計における発想の転換の重要性を学べる良問である。

## 仕組み

1. 風船の並びの両端に、値1の番兵(ダミーの風船)を追加する(`nums = [1, ...元の風船の値..., 1]`)。これにより「端の風船が割られた後は両隣が存在しない(=1として扱う)」という境界条件を、番兵によって統一的に扱える
2. `dp[i][j]`を「開区間`(i, j)`の中の風船(`i`と`j`自身は番兵または既に確定した境界)を全て割り終えたときに得られる最大得点」とする2次元テーブルを用意する
3. **逆転の発想**: 区間`(i, j)`の中で「最後に割る風船`k`」に着目する。`k`を最後まで残しておけば、`k`を割る時点での両隣はまだ割られていない`nums[i]`と`nums[j]`のままである(区間内の他の風船は全て`k`より先に割られているため)。したがって`k`を割ったときの得点は`nums[i] × nums[k] × nums[j]`と、区間の境界値だけで確定的に計算できる
4. 遷移: `dp[i][j] = max over k in (i,j) of ( dp[i][k] + nums[i]*nums[k]*nums[j] + dp[k][j] )`——区間`(i,j)`を、`k`を最後に割ることを前提に、`(i,k)`と`(k,j)`という2つの独立した部分問題に分割する
5. 区間の長さが短いものから長いものへ順にテーブルを埋めていき、最終的に`dp[0][n+1]`(番兵を含む全区間)が答えになる

## 特性・トレードオフ

- **計算量**: 区間の数が`O(n²)`、各区間で`k`の候補を`O(n)`通り試すため全体で`O(n³)`——[行列連鎖乗算問題](/algorithms/matrix-chain-multiplication)や[最適二分探索木](/algorithms/optimal-binary-search-tree)と同じ区間分割DPの計算量に落ち着く
- **「最初」ではなく「最後」に着目するという発想の転換**: この問題を解く上で最も重要な洞察は、時系列順(最初に割る風船)ではなく逆順(最後に割る風船)で区間を分割する発想に切り替える点にある——素朴な発想では部分問題が独立しない場合でも、視点を変えることで独立した部分問題に分解できることがある、という動的計画法の設計上の重要な教訓を示している
- **番兵の導入という定石**: 区間の両端に値1のダミー要素を追加することで、境界条件(端の風船が割られた後の「隣」の扱い)を特別扱いせずに済む——区間DPやしゃくとり法など、様々なアルゴリズムで使われる汎用的なテクニック
- **使いどころ**: 直接の実務応用は限定的だが、動的計画法における「時系列的な操作順序を、区間分割の順序に読み替える」という設計パターンの教材として、競技プログラミングやアルゴリズム面接で頻出する定番の応用問題

## 実装例

```python
def max_coins(nums: list[int]) -> int:
    balloons = [1] + nums + [1]  # 両端に番兵を追加
    n = len(balloons)
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n):
        for i in range(0, n - length):
            j = i + length
            best = 0
            for k in range(i + 1, j):  # kを「最後に割る風船」とみなす
                val = dp[i][k] + balloons[i] * balloons[k] * balloons[j] + dp[k][j]
                best = max(best, val)
            dp[i][j] = best
    return dp[0][n - 1]


# 例: nums=[3, 1, 5, 8] -> 最大得点 167 (LeetCode 312の定番例)
```

```typescript
function maxCoins(nums: number[]): number {
  const balloons = [1, ...nums, 1];
  const n = balloons.length;
  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let length = 2; length < n; length++) {
    for (let i = 0; i < n - length; i++) {
      const j = i + length;
      let best = 0;
      for (let k = i + 1; k < j; k++) {
        const val = dp[i][k] + balloons[i] * balloons[k] * balloons[j] + dp[k][j];
        if (val > best) best = val;
      }
      dp[i][j] = best;
    }
  }
  return dp[0][n - 1];
}
```

```cpp
#include <vector>
#include <algorithm>

int maxCoins(std::vector<int> nums) {
    std::vector<int> balloons;
    balloons.push_back(1);
    for (int v : nums) balloons.push_back(v);
    balloons.push_back(1);
    int n = static_cast<int>(balloons.size());
    std::vector<std::vector<int>> dp(n, std::vector<int>(n, 0));
    for (int length = 2; length < n; length++) {
        for (int i = 0; i < n - length; i++) {
            int j = i + length;
            int best = 0;
            for (int k = i + 1; k < j; k++) {
                int val = dp[i][k] + balloons[i] * balloons[k] * balloons[j] + dp[k][j];
                best = std::max(best, val);
            }
            dp[i][j] = best;
        }
    }
    return dp[0][n - 1];
}
```

```rust
fn max_coins(nums: &[i32]) -> i32 {
    let mut balloons = vec![1];
    balloons.extend_from_slice(nums);
    balloons.push(1);
    let n = balloons.len();
    let mut dp = vec![vec![0i32; n]; n];
    for length in 2..n {
        for i in 0..(n - length) {
            let j = i + length;
            let mut best = 0;
            for k in (i + 1)..j {
                let val = dp[i][k] + balloons[i] * balloons[k] * balloons[j] + dp[k][j];
                best = best.max(val);
            }
            dp[i][j] = best;
        }
    }
    dp[0][n - 1]
}
```

```csharp
static int MaxCoins(int[] nums)
{
    var balloons = new int[nums.Length + 2];
    balloons[0] = 1;
    balloons[^1] = 1;
    for (int i = 0; i < nums.Length; i++) balloons[i + 1] = nums[i];
    int n = balloons.Length;
    var dp = new int[n, n];
    for (int length = 2; length < n; length++)
    {
        for (int i = 0; i < n - length; i++)
        {
            int j = i + length;
            int best = 0;
            for (int k = i + 1; k < j; k++)
            {
                int val = dp[i, k] + balloons[i] * balloons[k] * balloons[j] + dp[k, j];
                if (val > best) best = val;
            }
            dp[i, j] = best;
        }
    }
    return dp[0, n - 1];
}
```
