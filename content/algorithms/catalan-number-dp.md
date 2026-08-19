---
name: カタラン数とDP(括弧列・二分木の数え上げ)
category: 動的計画法
subcategory: 数列・部分列
complexity: O(n²)
summary: 括弧列や二分木の形など見かけの異なる組合せ問題が、同じ漸化式(カタラン数)に帰着することをDPで導出する。
---

## 概要

次の3つの問題は、一見すると全く異なる対象を数えているように見える。

- 長さ2nの、正しく対応の取れた括弧列(`()()`, `(())`のような)は何通りあるか
- n個のノードを持つ、形の異なる二分木(各ノードの値の大小は問わず、純粋な形だけを数える)は何通りあるか
- 凸(n+2)角形を、辺が交差しないように対角線だけで三角形に分割する方法は何通りあるか

驚くべきことに、これらは**全く同じ数列(カタラン数、Catalan number)**に従う。カタラン数は`C_0=1, C_1=1, C_2=2, C_3=5, C_4=14, ...`と続く数列で、[matrix-chain-multiplication](/algorithms/matrix-chain-multiplication)のような区間DPとも関係が深い。カタラン数そのものは閉じた式(二項係数を使った式)でも表せるが、**「なぜこれらの一見異なる問題が同じ漸化式に帰着するのか」をDPの視点から導出する**ことで、組合せ的な構造の本質的な共通点が見えてくる。

## 仕組み

**共通する漸化式の発見**: 上記のどの問題も、「全体を最初の1点で2つの独立した部分問題に分割する」という同じ構造を持っている。これを二分木の数え上げを例に見ていく。

`C_n`を「nノードの二分木の形の総数」と定義する(`C_0 = 1`、ノードが0個の空の木を1通りと数える)。

1. nノードの二分木は、必ず「根」を1つ持つ。根の左部分木にk個、右部分木に(n-1-k)個のノードが振り分けられる(kは0からn-1までの任意の値)
2. 左部分木の形は`C_k`通り、右部分木の形は`C_{n-1-k}`通りあり、これらは**独立に**選べるので、根の左右の組み合わせは`C_k × C_{n-1-k}`通り
3. kを0からn-1まで全て試した総和が、nノードの二分木の総数になる:
   `C_n = Σ(k=0 to n-1) C_k × C_{n-1-k}`
4. `C_0 = 1`を初期値として、`C_1, C_2, ...`と小さい方から順に計算していけば、任意のnについてのカタラン数を求められる

**括弧列への対応**: 長さ2nの正しい括弧列も同じ漸化式に従う。最初の`(`に対応する`)`の位置で括弧列を2つに分割すると、その`(`と`)`に囲まれた内側の括弧列(長さ2k)と、それより後ろの括弧列(長さ2(n-1-k))に分かれ、これらは独立に正しい括弧列でありさえすればよい。二分木の「根の左右」と全く同じ「1点で分割し、独立な2つの部分問題の積を足し合わせる」という構造が現れる。

**多角形の三角形分割への対応**: 凸(n+2)角形の1辺を固定し、その辺に対する残りの頂点のうちどれを三角形の3つ目の頂点として選ぶかで多角形を2つの小さな多角形に分割する、と考えると、やはり同じ「1点で分割して独立な2つの部分問題に帰着する」構造になる。

このように、**「全体を1点で左右(または内外)の独立した部分問題に分割し、それぞれの場合の数の積を、分割点について足し合わせる」**という共通のパターンが根底にあり、対象こそ違えどDPの漸化式としては全く同一の形になる。

## 特性・トレードオフ

