---
name: 鳩の巣ソート(Pigeonhole Sort)
category: ソート
subcategory: 非比較ベース
complexity: O(n + range)(rangeは値の取りうる範囲)
summary: 値の範囲と同じ数の「巣穴」を用意し、各要素を対応する巣穴に直接収めることで比較を一切行わずに整列する、カウンティングソートに近い非比較ソート。
---

## 概要

[カウンティングソート](/algorithms/counting-sort)が各値の出現回数を数えるのに対し、鳩の巣ソートは「鳩の巣原理」(`n`羽の鳩を`n`個より少ない巣に入れると必ずどこかの巣に2羽以上入る、という組み合わせ論の原理)の名を冠し、値の取りうる範囲の数だけ「巣穴」(バケットに近いリスト)を用意し、各要素をその値に対応する巣穴へ直接振り分けることで整列する。カウンティングソートが「個数を数えてから位置を計算する」のに対し、鳩の巣ソートは「要素そのものを巣穴に直接格納する」という、より直接的で素朴なアプローチを取る。

## 仕組み

1. 配列内の最小値`min`と最大値`max`を求め、値の範囲`range = max - min + 1`個の巣穴(空のリスト)を用意する
2. 配列の各要素`x`を、対応する巣穴(インデックス`x - min`)へ追加する
3. 巣穴を順番(インデックスの昇順)に走査し、各巣穴の中身をそのまま出力配列へ書き出していく(同じ巣穴に複数の要素が入っている場合はその個数だけ全て出力する)
4. 全巣穴を走査し終えると、配列が整列された状態で得られる

## 特性・トレードオフ

- **計算量**: 巣穴への振り分けが`O(n)`、巣穴の走査が`O(range)`のため、全体で`O(n + range)`。[カウンティングソート](/algorithms/counting-sort)と全く同じ計算量のクラスに属し、実質的にほぼ同じアルゴリズムのバリエーションと見なせる
- **[カウンティングソート](/algorithms/counting-sort)との違い**: カウンティングソートは各値の「個数」だけを配列に記録し、後から出力位置を計算するのに対し、鳩の巣ソートは要素そのもの(または元のインデックス)を巣穴に格納する。このため鳩の巣ソートはメモリ効率でやや劣るが、実装がより直感的で、値に付随する追加情報(元のレコード全体など)を保持したまま整列したい場合に扱いやすい
- **値の範囲が計算量を支配する**: `range`が`n`に比べて極端に大きい(例えば32ビット整数全体を扱う)場合、巣穴の数が膨大になり非効率になる——[基数ソート](/algorithms/radix-sort)のように桁ごとに分割して処理する方が適することが多い
- **使いどころ**: 値の範囲が要素数に対して十分小さいことが分かっているデータ(試験の点数、年齢、小さな整数IDなど)の高速な整列、[カウンティングソート](/algorithms/counting-sort)の直感的な理解のための導入

## 実装例

```python
def pigeonhole_sort(arr: list[int]) -> list[int]:
    if not arr:
        return []
    lo, hi = min(arr), max(arr)
    size = hi - lo + 1
    holes: list[list[int]] = [[] for _ in range(size)]
    for v in arr:
        holes[v - lo].append(v)
    result = []
    for hole in holes:
        result.extend(hole)
    return result
```

```typescript
function pigeonholeSort(arr: number[]): number[] {
  if (arr.length === 0) return [];
  const lo = Math.min(...arr);
  const hi = Math.max(...arr);
  const size = hi - lo + 1;
  const holes: number[][] = Array.from({ length: size }, () => []);
  for (const v of arr) holes[v - lo].push(v);
  const result: number[] = [];
  for (const hole of holes) result.push(...hole);
  return result;
}
```

```cpp
#include <vector>
#include <algorithm>

std::vector<int> pigeonholeSort(const std::vector<int>& arr) {
    if (arr.empty()) return {};
    int lo = *std::min_element(arr.begin(), arr.end());
    int hi = *std::max_element(arr.begin(), arr.end());
    int size = hi - lo + 1;
    std::vector<std::vector<int>> holes(size);
    for (int v : arr) holes[v - lo].push_back(v);
    std::vector<int> result;
    result.reserve(arr.size());
    for (auto& hole : holes) {
        result.insert(result.end(), hole.begin(), hole.end());
    }
    return result;
}
```

```rust
fn pigeonhole_sort(arr: &[i32]) -> Vec<i32> {
    if arr.is_empty() {
        return Vec::new();
    }
    let lo = *arr.iter().min().unwrap();
    let hi = *arr.iter().max().unwrap();
    let size = (hi - lo + 1) as usize;
    let mut holes: Vec<Vec<i32>> = vec![Vec::new(); size];
    for &v in arr {
        holes[(v - lo) as usize].push(v);
    }
    let mut result = Vec::with_capacity(arr.len());
    for hole in holes {
        result.extend(hole);
    }
    result
}
```

```csharp
static int[] PigeonholeSort(int[] arr)
{
    if (arr.Length == 0) return Array.Empty<int>();
    int lo = arr.Min(), hi = arr.Max();
    int size = hi - lo + 1;
    var holes = new List<int>[size];
    for (int i = 0; i < size; i++) holes[i] = new List<int>();
    foreach (int v in arr) holes[v - lo].Add(v);
    var result = new List<int>(arr.Length);
    foreach (var hole in holes) result.AddRange(hole);
    return result.ToArray();
}
```
