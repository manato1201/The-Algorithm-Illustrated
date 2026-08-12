---
name: 転倒数(BITによる数え上げ)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(n log n)
summary: 配列を右から左へ走査しながら[Fenwick木(BIT)](/algorithms/fenwick-tree)に値を1つずつ挿入し、挿入のたびに「既に挿入済みで自分より小さい値の個数」を累積和クエリで数えることで、配列の乱れ具合(転倒数)をO(n log n)で求める。
---

## 概要

配列の「転倒数」とは、`i < j`かつ`a[i] > a[j]`となるペア`(i,j)`の個数のことで、配列が完全にソートされていれば0、逆順に並んでいれば最大値を取る、配列の**乱れ具合**を表す指標である。素朴に全てのペアを調べるとO(n²)かかるが、[座標圧縮](/algorithms/coordinate-compression)と[Fenwick木(BIT)](/algorithms/fenwick-tree)を組み合わせることで、O(n log n)まで高速化できる、競技プログラミングで頻出の典型的な応用パターンである。マージソートの過程で転倒数を数える方法もあるが、BITを使う方法は「値の集合に対する累積和クエリ」という汎用的なデータ構造の実践的な使い方を学ぶ良い教材でもある。

## 仕組み

1. 配列の値が大きい範囲に散らばっている場合は、まず[座標圧縮](/algorithms/coordinate-compression)を行い、値を`0`から`n-1`の順位に変換しておく(BITのインデックスとして使うため)
2. 配列の**右端から左端へ向かって**(逆順に)走査する
3. 各要素`a[i]`について、**BITに既に挿入済みの値の中で、`a[i]`より小さい値がいくつあるか**を、BITの累積和クエリ(`query(a[i] - 1)`)で求める。この値が、`a[i]`が(右側にある、既に処理済みの)いくつの要素との間で転倒ペアを作るかを表す
4. 求めた個数を転倒数の合計に加算する
5. `a[i]`をBITに挿入する(該当する位置のカウントを+1する)
6. 2〜5を配列の左端まで繰り返す。全要素の処理が終わったときの合計が、配列全体の転倒数となる

## 特性・トレードオフ

- **BITの「累積和クエリ+点更新」という基本操作への典型的な帰着**: 転倒数を求めるという一見複雑な問題が、「今までに挿入した値のうち、ある値より小さいものの個数」という単純な累積和クエリに帰着できる、という発想の転換が学びどころである。同様の帰着パターンは、区間内の値の出現回数の集計、順位に関する統計量の計算など、[Fenwick木](/algorithms/fenwick-tree)を使う多くの競技プログラミング問題に共通して現れる
- **マージソートベースの転倒数計算との比較**: マージソートの併合過程で「左側の要素が右側より大きい場合、その時点で残っている右側の要素数だけ転倒がある」と数える方法でも同じO(n log n)が達成できる。BIT法は「値の集合に対するクエリ」という視点で問題を捉え直す汎用性がある一方、マージソート法は追加のデータ構造を必要としないという実装上のシンプルさがある
- **オンライン性という利点**: BIT法は配列を1回走査するだけで、各時点での「これまでの転倒数」を得ることもできる(累積的な結果を保持しながら進められる)。これは、ストリーミングデータのように配列全体が事前に分からない状況にも対応しやすいという実務上の利点になりうる
- **使いどころ**: 数列の乱雑さ・ソートの手間の定量化、レーティングシステムにおける順位変動の分析、競技プログラミングにおける区間クエリ問題の典型パターンとしての教育的な題材、协調フィルタリングにおけるランキングの一致度評価(Kendallのτ相関係数の計算とも関連する)

## 実装例

