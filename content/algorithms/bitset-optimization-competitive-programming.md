---
name: ビットセット最適化(bitsetによる高速化)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(n²/64)(集合演算・DP遷移をワード単位で処理する場合の典型的な定数倍改善)
summary: 集合やDPの状態をビット列として表現し、CPUのワード単位(32/64ビット)の論理演算1回で64要素分の処理をまとめて行うことで、計算量オーダーは変えずに定数倍を大きく削る競技プログラミングの実装テクニック。
---

## 概要

競技プログラミングでは、計算量のオーダー自体は`O(n²)`から落とせないが、定数倍を落とせば制限時間内に収まる、という場面が頻繁に現れる。ビットセット最適化は、集合やDPの状態を`bool`の配列ではなく`0`/`1`のビット列(典型的には64ビット整数の配列)として表現し、和集合・積集合・シフトといった集合演算をCPUのワード単位の論理演算(AND・OR・XOR・シフト)1回で一気に処理することで、実質的に`64`要素(あるいは`std::bitset`の実装やSIMDの使い方次第でさらに多く)を同時に処理し、定数倍を`1/64`程度に削る実装テクニックである。計算量オーダーは変わらない(`O(n²)`は`O(n²/64)`になるだけ)が、競技プログラミングの制限時間はこの定数倍の違いで合否が分かれることが多く、C++の`std::bitset`をはじめとして非常によく使われる。

## 仕組み

1. **集合をビット列として表現する**: 要素`0`から`n-1`までの部分集合を、`n`ビットの整数(または`⌈n/64⌉`個の64ビット整数の配列)として表す。ビット`i`が1なら要素`i`が集合に含まれる、という対応をとる
2. **集合演算をビット演算に対応させる**: 和集合はOR(`|`)、積集合はAND(`&`)、対称差はXOR(`^`)、「集合内の各要素を+1シフトする」操作は左シフト(`<<`)に対応する。1回のワード演算(64ビットCPUなら64ビット幅)で、64個の要素に対する演算を同時に行える
3. **典型パターン1: 到達可能性DPの高速化**: 「硬貨の集合から合計`k`を作れるか」のような部分和DPでは、`dp`をビット列として持ち、硬貨`c`を使う遷移を`dp |= dp << c`の1行で表現できる。愚直な`O(n)`のDP配列更新が、ビット演算`O(n/64)`回で済む
4. **典型パターン2: グラフの到達可能性・推移閉包**: 隣接行列の各行をビット列として持ち、頂点`v`から1手で到達できる頂点集合を`reach[v] |= reach[u]`(`u`が`v`から到達可能なら)のようにOR演算でマージしていくことで、`O(V³)`の推移閉包計算(Floyd–Warshall型)を`O(V³/64)`に高速化できる
5. **典型パターン3: 文字列マッチングやDPの状態集合圧縮**: 編集距離や部分文字列マッチングのDPで、「ある行における到達可能な状態の集合」をビット列にまとめ、ビット演算で一括更新する(Shift-And法・Shift-Or法など)。`std::bitset<N>`(C++)のように固定長・可変長どちらの実装も使われる

## 特性・トレードオフ

- **計算量オーダーは変わらない**: ビットセット最適化はあくまで定数倍高速化であり、`O(n²)`が`O(n²/64)`になるだけでアルゴリズム自体の漸近的な計算量は変わらない。とはいえ`n`が数千〜数万程度の問題では、この`1/64`の差が「間に合う/間に合わない」を分ける決定的な要素になることが非常に多い
- **メモリ効率も同時に改善する**: `bool`配列は要素1つあたり1バイト(実装によってはさらに大きい)を消費するが、ビットセットは1ビットで済むため、メモリ使用量も約8分の1に削減できる。キャッシュに載りやすくなることで、演算速度自体もさらに向上する副次効果がある
- **適用できる操作が限られる**: ビットセットが真価を発揮するのは「集合のOR/AND/XOR/シフト」のように要素ごとに独立で並列にできる操作に限られる。要素ごとに異なる処理が必要な場合(値ごとに重みを掛けるなど)には単純には適用できず、[平方分割(Sqrt Decomposition)](/algorithms/sqrt-decomposition)や[Moのアルゴリズム(クエリ平方分割)](/algorithms/mo-algorithm)のような別の定数倍改善・オフライン処理のテクニックの方が向いていることもある
- **言語・実装依存の落とし穴**: C++の`std::bitset<N>`はコンパイル時に`N`を固定する必要がある(可変長には`vector<uint64_t>`を自前で管理する)。Pythonでは組み込みの多倍長整数`int`のビット演算がそのままビットセットとして使え、`bin(x).count("1")`のような操作で人口カウント(popcount)も簡単に書けるが、C++の`std::bitset`ほどの生の速度は出にくい
- **使いどころ**: 部分和・ナップサック型DPの到達可能性判定、グラフの推移閉包・到達可能性行列の計算、文字列の近似マッチング(Shift-And法)、[平方分割(Sqrt Decomposition)](/algorithms/sqrt-decomposition)や[Moのアルゴリズム(クエリ平方分割)](/algorithms/mo-algorithm)と組み合わせたオフラインクエリの高速化、制限時間がシビアな`O(n²)`〜`O(n³)`アルゴリズムの定数倍削減全般

