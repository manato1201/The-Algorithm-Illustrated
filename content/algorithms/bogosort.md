---
name: ボゴソート
category: ソート
subcategory: 比較ベース
complexity: O((n+1)!)(期待値)
summary: ランダムに並べ替えて整列済みか確認するだけを繰り返す。実用性はほぼゼロだが、他のソートがなぜ工夫されているのかを逆説的に教えてくれる。
---

## 概要

「配列をランダムにシャッフルし、整列済みかどうかを確認する。整列済みでなければ、また最初からやり直す」——これだけを繰り返すという、意図的に非効率に作られたジョークアルゴリズム。「愚か者(bogus)のソート」という名前が示す通り実用性はまったくないが、他のソートアルゴリズムがなぜあれほど工夫を凝らしているのかを、反面教師として体感させてくれる。

## 仕組み

1. 配列全体をランダムな順序にシャッフルする(すべての並び方が等確率で選ばれる、いわゆるフィッシャー–イェーツ・シャッフル)
2. 配列が整列済みかどうかを先頭から末尾まで確認する
3. 整列済みでなければ、1に戻ってやり直す
4. 整列済みであれば終了

n個の要素の並び方は全部でn!通りあり、そのうち「正しく整列された並び方」はちょうど1通り。つまり1回のシャッフルで運良く整列済みになる確率は1/n!に過ぎず、期待される試行回数はn!のオーダーになる。

## 特性・トレードオフ

- **計算量**: 期待値でO((n+1)!)、最悪の場合は理論上いつまで経っても終わらない可能性すらある(確率0ではないが実質無限大)。要素数が10個程度でも現実的な時間では終わらない
- **教育的な価値**: 「なぜクイックソートはピボットの選び方を工夫するのか」「なぜマージソートは分割統治するのか」——ボゴソートの絶望的な非効率さと比較することで、他のアルゴリズムの工夫の価値が際立って見えてくる
- **亜種**: シャッフルではなく隣接要素をランダムに1組だけ交換し続ける「ボゴボゴソート」など、さらに輪をかけて非効率にした派生形も存在し、計算機科学のジョークの文脈でしばしば言及される
- **実務での立ち位置**: 皆無。あえて「最悪の設計とは何か」を学ぶための負の教材

## 実装例(シャッフル+整列済みチェックの愚直な実装)

```python
import random

def bogo_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    while not _is_sorted(arr):
        random.shuffle(arr)
    return arr

def _is_sorted(arr: list[int]) -> bool:
    return all(arr[i] <= arr[i + 1] for i in range(len(arr) - 1))
```

```typescript
function bogoSort(arr: number[]): number[] {
  const result = [...arr];
  while (!isSorted(result)) {
    shuffle(result);
  }
  return result;
}

function isSorted(arr: number[]): boolean {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] > arr[i + 1]) return false;
  }
  return true;
}

function shuffle(arr: number[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
```

```cpp
#include <vector>
#include <algorithm>
#include <random>

bool isSorted(const std::vector<int>& arr) {
    for (size_t i = 0; i + 1 < arr.size(); i++) {
        if (arr[i] > arr[i + 1]) return false;
    }
    return true;
}

std::vector<int> bogoSort(std::vector<int> arr) {
    std::random_device rd;
    std::mt19937 rng(rd());
    while (!isSorted(arr)) {
        std::shuffle(arr.begin(), arr.end(), rng);
    }
    return arr;
}
```

```rust
use std::time::{SystemTime, UNIX_EPOCH};

fn next_random(state: &mut u64) -> u64 {
    // xorshift64
    *state ^= *state << 13;
    *state ^= *state >> 7;
    *state ^= *state << 17;
    *state
}

fn is_sorted(arr: &[i32]) -> bool {
    arr.windows(2).all(|w| w[0] <= w[1])
}

fn shuffle(arr: &mut [i32], state: &mut u64) {
    for i in (1..arr.len()).rev() {
        let j = (next_random(state) as usize) % (i + 1);
        arr.swap(i, j);
    }
}

fn bogo_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let seed = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() as u64;
    let mut state = if seed == 0 { 0x2545F4914F6CDD1D } else { seed };
    while !is_sorted(&arr) {
        shuffle(&mut arr, &mut state);
    }
    arr
}
```

```csharp
static bool IsSorted(int[] arr)
{
    for (int i = 0; i < arr.Length - 1; i++)
    {
        if (arr[i] > arr[i + 1]) return false;
    }
    return true;
}

static void Shuffle(int[] arr, Random rng)
{
    for (int i = arr.Length - 1; i > 0; i--)
    {
        int j = rng.Next(i + 1);
        (arr[i], arr[j]) = (arr[j], arr[i]);
    }
}

static int[] BogoSort(int[] arr)
{
    var result = (int[])arr.Clone();
    var rng = new Random();
    while (!IsSorted(result))
    {
        Shuffle(result, rng);
    }
    return result;
}
```
