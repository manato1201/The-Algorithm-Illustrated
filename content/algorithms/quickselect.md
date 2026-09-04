---
name: クイックセレクト(Quickselect)
category: 探索
subcategory: 配列探索
complexity: O(n)(平均)、O(n²)(最悪)
summary: クイックソートの分割操作だけを利用し、配列全体をソートせずにk番目に小さい要素を平均O(n)で見つける選択アルゴリズム。
---

## 概要

「配列の中央値だけが知りたい」「上位10件だけ取り出したい」というとき、配列全体をO(n log n)でソートしてからk番目を取り出すのは無駄が多い。1961年にTony Hoare(クイックソートの考案者でもある)が発表したクイックセレクトは、クイックソートのパーティション(分割)操作だけを使い、目的の順位が含まれる側だけを再帰的に絞り込むことで、平均O(n)というソートよりも高速な選択を実現する。中央値探索(メディアン・オブ・メディアンズと組み合わせたBFPRTアルゴリズム)や、統計・機械学習でのk近傍・パーセンタイル計算の基盤としても使われる。

## 仕組み

1. 配列からピボットを1つ選ぶ(ランダム選択が実用上安全)
2. ピボットを基準に配列を「ピボットより小さい要素」「ピボット」「ピボットより大きい要素」に分割する(クイックソートと同じパーティション処理)
3. パーティション後、ピボットの最終的な位置(インデックス)が確定する
4. 目的の順位kがピボットの位置と一致すれば、それが答え
5. kがピボットより左側にあれば左側の部分配列だけを再帰的に探索し、右側にあれば右側だけを再帰的に探索する。**クイックソートと違い、探索しなかった側は二度と触らない**
6. 部分配列が1要素になるまで、または目的の位置が見つかるまで2〜5を繰り返す

毎回、片側だけを探索範囲として残すため、探索範囲は平均的に指数的に縮小し、全体としてO(n)の計算量に収まる。

## 特性・トレードオフ

- **計算量**: 平均O(n)。ただし最悪ケース(常に最小または最大の要素をピボットに選んでしまう場合)はO(n²)に悪化する。ランダムピボットや median-of-three 戦略でこのリスクを大幅に軽減できる
- **ソートより高速**: k番目の要素だけが目的ならソートは過剰。ソートがO(n log n)なのに対し、クイックセレクトは平均O(n)で完了する
- **破壊的操作**: 多くの実装は元の配列を破壊的に並べ替える(in-place分割)。元の順序を保ちたい場合はコピーが必要
- **最悪ケース保証が必要ならmedian-of-medians**: 決定的にO(n)を保証したい場合は、ピボット選択自体にmedian-of-medians法(BFPRTアルゴリズム)を用いる。定数倍が大きくなるため実務ではランダムクイックセレクトの方がよく使われる
- **使いどころ**: 中央値の計算、上位k件ランキング(top-k)、パーセンタイル・分位点の算出、機械学習でのk近傍探索の前処理

## 実装例

```python
import random

def quickselect(arr: list[int], k: int) -> int:
    """0-indexedで k 番目に小さい要素を返す"""
    nums = arr[:]

    def partition(lo: int, hi: int, pivot_idx: int) -> int:
        pivot = nums[pivot_idx]
        nums[pivot_idx], nums[hi] = nums[hi], nums[pivot_idx]
        store = lo
        for i in range(lo, hi):
            if nums[i] < pivot:
                nums[store], nums[i] = nums[i], nums[store]
                store += 1
        nums[store], nums[hi] = nums[hi], nums[store]
        return store

    lo, hi = 0, len(nums) - 1
    while True:
        if lo == hi:
            return nums[lo]
        pivot_idx = random.randint(lo, hi)
        pivot_idx = partition(lo, hi, pivot_idx)
        if k == pivot_idx:
            return nums[k]
        elif k < pivot_idx:
            hi = pivot_idx - 1
        else:
            lo = pivot_idx + 1
```

```typescript
function quickselect(arr: number[], k: number): number {
  const nums = [...arr];

  function partition(lo: number, hi: number, pivotIdx: number): number {
    const pivot = nums[pivotIdx];
    [nums[pivotIdx], nums[hi]] = [nums[hi], nums[pivotIdx]];
    let store = lo;
    for (let i = lo; i < hi; i++) {
      if (nums[i] < pivot) {
        [nums[store], nums[i]] = [nums[i], nums[store]];
        store++;
      }
    }
    [nums[store], nums[hi]] = [nums[hi], nums[store]];
    return store;
  }

  let lo = 0;
  let hi = nums.length - 1;
  while (true) {
    if (lo === hi) return nums[lo];
    const pivotIdx = lo + Math.floor(Math.random() * (hi - lo + 1));
    const pos = partition(lo, hi, pivotIdx);
    if (k === pos) return nums[k];
    else if (k < pos) hi = pos - 1;
    else lo = pos + 1;
  }
}
```