```python
def count_inversions(arr: list[int]) -> int:
    sorted_unique = sorted(set(arr))
    rank = {v: i + 1 for i, v in enumerate(sorted_unique)}  # 1-indexed for BIT
    n = len(sorted_unique)
    bit = [0] * (n + 1)

    def update(i: int) -> None:
        while i <= n:
            bit[i] += 1
            i += i & (-i)

    def query(i: int) -> int:
        total = 0
        while i > 0:
            total += bit[i]
            i -= i & (-i)
        return total

    inversions = 0
    for value in reversed(arr):
        r = rank[value]
        inversions += query(r - 1)  # 既に挿入済みで、自分より小さい値の個数
        update(r)

    return inversions
```

```typescript
function countInversions(arr: number[]): number {
  const sortedUnique = [...new Set(arr)].sort((a, b) => a - b);
  const rank = new Map(sortedUnique.map((v, i) => [v, i + 1]));
  const n = sortedUnique.length;
  const bit = new Array(n + 1).fill(0);

  function update(i: number): void {
    while (i <= n) {
      bit[i]++;
      i += i & -i;
    }
  }

  function query(i: number): number {
    let total = 0;
    while (i > 0) {
      total += bit[i];
      i -= i & -i;
    }
    return total;
  }

  let inversions = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    const r = rank.get(arr[i])!;
    inversions += query(r - 1);
    update(r);
  }

  return inversions;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <set>
#include <map>

long long countInversions(const std::vector<int>& arr) {
    std::set<int> uniqueVals(arr.begin(), arr.end());
    std::vector<int> sortedUnique(uniqueVals.begin(), uniqueVals.end());
    std::map<int, int> rank;
    for (size_t i = 0; i < sortedUnique.size(); i++) rank[sortedUnique[i]] = static_cast<int>(i) + 1;

    int n = static_cast<int>(sortedUnique.size());
    std::vector<int> bit(n + 1, 0);

    auto update = [&](int i) {
        while (i <= n) { bit[i]++; i += i & (-i); }
    };
    auto query = [&](int i) {
        int total = 0;
        while (i > 0) { total += bit[i]; i -= i & (-i); }
        return total;
    };

    long long inversions = 0;
    for (auto it = arr.rbegin(); it != arr.rend(); ++it) {
        int r = rank[*it];
        inversions += query(r - 1);
        update(r);
    }

    return inversions;
}
```

```rust
use std::collections::{BTreeSet, HashMap};

fn count_inversions(arr: &[i64]) -> i64 {
    let unique_vals: BTreeSet<i64> = arr.iter().cloned().collect();
    let sorted_unique: Vec<i64> = unique_vals.into_iter().collect();
    let rank: HashMap<i64, usize> = sorted_unique.iter().enumerate().map(|(i, &v)| (v, i + 1)).collect();

    let n = sorted_unique.len();
    let mut bit = vec![0i64; n + 1];

    let update = |bit: &mut Vec<i64>, mut i: usize| {
        while i <= n {
            bit[i] += 1;
            i += i & i.wrapping_neg();
        }
    };
    let query = |bit: &Vec<i64>, mut i: usize| -> i64 {
        let mut total = 0;
        while i > 0 {
            total += bit[i];
            i -= i & i.wrapping_neg();
        }
        total
    };

    let mut inversions = 0;
    for &value in arr.iter().rev() {
        let r = rank[&value];
        inversions += query(&bit, r - 1);
        update(&mut bit, r);
    }

    inversions
}
```

```csharp
static long CountInversions(int[] arr)
{
    var sortedUnique = arr.Distinct().OrderBy(v => v).ToList();
    var rank = new Dictionary<int, int>();
    for (int i = 0; i < sortedUnique.Count; i++) rank[sortedUnique[i]] = i + 1;

    int n = sortedUnique.Count;
    var bit = new long[n + 1];

    void Update(int i) { while (i <= n) { bit[i]++; i += i & (-i); } }
    long Query(int i) { long total = 0; while (i > 0) { total += bit[i]; i -= i & (-i); } return total; }

    long inversions = 0;
    for (int i = arr.Length - 1; i >= 0; i--)
    {
        int r = rank[arr[i]];
        inversions += Query(r - 1);
        Update(r);
    }

    return inversions;
}
```
