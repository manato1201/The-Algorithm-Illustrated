---
name: ブロークンプロファイルDP(タイル敷き詰め問題)
category: 動的計画法
subcategory: ナップサック・組合せ最適化
complexity: O(H・W・2^H)
summary: グリッドを1マスずつ埋めながら、埋まっている境界線の凹凸をビットマスクで状態として持つ高度なDPで、ドミノタイルの敷き詰め方などを数え上げる。
---

## 概要

「H×Wのグリッドを、2マス分の大きさを持つドミノ型のタイルだけで(隙間なく、はみ出さずに)敷き詰める方法は何通りあるか」——このような2次元の敷き詰め問題は、マス目の状態の組み合わせが指数的に爆発するため、素朴な全探索では手に負えない。**ブロークンプロファイルDP**(差し込みDP、輪郭線DPとも呼ばれる)は、グリッドを左上から右下へマス目単位で走査しながら、「すでに埋まっているマスと、まだ埋まっていないマスの境界線(プロファイル)」の凹凸具合をビットマスクとして状態に持つことで、この種の問題を現実的な計算量で解く高度なDPテクニックである。[巡回セールスマン問題(ビットDP)](/algorithms/tsp-bitdp)がビットで「訪問済み集合」を表すのに対し、こちらは「境界線の形状」を表す点が特徴。

## 仕組み

グリッドを行方向・列方向に1マスずつ、左上から右下に向かって走査していくと考える。今処理しようとしているマスの直前までの状態を、**「現在の走査位置を基準に、直近H個(グリッドの高さ)のマスが埋まっているかどうか」を表すHビットのビットマスク**で表現する——これが「プロファイル(輪郭線)」である。

1. `dp[i][j][mask]` を「マス(i, j)まで処理し終えた時点で、プロファイルの状態がmaskであるような敷き詰め方の総数」と定義する
2. マスを1つずつ順番に処理する。各マスについて、そのマスをどう扱うかで場合分けする:
   - **すでにタイルで埋まっている**(プロファイルの対応するビットが1): 何もせず次のマスへ進む(ビットを0に戻して引き継ぐ)
   - **空いている場合**、そのマスを埋めるための選択肢を試す:
     - 横向きのドミノを置く(右隣のマスも一緒に埋める。右端でなく、右隣も空いている必要がある)
     - 縦向きのドミノを置く(1つ下のマスも一緒に埋める。プロファイルの対応するビットで表現し、1つ下の行を処理するときにそのビットが処理済みとして扱われる)
     - どちらも置けない場合はその配置は不可能として棄却する
3. マスを1つ処理するごとにビットマスクを1ビットシフトさせながら更新し、行の末尾に達したら次の行の先頭へ移る、という形でプロファイルを「グリッド全体を這うように」動かしていく
4. 最終的に全マスを処理し終え、プロファイルが「どこにも未確定のマスが残っていない」状態(全マス処理済み)になっている場合の総数を数え上げる

「境界線の凹凸」という2次元的な情報を、1次元のビット列に落とし込んで持ち運ぶ点がこの手法の核心であり、2次元グリッドを1次元のDPとして処理できるようにする巧妙な状態設計と言える。

## 特性・トレードオフ

- **計算量**: おおよそO(H・W・2^H)。ビットマスクの状態数が2^H(Hはグリッドの高さ)通りあるため、**高さHが大きくなると指数的に計算量が増える**。実用上はH(またはWとHのうち小さい方)を20前後までに抑えるのが目安になる
- **走査方向の工夫**: 高さと幅のうち小さい方を「プロファイルの長さ」に使うことで2^Hを最小化できる(H×WグリッドでもH>Wなら90度回転させて考えればよい)。これだけで計算量が大きく変わるため実装上重要な最適化
- **応用範囲の広さ**: ドミノタイルの敷き詰め数え上げが代表例だが、より一般に「グリッド上の局所的な配置制約(特定の形のピースを隙間なく敷き詰める、隣接マスに関する制約を満たす経路を数えるなど)」を扱うパズル的な問題全般に応用できる。パズルゲームの盤面の可能な状態数を数えるといった用途にも使われる
- **実装の複雑さ**: 状態遷移の場合分け(横に置く・縦に置く・空けておく、境界での特殊処理など)が多く、他のDPに比べて実装ミスが起きやすい。境界線をどのマスの並びとして定義するか(走査順序と整合させる)を明確にしてから実装するのが定石
- **使いどころ**: 競技プログラミングにおける「グリッドの敷き詰め方の数え上げ」系の問題、盤面パズルの状態数え上げ、VLSI設計におけるパターン配置の数え上げなど

## 実装例

以下は「H×Wのグリッドをドミノタイル(1×2または2×1)で完全に敷き詰める方法の総数」を、行ごとに列を1マスずつ埋める形式のブロークンプロファイルDPで求める例。