- **計算量**: DPで`C_0`から`C_n`まで順に求める場合はO(n²)(各`C_n`の計算にO(n)かかり、それをn回繰り返す)。閉じた式`C_n = C(2n, n) / (n + 1)`(二項係数を使った式)を使えば、階乗の値さえ計算できればO(n)またはO(1)に近い計算量で単発の値を求められるが、**なぜその式が成り立つかという構造的な理解にはDPによる漸化式の導出が役立つ**
- **区間DPとの関係**: 「全体を分割点で2つに分け、それぞれの部分問題の答えを組み合わせる」という構造は、[行列連鎖積](/algorithms/matrix-chain-multiplication)などの区間DPと本質的に同じ骨格を持つ。行列連鎖積が「コストの最小値」を求めるのに対し、カタラン数のDPは「場合の数の総和」を求めるという違いはあるが、どちらも区間分割型のDPの一種と見なせる
- **同じ漸化式に帰着する問題の広さ**: 上記の3例以外にも、n個の要素からなる山型の並び替え、正しい山括弧のマッチングを含む文字列、モノトニックな格子路のカウント問題など、カタラン数が現れる場面は非常に多い。ある問題を見たときに「これはカタラン数の変形ではないか」と気づけると、既知の式・漸化式をそのまま流用できる
- **オーバーフローへの注意**: カタラン数はnが大きくなると急激に(指数的に近い速さで)増加するため、実装時には多倍長整数や剰余演算(mod付きの二項係数計算)が必要になることが多い
- **使いどころ**: 構文解析(数式や括弧の対応関係の数え上げ)、木構造の列挙、動的計画法の問題演習における「同じ漸化式に気づけるか」を試す典型問題。競技プログラミングでも頻出のテーマ

## 実装例

```python
def catalan_numbers(n: int) -> list[int]:
    c = [0] * (n + 1)
    c[0] = 1
    for i in range(1, n + 1):
        total = 0
        for k in range(i):
            total += c[k] * c[i - 1 - k]
        c[i] = total
    return c


def count_binary_tree_shapes(n: int) -> int:
    return catalan_numbers(n)[n]


def count_balanced_parentheses(pairs: int) -> int:
    return catalan_numbers(pairs)[pairs]
```

```typescript
function catalanNumbers(n: number): number[] {
  const c = new Array(n + 1).fill(0);
  c[0] = 1;
  for (let i = 1; i <= n; i++) {
    let total = 0;
    for (let k = 0; k < i; k++) {
      total += c[k] * c[i - 1 - k];
    }
    c[i] = total;
  }
  return c;
}

function countBinaryTreeShapes(n: number): number {
  return catalanNumbers(n)[n];
}

function countBalancedParentheses(pairs: number): number {
  return catalanNumbers(pairs)[pairs];
}
```

```cpp
#include <vector>

std::vector<long long> catalanNumbers(int n) {
    std::vector<long long> c(n + 1, 0);
    c[0] = 1;
    for (int i = 1; i <= n; i++) {
        long long total = 0;
        for (int k = 0; k < i; k++) {
            total += c[k] * c[i - 1 - k];
        }
        c[i] = total;
    }
    return c;
}

long long countBinaryTreeShapes(int n) {
    return catalanNumbers(n)[n];
}

long long countBalancedParentheses(int pairs) {
    return catalanNumbers(pairs)[pairs];
}
```

```rust
fn catalan_numbers(n: usize) -> Vec<u64> {
    let mut c = vec![0u64; n + 1];
    c[0] = 1;
    for i in 1..=n {
        let mut total = 0u64;
        for k in 0..i {
            total += c[k] * c[i - 1 - k];
        }
        c[i] = total;
    }
    c
}

fn count_binary_tree_shapes(n: usize) -> u64 {
    catalan_numbers(n)[n]
}

fn count_balanced_parentheses(pairs: usize) -> u64 {
    catalan_numbers(pairs)[pairs]
}
```

```csharp
static class CatalanNumbers
{
    public static long[] Compute(int n)
    {
        var c = new long[n + 1];
        c[0] = 1;
        for (int i = 1; i <= n; i++)
        {
            long total = 0;
            for (int k = 0; k < i; k++)
            {
                total += c[k] * c[i - 1 - k];
            }
            c[i] = total;
        }
        return c;
    }

    public static long CountBinaryTreeShapes(int n) => Compute(n)[n];

    public static long CountBalancedParentheses(int pairs) => Compute(pairs)[pairs];
}
```