## 実装例

「硬貨(コイン)の集合から作れる合計金額の集合」を求める部分和DPを、愚直な`bool`配列版とビットセット版の両方で実装し、結果が一致することを確認する例。ビットセット版は多倍長整数(Python)・`BigInt`(TypeScript)のビット演算を使い、`dp |= dp << coin`という1行で「既存の到達可能集合の各要素にcoinを足した新しい集合」をまとめて合成している。

```python
def subset_sums_naive(coins: list[int], limit: int) -> set[int]:
    """愚直なbool配列によるDP。dp[s] = 合計sを作れるか"""
    dp = [False] * (limit + 1)
    dp[0] = True
    for c in coins:
        for s in range(limit, c - 1, -1):
            if dp[s - c]:
                dp[s] = True
    return {s for s in range(limit + 1) if dp[s]}


def subset_sums_bitset(coins: list[int], limit: int) -> set[int]:
    """Pythonの多倍長intをビットセットとして使う高速版。
    dp のビットiが1 <=> 合計iを作れる。
    dp |= dp << c は「既存の各到達可能合計にcoinを足した集合」をORで合成する処理で、
    Pythonの1回のビット演算でlimitビット分がまとめて処理される。
    """
    mask = (1 << (limit + 1)) - 1
    dp = 1  # ビット0だけが1 = 合計0は常に作れる
    for c in coins:
        dp |= (dp << c) & mask
    return {s for s in range(limit + 1) if (dp >> s) & 1}


def can_form_transitive_closure(adj: list[int], n: int) -> list[int]:
    """隣接行列(各行をビット列 adj[v] として保持)から到達可能性行列(推移閉包)を求める。
    reach[v]のビットuが1 <=> vからuへ到達可能。
    """
    reach = adj[:]
    for k in range(n):
        for v in range(n):
            if (reach[v] >> k) & 1:
                reach[v] |= reach[k]
    return reach
```

```typescript
function subsetSumsNaive(coins: number[], limit: number): Set<number> {
  // 愚直なbool配列によるDP。dp[s] = 合計sを作れるか
  const dp = new Array(limit + 1).fill(false);
  dp[0] = true;
  for (const c of coins) {
    for (let s = limit; s >= c; s--) {
      if (dp[s - c]) dp[s] = true;
    }
  }
  const result = new Set<number>();
  for (let s = 0; s <= limit; s++) if (dp[s]) result.add(s);
  return result;
}

function subsetSumsBitset(coins: number[], limit: number): Set<number> {
  // BigIntのビット演算をビットセットとして使う高速版。
  // dp |= dp << coin という1行で「既存の到達可能集合の各要素にcoinを足した新しい集合」を
  // まとめて合成する(ワード単位でCPUが処理するため定数倍が大幅に縮む)。
  const mask = (1n << BigInt(limit + 1)) - 1n;
  let dp = 1n; // ビット0だけが1 = 合計0は常に作れる
  for (const c of coins) {
    dp |= (dp << BigInt(c)) & mask;
  }
  const result = new Set<number>();
  for (let s = 0; s <= limit; s++) {
    if ((dp >> BigInt(s)) & 1n) result.add(s);
  }
  return result;
}

function canFormTransitiveClosure(adj: bigint[], n: number): bigint[] {
  // 隣接行列(各行をビット列 adj[v] として保持)から到達可能性行列(推移閉包)を求める。
  const reach = [...adj];
  for (let k = 0; k < n; k++) {
    for (let v = 0; v < n; v++) {
      if ((reach[v] >> BigInt(k)) & 1n) {
        reach[v] |= reach[k];
      }
    }
  }
  return reach;
}
```