```python
def count_domino_tilings(h: int, w: int) -> int:
    full_mask = (1 << h) - 1
    # dp[mask]: 現在の行までの処理で、次の行に「はみ出して埋まっている」マスの集合がmask
    dp = {0: 1}

    for _ in range(w):
        ndp: dict[int, int] = {}

        def fill(col: int, mask: int, next_mask: int, ways: int) -> None:
            if col == h:
                ndp[next_mask] = ndp.get(next_mask, 0) + ways
                return
            if mask & (1 << col):
                # 前の行から縦ドミノで既に埋まっている
                fill(col + 1, mask, next_mask, ways)
                return
            # 縦ドミノ: 次の行に持ち越す
            fill(col + 1, mask, next_mask | (1 << col), ways)
            # 横ドミノ: 同じ行の隣のマスを埋める
            if col + 1 < h and not (mask & (1 << (col + 1))):
                fill(col + 2, mask, next_mask, ways)

        for mask, ways in dp.items():
            fill(0, mask, 0, ways)
        dp = ndp

    return dp.get(0, 0)
```

```typescript
function countDominoTilings(h: number, w: number): number {
  let dp = new Map<number, number>([[0, 1]]);

  for (let row = 0; row < w; row++) {
    const ndp = new Map<number, number>();

    function fill(
      col: number,
      mask: number,
      nextMask: number,
      ways: number,
    ): void {
      if (col === h) {
        ndp.set(nextMask, (ndp.get(nextMask) ?? 0) + ways);
        return;
      }
      if (mask & (1 << col)) {
        // 前の行から縦ドミノで既に埋まっている
        fill(col + 1, mask, nextMask, ways);
        return;
      }
      // 縦ドミノ: 次の行に持ち越す
      fill(col + 1, mask, nextMask | (1 << col), ways);
      // 横ドミノ: 同じ行の隣のマスを埋める
      if (col + 1 < h && !(mask & (1 << (col + 1)))) {
        fill(col + 2, mask, nextMask, ways);
      }
    }

    for (const [mask, ways] of dp) {
      fill(0, mask, 0, ways);
    }
    dp = ndp;
  }

  return dp.get(0) ?? 0;
}
```

```cpp
#include <unordered_map>
#include <functional>

long long countDominoTilings(int h, int w) {
    std::unordered_map<int, long long> dp;
    dp[0] = 1;

    for (int row = 0; row < w; row++) {
        std::unordered_map<int, long long> ndp;

        std::function<void(int, int, int, long long)> fill =
            [&](int col, int mask, int nextMask, long long ways) {
                if (col == h) {
                    ndp[nextMask] += ways;
                    return;
                }
                if (mask & (1 << col)) {
                    fill(col + 1, mask, nextMask, ways);
                    return;
                }
                fill(col + 1, mask, nextMask | (1 << col), ways);
                if (col + 1 < h && !(mask & (1 << (col + 1)))) {
                    fill(col + 2, mask, nextMask, ways);
                }
            };

        for (const auto& [mask, ways] : dp) {
            fill(0, mask, 0, ways);
        }
        dp = std::move(ndp);
    }

    return dp.count(0) ? dp[0] : 0;
}
```

```rust
use std::collections::HashMap;

fn count_domino_tilings(h: usize, w: usize) -> i64 {
    let mut dp: HashMap<usize, i64> = HashMap::new();
    dp.insert(0, 1);

    for _ in 0..w {
        let mut ndp: HashMap<usize, i64> = HashMap::new();

        fn fill(
            col: usize,
            h: usize,
            mask: usize,
            next_mask: usize,
            ways: i64,
            ndp: &mut HashMap<usize, i64>,
        ) {
            if col == h {
                *ndp.entry(next_mask).or_insert(0) += ways;
                return;
            }
            if mask & (1 << col) != 0 {
                fill(col + 1, h, mask, next_mask, ways, ndp);
                return;
            }
            fill(col + 1, h, mask, next_mask | (1 << col), ways, ndp);
            if col + 1 < h && mask & (1 << (col + 1)) == 0 {
                fill(col + 2, h, mask, next_mask, ways, ndp);
            }
        }

        for (&mask, &ways) in dp.iter() {
            fill(0, h, mask, 0, ways, &mut ndp);
        }
        dp = ndp;
    }

    *dp.get(&0).unwrap_or(&0)
}
```

```csharp
using System.Collections.Generic;

static class ProfileDp
{
    public static long CountDominoTilings(int h, int w)
    {
        var dp = new Dictionary<int, long> { [0] = 1 };

        for (int row = 0; row < w; row++)
        {
            var ndp = new Dictionary<int, long>();

            void Fill(int col, int mask, int nextMask, long ways)
            {
                if (col == h)
                {
                    ndp[nextMask] = ndp.GetValueOrDefault(nextMask) + ways;
                    return;
                }
                if ((mask & (1 << col)) != 0)
                {
                    Fill(col + 1, mask, nextMask, ways);
                    return;
                }
                Fill(col + 1, mask, nextMask | (1 << col), ways);
                if (col + 1 < h && (mask & (1 << (col + 1))) == 0)
                {
                    Fill(col + 2, mask, nextMask, ways);
                }
            }

            foreach (var (mask, ways) in dp)
            {
                Fill(0, mask, 0, ways);
            }
            dp = ndp;
        }

        return dp.GetValueOrDefault(0);
    }
}
```
