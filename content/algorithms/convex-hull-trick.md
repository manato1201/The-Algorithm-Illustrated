---
name: Convex Hull Trick(直線の下側包絡)
category: 動的計画法
subcategory: 区間分割DP
complexity: O(n)(傾きと問い合わせが単調な場合)、O(n log n)(一般)
summary: dp[i] = min(dp[j] + b[j]·a[i]) の形のDP遷移を、直線の集合の下側包絡を管理して高速化する技法。
---

## 概要

区間を分割して費用を最小化するDPには、次の形の遷移がよく現れる。

`dp[i] = min over j<i of ( dp[j] + b[j] · a[i] )`

素朴に全部の `j` を試すと O(n²) になる。ここで `j` ごとに「傾き `b[j]`、切片 `dp[j]`」の直線 `y = b[j]·x + dp[j]` を作ると、`dp[i]` は「`x = a[i]` における、すべての直線の最小値」に他ならない。**複数の直線の最小値をとった関数は、下に凸な折れ線(下側包絡)になる**。包絡に効いていない直線は今後の最小値に一度も顔を出さないので、捨てて構わない。これが Convex Hull Trick(CHT)の発想である。

競技プログラミングのコミュニティで整理・名付けされた技法で、傾きが単調に並ぶ場合は全体を O(n) に、そうでなければ平衡二分木や Li Chao 木と組み合わせて O(n log n) にできる。

## 仕組み

傾きが降順に追加され(最小値クエリ)、問い合わせの `x` が昇順に来る基本形:

1. 直線を傾きの順に追加するとき、末尾の2本 `l₁, l₂` と新しい `l₃` を見る。`l₂` が `l₁` と `l₃` の交点より下に出てこないなら、`l₂` はどの `x` でも最小にならないので末尾から取り除く
2. 追加で取り除けなくなるまで1を繰り返し、最後に新しい直線を末尾に置く。これで先頭から末尾へ向かって、`x` が大きいほど後ろの直線が最小になる並びが保たれる
3. 問い合わせ `x` では、先頭が次の直線より大きくなった(後ろの直線のほうが最小)間だけ先頭を捨て、先頭の直線の値を答える。`x` が昇順なので、捨てた直線が再び必要になることはない

交点の比較は除算を避けるため、交差した形で行う: `(b₃−b₁)·(c₁−c₂) ≥ (b₂−b₁)·(c₁−c₃)` のような整数積の比較にする。

## 特性・トレードオフ

- **効果**: 各直線は高々1回追加・1回削除されるので、全体で償却 O(n)。DPが O(n²) → O(n) になる
- **単調性が崩れると**: 傾きがばらばらに来るなら平衡二分木で包絡を保つか、各区間に直線を載せる Li Chao 木を使う。問い合わせが単調でないなら、先頭を捨てず二分探索で答える(O(log n))
- **オーバーフローに注意**: 交点判定の積は値の2乗オーダになる。64bit整数で足りない場合は128bitや浮動小数を検討する
- **使いどころ**: 傾き・切片が `dp` の値と添字で決まる分割DP(「区間の費用が二乗や積で決まる」問題、傾き最適化)、動物園の見学コース割り当てのような階段状の費用の最小化。分割統治最適化や Knuth 最適化と並ぶ、遷移の最適化の基本の一つ

## 実装例

```python
from collections import deque


class MinHull:
    """y = m*x + c の最小値を答える。傾きは降順に追加、問い合わせxは昇順。"""

    def __init__(self):
        self.lines = deque()

    @staticmethod
    def _bad(l1, l2, l3):
        # l2 が l1・l3 の交点より上にあれば不要
        return (l3[1] - l1[1]) * (l1[0] - l2[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0])

    def add(self, m, c):
        line = (m, c)
        while len(self.lines) >= 2 and self._bad(self.lines[-2], self.lines[-1], line):
            self.lines.pop()
        self.lines.append(line)

    def query(self, x):
        while len(self.lines) >= 2 and self._value(self.lines[1], x) <= self._value(self.lines[0], x):
            self.lines.popleft()
        return self._value(self.lines[0], x)

    @staticmethod
    def _value(line, x):
        return line[0] * x + line[1]


h = MinHull()
for m, c in [(5, 0), (3, 4), (1, 10), (-2, 30)]:
    h.add(m, c)
print([h.query(x) for x in range(0, 8)])  # [0, 5, 10, 13, 14, 15, 16, 16]
```

```typescript
type Line = [number, number]; // [傾き, 切片]

class MinHull {
  private lines: Line[] = [];
  private head = 0;

  private static bad(l1: Line, l2: Line, l3: Line): boolean {
    return (l3[1] - l1[1]) * (l1[0] - l2[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0]);
  }
  private static value(l: Line, x: number): number {
    return l[0] * x + l[1];
  }

  add(m: number, c: number): void {
    const line: Line = [m, c];
    while (this.lines.length - this.head >= 2 &&
      MinHull.bad(this.lines[this.lines.length - 2], this.lines[this.lines.length - 1], line)) {
      this.lines.pop();
    }
    this.lines.push(line);
  }

  query(x: number): number {
    while (this.lines.length - this.head >= 2 &&
      MinHull.value(this.lines[this.head + 1], x) <= MinHull.value(this.lines[this.head], x)) {
      this.head++;
    }
    return MinHull.value(this.lines[this.head], x);
  }
}

const h = new MinHull();
for (const [m, c] of [[5, 0], [3, 4], [1, 10], [-2, 30]] as Line[]) h.add(m, c);
console.log([0, 1, 2, 3, 4, 5, 6, 7].map((x) => h.query(x))); // [0, 5, 10, 13, 14, 15, 16, 16]
```
