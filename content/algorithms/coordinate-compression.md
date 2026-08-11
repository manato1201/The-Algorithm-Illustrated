---
name: 座標圧縮(Coordinate Compression)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(n log n)(ソートが支配的)
summary: 値そのものではなく「大小関係の順位」だけが重要な場面で、大きく疎な値域を0からn-1の連番に置き換え、配列やセグメント木のインデックスとして使えるようにする前処理。
---

## 概要

座標の値が`1`から`10^9`のように非常に大きい範囲に散らばっている一方、実際に登場する座標の個数は`n`個(例えば`n=10^5`)しかない、という状況は競技プログラミングで頻出する。このような入力に対してセグメント木やBIT(Fenwick木)、二次元累積和のような「配列のインデックスとして座標を直接使いたい」データ構造を適用しようとすると、値域`10^9`分の配列を確保するのは非現実的になる。座標圧縮は、**実際に登場する値だけをソートして重複を除き、それぞれの値を「小さい方から数えて何番目か」という0-indexedの順位に置き換える**という単純な前処理で、この問題を解決する。値そのものの大きさではなく大小関係の順位だけが問題の本質である場合(区間クエリ、いもす法、掃引線アルゴリズムなど)に、後続のアルゴリズムの計算量を値域`10^9`ではなく実際のデータ数`n`に抑えることができる。

## 仕組み

1. 入力中に登場する全ての座標値を1つの配列に集める
2. その配列をソートし、`std::unique`(C++)や`set`(Python)などで重複を除去する。これにより、実際に登場するユニークな値が昇順に並んだ配列`sorted_values`が得られる
3. 元の各座標値`v`について、`sorted_values`に対する二分探索で「`v`が何番目(0-indexed)に位置するか」を求める。この番号が`v`の**圧縮後の座標**になる
4. 以降の処理(セグメント木の構築、いもす法での差分配列、掃引線アルゴリズムでのイベントソートなど)では、元の座標値の代わりにこの圧縮後の番号(`0`から`ユニークな値の個数-1`までの連番)をインデックスとして使う
5. 元の値が必要になった場合は、`sorted_values[圧縮後の番号]`で逆引きできる

## 特性・トレードオフ

- **値域ではなくデータ数に比例した計算量**: 座標圧縮を挟むことで、後続のデータ構造(セグメント木・BITなど)のサイズが値域`10^9`ではなく実際のユニーク値の個数`O(n)`で済むようになり、メモリ・計算量の両方を大幅に削減できる
- **前処理のコストはO(n log n)**: ソートと二分探索によるコストがかかるが、これは後続のセグメント木構築(同じくO(n log n))と同程度であり、全体の計算量オーダーを悪化させない
- **絶対値が必要な処理には使えない**: 座標圧縮は大小関係の順位だけを保存し、値同士の実際の差(距離)の情報は失われる。「2点間の実距離を使う」ような処理には座標圧縮は適用できず、順位だけで完結する処理(区間の被覆判定、値の重複度カウントなど)に限られる
- **使いどころ**: 大きい値域上のセグメント木/BITの構築、いもす法・累積和による区間加算クエリ、掃引線アルゴリズム(矩形の面積和、線分交差判定)、順位を使ったLIS(最長増加部分列)の高速化

## 実装例

```python
from bisect import bisect_left

def compress_coordinates(values: list[int]) -> tuple[list[int], dict[int, int]]:
    sorted_values = sorted(set(values))
    rank = {v: i for i, v in enumerate(sorted_values)}
    return sorted_values, rank

def compress(values: list[int]) -> list[int]:
    """各値を0-indexedの順位に置き換えた配列を返す。"""
    sorted_values, rank = compress_coordinates(values)
    return [rank[v] for v in values]
```

```typescript
function compressCoordinates(values: number[]): { sortedValues: number[]; rank: Map<number, number> } {
  const sortedValues = Array.from(new Set(values)).sort((a, b) => a - b);
  const rank = new Map<number, number>();
  sortedValues.forEach((v, i) => rank.set(v, i));
  return { sortedValues, rank };
}

function compress(values: number[]): number[] {
  const { rank } = compressCoordinates(values);
  return values.map((v) => rank.get(v)!);
}
```

```cpp
#include <vector>
#include <algorithm>

std::vector<int> compress(std::vector<int> values) {
    std::vector<int> sortedValues = values;
    std::sort(sortedValues.begin(), sortedValues.end());
    sortedValues.erase(std::unique(sortedValues.begin(), sortedValues.end()), sortedValues.end());

    std::vector<int> result(values.size());
    for (size_t i = 0; i < values.size(); i++) {
        result[i] = std::lower_bound(sortedValues.begin(), sortedValues.end(), values[i]) - sortedValues.begin();
    }
    return result;
}
```

```rust
fn compress(values: &[i64]) -> Vec<usize> {
    let mut sorted_values = values.to_vec();
    sorted_values.sort();
    sorted_values.dedup();

    values
        .iter()
        .map(|v| sorted_values.binary_search(v).unwrap())
        .collect()
}
```

```csharp
static int[] Compress(int[] values)
{
    var sortedValues = values.Distinct().OrderBy(v => v).ToArray();
    var rank = new Dictionary<int, int>();
    for (int i = 0; i < sortedValues.Length; i++) rank[sortedValues[i]] = i;

    return values.Select(v => rank[v]).ToArray();
}
```
