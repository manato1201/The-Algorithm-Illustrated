---
name: 基数ソート
category: ソート
subcategory: 非比較ベース
complexity: O(d(n + k))
summary: 桁ごとに安定ソートを繰り返す。整数や固定長文字列の整列に向く。
---

## 概要

数値を「1つの大きな値」としてではなく「桁の並び」として扱い、下の桁から(あるいは上の桁から)1桁ずつ整列させていくことで、最終的に全体を整列させる。パンチカードの時代に生まれた古い手法だが、比較を行わないという性質から今も一定の場面で使われ続けている。

## 仕組み(下位桁から処理する方式)

1. 最下位桁(1の位)に注目し、その桁の値だけを基準に安定ソートする(計数ソートがよく使われる)
2. 次の桁(10の位)に注目し、同じく安定ソートする
3. これを最上位桁まで繰り返す

各桁のソートに**安定ソート**を使うことが絶対条件になる。もし不安定なソートを使うと、下位桁で揃えた順序が上位桁の処理で崩れてしまい、正しく整列できない。この「安定性を積み重ねる」という発想がこのアルゴリズムの本質。

## 特性・トレードオフ

- **計算量**: O(d(n + k))(d=桁数、k=各桁が取りうる値の範囲)。dとkが小さければ実質O(n)に近い線形時間で整列できる
- **比較を行わない**: 計数ソートと同じく、比較ベースのソートの下限(Ω(n log n))を回避できる
- **固定長データに向く**: 整数や固定長の文字列(郵便番号、社員番号など)には適用しやすいが、桁数が可変のデータや実数には工夫が必要
- **使いどころ**: 大量の整数・固定長文字列を高速に整列したい場面。GPU上でのソートなど、比較ベースのアルゴリズムより並列化しやすい性質を活かした実装も存在する

## 実装例(非負整数のLSD基数ソート、桁ごとに計数ソート)

```python
def radix_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    if not arr:
        return arr
    max_val = max(arr)
    exp = 1
    while max_val // exp > 0:
        arr = _counting_sort_by_digit(arr, exp)
        exp *= 10
    return arr

def _counting_sort_by_digit(arr: list[int], exp: int) -> list[int]:
    n = len(arr)
    output = [0] * n
    count = [0] * 10
    for v in arr:
        count[(v // exp) % 10] += 1
    for i in range(1, 10):
        count[i] += count[i - 1]
    for v in reversed(arr):
        digit = (v // exp) % 10
        count[digit] -= 1
        output[count[digit]] = v
    return output
```

```typescript
function radixSort(arr: number[]): number[] {
  let result = [...arr];
  if (result.length === 0) return result;
  const maxVal = Math.max(...result);
  let exp = 1;
  while (Math.floor(maxVal / exp) > 0) {
    result = countingSortByDigit(result, exp);
    exp *= 10;
  }
  return result;
}

function countingSortByDigit(arr: number[], exp: number): number[] {
  const n = arr.length;
  const output = new Array(n).fill(0);
  const count = new Array(10).fill(0);
  for (const v of arr) count[Math.floor(v / exp) % 10]++;
  for (let i = 1; i < 10; i++) count[i] += count[i - 1];
  for (let i = n - 1; i >= 0; i--) {
    const digit = Math.floor(arr[i] / exp) % 10;
    count[digit]--;
    output[count[digit]] = arr[i];
  }
  return output;
}
```

```cpp
#include <vector>
#include <algorithm>

std::vector<int> countingSortByDigit(const std::vector<int>& arr, int exp) {
    int n = static_cast<int>(arr.size());
    std::vector<int> output(n);
    std::vector<int> count(10, 0);
    for (int v : arr) count[(v / exp) % 10]++;
    for (int i = 1; i < 10; i++) count[i] += count[i - 1];
    for (int i = n - 1; i >= 0; i--) {
        int digit = (arr[i] / exp) % 10;
        count[digit]--;
        output[count[digit]] = arr[i];
    }
    return output;
}

std::vector<int> radixSort(std::vector<int> arr) {
    if (arr.empty()) return arr;
    int maxVal = *std::max_element(arr.begin(), arr.end());
    int exp = 1;
    while (maxVal / exp > 0) {
        arr = countingSortByDigit(arr, exp);
        exp *= 10;
    }
    return arr;
}
```

```rust
fn counting_sort_by_digit(arr: &[i32], exp: i32) -> Vec<i32> {
    let n = arr.len();
    let mut output = vec![0; n];
    let mut count = [0usize; 10];
    for &v in arr {
        count[((v / exp) % 10) as usize] += 1;
    }
    for i in 1..10 {
        count[i] += count[i - 1];
    }
    for &v in arr.iter().rev() {
        let digit = ((v / exp) % 10) as usize;
        count[digit] -= 1;
        output[count[digit]] = v;
    }
    output
}

fn radix_sort(arr: &[i32]) -> Vec<i32> {
    let mut result = arr.to_vec();
    if result.is_empty() {
        return result;
    }
    let max_val = *result.iter().max().unwrap();
    let mut exp = 1;
    while max_val / exp > 0 {
        result = counting_sort_by_digit(&result, exp);
        exp *= 10;
    }
    result
}
```

```csharp
static int[] CountingSortByDigit(int[] arr, int exp)
{
    int n = arr.Length;
    var output = new int[n];
    var count = new int[10];
    foreach (int v in arr) count[(v / exp) % 10]++;
    for (int i = 1; i < 10; i++) count[i] += count[i - 1];
    for (int i = n - 1; i >= 0; i--)
    {
        int digit = (arr[i] / exp) % 10;
        count[digit]--;
        output[count[digit]] = arr[i];
    }
    return output;
}

static int[] RadixSort(int[] arr)
{
    var result = (int[])arr.Clone();
    if (result.Length == 0) return result;
    int maxVal = result.Max();
    int exp = 1;
    while (maxVal / exp > 0)
    {
        result = CountingSortByDigit(result, exp);
        exp *= 10;
    }
    return result;
}
```
