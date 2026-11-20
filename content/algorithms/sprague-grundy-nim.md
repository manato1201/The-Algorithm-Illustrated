---
name: スプレイグ・グランディの定理(ニムと Grundy 数)
category: ゲーム
subcategory: 数理ゲーム理論
complexity: Grundy数の計算 O(n·|手の集合|)、複数ゲームの和の判定は XOR を取るだけ O(ゲーム数)
summary: 「最後に動けた方が勝ち」の公平ゲームは、どんな形でも1つの山のニムと同じ強さ(Grundy数)で置き換えられ、複数のゲームを同時に進めるときは Grundy数の XOR で勝敗が決まる。
---

## 概要

石取りゲーム「ニム」は、複数の山から好きな山を選んで好きなだけ石を取り、最後の1個を取った方が勝つ(あるいは負ける)ゲームで、山の石の数をすべて XOR した値が0なら後手必勝、0でなければ先手必勝、という解が知られている(Bouton、1901年)。

では、ニムとは見た目の違うゲーム(取れる数が決まった石取り、盤上の駒の移動など)の和ではどうか。Roland Sprague(1935年)とP. M. Grundy(1939年)が独立に示したのが、次の定理である。**手番の者が動けなくなったら負けとなる公平ゲーム(両者が同じ手を指せるゲーム)は、どんな局面も、ある1つの山のニムと等価で、その山の大きさ(Grundy数)が定まる**。複数のゲームを同時に進めて、毎回どれか1つを選んで動かすなら、全体のGrundy数は各ゲームのGrundy数のXORである。ゲームの複雑な勝敗判定が、「Grundy数を求めて XOR するだけ」に簡単になる。

## 仕組み

局面 `p` のGrundy数 `g(p)` は、次のように再帰的に定義する。

`g(p) = mex { g(q) | q は p から1手で行ける局面 }`

`mex`(minimum excluded value)は「集合に含まれない最小の非負整数」。たとえば `mex{0, 1, 3} = 2`、`mex{} = 0`。

1. 動けない局面(終端)は、行ける先が空なので `g = 0`
2. 各局面の `g` を、小さい局面から順に求める(動的計画法)
3. **単独のゲームの勝敗**: `g(p) = 0` なら手番の者が負け(P位置)、`g(p) ≠ 0` なら勝ち(N位置)
4. **複数のゲームの和**: 各ゲームの局面のGrundy数を XOR して、0なら手番の者が負け、0以外なら勝ち。勝つ手は、XOR を0にするように、どれか1つのゲームでGrundy数を下げる動きを選べばよい(ニムの必勝法と同じ)

例: 一度に 1・3・4 個のどれかだけ取れる石取り(動けなくなったら負け)では、石の数 `n = 0, 1, 2, ...` に対し `g(n)` は `0, 1, 0, 1, 2, 3, 2, 0, 1, 0, 1, 2, 3, 2, ...` と周期7で繰り返す。`g(n) = 0` の局面(`n = 0, 2, 7, 9, 14, ...`)が負けの局面になる。

## 特性・トレードオフ

- **勝敗判定が劇的に簡単になる**: ゲームの和を、各成分のGrundy数のXORに分解して調べられる。成分ごとの計算が独立なので、複雑なゲームを分割して扱える
- **「公平ゲーム」に限る**: 両プレイヤーが同じ手を指せる場合に限る。囲碁や将棋のように、手番ごとに指せる手が違うゲームには、別の理論(コンウェイの超現実数などを使う、非公平ゲームの理論)が必要
- **勝敗だけでなく「どう動くか」も分かる**: 必勝の局面では、XOR が0になる手を選べばよい
- **計算量**: 各局面の `g` を求めるのに、その局面から行ける先をすべて見る必要がある。局面数が大きい場合は、周期性やパターンを見つけて公式を作ることが多い
- **標準ルールと逆ルール**: 「最後に取った方が勝ち」(標準)と「最後に取った方が負け」(逆)では理論が異なる。逆ルールのニムは、大半の局面で標準と同じ戦略(XORが0になるよう動く)が使えるが、すべての山が1以下になる終盤だけは戦略が変わる
- **使いどころ**: 競技プログラミングの石取りゲーム・盤上ゲームの問題、ゲームAIの局面の分解、数学ゲーム(Wythoff、Kayles など)の解析

## 実装例

```python
from functools import lru_cache
from functools import reduce
from operator import xor


def mex(values):
    s = set(values)
    m = 0
    while m in s:
        m += 1
    return m


def grundy_table(moves, n):
    """石が 0..n 個のときのGrundy数。moves は一度に取れる個数の集合。"""
    g = [0] * (n + 1)
    for i in range(1, n + 1):
        g[i] = mex(g[i - m] for m in moves if i >= m)
    return g


g = grundy_table({1, 3, 4}, 20)
print(g)  # [0, 1, 0, 1, 2, 3, 2, 0, 1, 0, 1, 2, 3, 2, 0, 1, 0, 1, 2, 3, 2]

# 3つのゲーム(石が 5・6・8 個)を同時に進める: Grundy数の XOR が 0 なら手番の者の負け
heaps = [5, 6, 8]
total = reduce(xor, (g[h] for h in heaps))
print("手番の勝ち" if total != 0 else "手番の負け", total)  # g=3,2,1 → XOR 0 → 負け


# 確認: Grundy数が0 ⇔ 手番の者が負け(全探索)
@lru_cache(None)
def wins(n):
    return any(not wins(n - m) for m in (1, 3, 4) if n >= m)


print(all((g[i] != 0) == wins(i) for i in range(21)))  # True
```

```typescript
function mex(values: Iterable<number>): number {
  const s = new Set(values);
  let m = 0;
  while (s.has(m)) m++;
  return m;
}

function grundyTable(moves: number[], n: number): number[] {
  const g = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    g[i] = mex(moves.filter((m) => i >= m).map((m) => g[i - m]));
  }
  return g;
}

const g = grundyTable([1, 3, 4], 20);
console.log(g.join(","));

const heaps = [5, 6, 8];
const total = heaps.map((h) => g[h]).reduce((a, b) => a ^ b, 0);
console.log(total !== 0 ? "手番の勝ち" : "手番の負け", total);

const memo = new Map<number, boolean>();
const wins = (n: number): boolean => {
  if (!memo.has(n)) memo.set(n, [1, 3, 4].some((m) => n >= m && !wins(n - m)));
  return memo.get(n)!;
};
console.log(g.every((v, i) => v !== 0 === wins(i))); // true
```
