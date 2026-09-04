---
name: 中央値の中央値法(Median of Medians / BFPRT法)
category: 探索
subcategory: 配列探索
complexity: O(n)(最悪ケースでも保証)
summary: クイックセレクトのピボット選びを工夫し、最悪ケースでもO(n)で k番目の要素を見つけられることを保証する選択アルゴリズム。
---

## 概要

クイックセレクトは平均O(n)で高速だが、ピボットの選び方が悪いと最悪O(n²)に落ち込む弱点がある。1973年にBlum、Floyd、Pratt、Rivest、Tarjanの5人(頭文字を取ってBFPRTアルゴリズムとも呼ばれる)が発表した中央値の中央値法は、**「ピボットを選ぶこと自体も再帰的な選択問題として解く」**という発想で、最悪ケースでも線形時間O(n)を理論的に保証する選択アルゴリズムを実現した。「良いピボット」を保証するための巧妙な前処理が、O(n)の壁を最悪ケースでも崩さない鍵になっている。

## 仕組み

1. 配列をおよそ5個ずつのグループに分割する
2. 各グループを(挿入ソートなどで)ソートし、それぞれの中央値を取り出す
3. 取り出した「グループごとの中央値」からなる新しい配列(要素数は元のn/5個)に対して、**同じ選択アルゴリズムを再帰的に適用し、その中央値(中央値の中央値)を求める**
4. こうして得られた値を通常のクイックセレクトのピボットとして採用し、配列を「ピボットより小さい/大きい」に分割する
5. 目的の順位kがピボットの位置と一致すれば終了。そうでなければ、含まれる側の部分配列に対して1〜4を再帰的に繰り返す

中央値の中央値をピボットに使うと、**少なくとも全体の約30%の要素がピボットより小さく、約30%が大きいことが数学的に保証される**ため、どんなに悪いケースでも分割後の探索範囲が一定の割合以下に収まり、最悪計算量がO(n)に留まる。

## 特性・トレードオフ

- **計算量**: 最悪ケースでもO(n)。「グループ分け(O(n))+ 中央値抽出(O(n))+ 中央値の中央値を再帰的に求める(T(n/5))+ 分割(O(n))+ 大きい側を再帰的に選択(T(7n/10))」という漸化式 T(n) = T(n/5) + T(7n/10) + O(n) を解くとO(n)に収束する
- **定数倍が大きい**: 理論的な最悪計算量は優れているが、実際のグループソートや複数回の再帰呼び出しのオーバーヘッドにより、実務ではランダムピボットのクイックセレクトの方が高速なことが多い。最悪ケース保証がクリティカルな場面(リアルタイム処理、敵対的な入力が想定される場面)で採用される
- **ソートアルゴリズムの改良にも応用**: 決定的な最悪O(n log n)のクイックソート改良(イントロソートの一部発想)にも中央値の中央値の考え方が使われる
- **グループサイズは5が最適点**: グループを3にすると再帰の分割比が悪化してO(n log n)になり、7以上にするとソートコストが増える。5が理論・実用のバランス点として知られている
- **使いどころ**: 最悪計算量の保証が必要な選択問題(組み込みシステム、リアルタイム統計処理)、決定的アルゴリズムの理論的下限を議論する際の基礎、クイックセレクトのフォールバック戦略

## 実装例

```python
def median_of_medians_select(arr: list[int], k: int) -> int:
    """0-indexedで k 番目に小さい要素を最悪でもO(n)で返す"""
    nums = arr[:]

    def select(lst: list[int], k: int) -> int:
        if len(lst) <= 5:
            return sorted(lst)[k]

        groups = [lst[i : i + 5] for i in range(0, len(lst), 5)]
        medians = [sorted(g)[len(g) // 2] for g in groups]
        pivot = select(medians, len(medians) // 2)

        less = [x for x in lst if x < pivot]
        equal = [x for x in lst if x == pivot]
        greater = [x for x in lst if x > pivot]

        if k < len(less):
            return select(less, k)
        elif k < len(less) + len(equal):
            return pivot
        else:
            return select(greater, k - len(less) - len(equal))

    return select(nums, k)
```

```typescript
function medianOfMediansSelect(arr: number[], k: number): number {
  function select(lst: number[], k: number): number {
    if (lst.length <= 5) {
      return [...lst].sort((a, b) => a - b)[k];
    }

    const groups: number[][] = [];
    for (let i = 0; i < lst.length; i += 5) groups.push(lst.slice(i, i + 5));
    const medians = groups.map((g) => {
      const sorted = [...g].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    });
    const pivot = select(medians, Math.floor(medians.length / 2));

    const less = lst.filter((x) => x < pivot);
    const equal = lst.filter((x) => x === pivot);
    const greater = lst.filter((x) => x > pivot);

    if (k < less.length) return select(less, k);
    else if (k < less.length + equal.length) return pivot;
    else return select(greater, k - less.length - equal.length);
  }

  return select([...arr], k);
}
```
