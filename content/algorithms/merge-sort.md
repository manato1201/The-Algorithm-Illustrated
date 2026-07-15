---
name: マージソート
category: ソート
subcategory: 比較ベース
complexity: O(n log n)
summary: 分割統治+マージで安定ソートを実現する。外部ソートや並列化と相性が良い。
---

## 概要

「配列を半分に分け、それぞれを整列させ、最後にマージ(合流)する」という分割統治法の典型例。ジョン・フォン・ノイマンが1945年に考案したとされる、非常に息の長いアルゴリズムで、常に安定した性能を発揮することから外部ソートや大規模データ処理の基盤としても使われ続けている。

## 仕組み

1. 配列を半分に分割する(要素数が1になるまで再帰的に分割)
2. 要素数1の配列は既に整列済みとみなせるので、そこから「マージ」を開始する
3. 2つの整列済み部分列の先頭同士を比較し、小さい方を出力側に書き出す
4. 出力側の書き込み位置を1つ進め、比較した側のポインタも1つ進める
5. 片方の部分列を使い切ったら、残りをそのまま出力側にコピーする
6. これを再帰の各階層で繰り返し、最終的に1つの整列済み配列に統合する

この可視化では、マージ中に比較している2要素を「比較中」、出力側へ書き込む瞬間を「交換中」、ある区間のマージが完了したタイミングで「確定」の色に切り替えている。

## 特性・トレードオフ

- **計算量**: 常にO(n log n)。データの並び方に関わらず性能が安定している(最悪ケースでも遅くならない)
- **安定ソート**: マージ時に「左側の部分列を優先する」ことで、同じ値の相対順序を保てる
- **追加メモリが必要**: マージのために一時的な配列(バッファ)を使うため、in-placeなクイックソートに比べてメモリ使用量が多い(O(n))
- **並列化・外部ソートに強い**: 分割統治の性質上、分割した部分同士は独立に処理できるため並列化しやすい。メモリに載り切らない巨大データを扱う「外部ソート」の基盤としても使われる

## 実装例

```python
def merge_sort(arr: list[int]) -> list[int]:
    if len(arr) <= 1:
        return arr.copy()
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    result: list[int] = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
```

```typescript
function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return [...arr];
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  const result: number[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return [...result, ...left.slice(i), ...right.slice(j)];
}
```

```cpp
#include <vector>

std::vector<int> mergeSort(const std::vector<int>& arr) {
    if (arr.size() <= 1) return arr;
    size_t mid = arr.size() / 2;
    std::vector<int> left = mergeSort(std::vector<int>(arr.begin(), arr.begin() + mid));
    std::vector<int> right = mergeSort(std::vector<int>(arr.begin() + mid, arr.end()));

    std::vector<int> result;
    result.reserve(arr.size());
    size_t i = 0, j = 0;
    while (i < left.size() && j < right.size()) {
        if (left[i] <= right[j]) result.push_back(left[i++]);
        else result.push_back(right[j++]);
    }
    result.insert(result.end(), left.begin() + i, left.end());
    result.insert(result.end(), right.begin() + j, right.end());
    return result;
}
```

```rust
fn merge_sort(arr: &[i32]) -> Vec<i32> {
    if arr.len() <= 1 {
        return arr.to_vec();
    }
    let mid = arr.len() / 2;
    let left = merge_sort(&arr[..mid]);
    let right = merge_sort(&arr[mid..]);

    let mut result = Vec::with_capacity(arr.len());
    let (mut i, mut j) = (0, 0);
    while i < left.len() && j < right.len() {
        if left[i] <= right[j] {
            result.push(left[i]);
            i += 1;
        } else {
            result.push(right[j]);
            j += 1;
        }
    }
    result.extend_from_slice(&left[i..]);
    result.extend_from_slice(&right[j..]);
    result
}
```

```csharp
static int[] MergeSort(int[] arr)
{
    if (arr.Length <= 1) return (int[])arr.Clone();
    int mid = arr.Length / 2;
    int[] left = MergeSort(arr[..mid]);
    int[] right = MergeSort(arr[mid..]);

    var result = new List<int>(arr.Length);
    int i = 0, j = 0;
    while (i < left.Length && j < right.Length)
    {
        if (left[i] <= right[j]) result.Add(left[i++]);
        else result.Add(right[j++]);
    }
    result.AddRange(left[i..]);
    result.AddRange(right[j..]);
    return result.ToArray();
}
```
