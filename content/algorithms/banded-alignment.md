---
name: バンド化アラインメント(Banded Dynamic Programming)
category: バイオインフォマティクス
subcategory: 配列アラインメント
complexity: O(n×k)時間・空間(nは配列長、kはバンド幅)
summary: 2配列の長さの差が高々kであると仮定できる場合に、DPテーブル全体ではなく主対角線に沿った幅2k+1の帯だけを計算することで、大域アラインメントを高速化する手法。
---

## 概要

[Needleman-Wunsch法](/algorithms/needleman-wunsch)の`O(n×m)`のDPは、2配列がどれだけ似ているかに関わらず常にテーブル全体を埋める。しかし、次世代シーケンサーの読み取り(リード)を既知の参照ゲノムにマッピングする場合のように、比較する2つの配列がもともとほぼ同じであると事前にわかっている場面は多い。この場合、最適なアラインメントの経路はDPテーブルの主対角線付近から大きく外れることはまずない。バンド化アラインメントは、この前提を利用して「対角線から一定の幅`k`以内のセルだけ」を計算し、それ以外のセルは最初から到達不能として扱うことで、計算量を`O(n×m)`から`O(n×k)`に削減する。挿入・欠失(インデル)の個数が高々`k`程度に収まるという仮定が成り立つ限り、通常のDPと同じ最適解を、はるかに少ない計算量で得られる。

## 仕組み

1. バンド幅`k`を決める。典型的には、想定される最大インデル数、あるいは配列長の差`|n - m|`の上限から見積もる(`k`は少なくとも`|n - m|`以上でなければ、最終セル`dp[n][m]`にたどり着く経路自体が存在しない)
2. `dp[i][j]`について、`j`が`[i - k, i + k]`の範囲に収まるセルだけを計算する。範囲外のセルは常に`-∞`(到達不能)として扱う
3. 帯の内部では、[Needleman-Wunsch法](/algorithms/needleman-wunsch)や[編集距離](/algorithms/edit-distance)と全く同じ漸化式(一致/不一致による対角遷移、ギャップによる上下遷移)を使う——違いは走査するセルの範囲だけである
4. 最終的に`dp[n][m]`が帯の範囲内に含まれていれば、それが求める最適スコアになる。トレースバックも、帯の内部だけを辿ればよい
5. もし真に最適なアラインメントがバンド幅`k`の外側の経路を必要とする場合、計算結果は不正確(バンド内での近似解、あるいは経路が存在せずエラー)になる。実用的な実装では、この場合に`k`を広げて再計算する、あるいはX-drop法のようにスコアが大きく悪化した領域で探索を打ち切る適応的な戦略を取ることが多い

## 特性・トレードオフ

- **計算量の劇的な削減**: `k`が配列長`n`に比べて十分小さければ、`O(n×k)`は`O(n×m)`よりはるかに小さくなる。リードマッピングのようにインデル数が数個〜数十個程度に収まると期待できる場面では、この削減効果が非常に大きい
- **正確性はバンド幅の妥当性に依存する**: バンド化は「最適解が対角線付近にある」という仮定の上に成り立っており、仮定が崩れる(2配列が予想以上に大きくずれている)場合は、真の最適解を見逃す近似アルゴリズムになってしまう。[Needleman-Wunsch法](/algorithms/needleman-wunsch)や[Smith-Waterman法](/algorithms/smith-waterman)のように必ず厳密解を返すわけではない点が本質的なトレードオフ
- **[Hirschbergのアルゴリズム](/algorithms/hirschberg-algorithm)との組み合わせ**: バンド化によって計算量を`O(n×k)`に抑えつつ、空間もヒルシュバーグの分割統治と組み合わせれば`O(k)`程度まで削減できる。両者は独立した最適化軸(計算範囲の限定 vs DPテーブルの非保持)であり、組み合わせて使われることが多い
- **使いどころ**: 次世代シーケンサーのリードを参照ゲノムにマッピングするツール([BWA](/algorithms/bwa-fm-index-alignment)のシード&エクステンド戦略の「エクステンド」段階など)、既知の変異(SNPやわずかなインデル)を検出するための再配列決定(リシーケンシング)、2配列がほぼ同一であることが既知の校正・差分検出タスク

## 実装例

```python
NEG_INF = float("-inf")


def banded_alignment(
    a: str, b: str, k: int, match: int = 1, mismatch: int = -1, gap: int = -2
) -> tuple[float, str, str]:
    """|len(a) - len(b)| <= k を仮定し、対角線から幅kの帯だけをDPで計算する。"""
    n, m = len(a), len(b)
    assert abs(n - m) <= k, "バンド幅kは配列長の差以上でなければならない"

    dp: dict[tuple[int, int], float] = {(0, 0): 0.0}
    parent: dict[tuple[int, int], tuple[int, int]] = {}

    def get(i: int, j: int) -> float:
        return dp.get((i, j), NEG_INF)

    for i in range(0, n + 1):
        lo, hi = max(0, i - k), min(m, i + k)
        for j in range(lo, hi + 1):
            if i == 0 and j == 0:
                continue
            best, from_cell = NEG_INF, (0, 0)
            if i > 0 and j > 0:
                s = match if a[i - 1] == b[j - 1] else mismatch
                cand = get(i - 1, j - 1) + s
                if cand > best:
                    best, from_cell = cand, (i - 1, j - 1)
            if i > 0:
                cand = get(i - 1, j) + gap
                if cand > best:
                    best, from_cell = cand, (i - 1, j)
            if j > 0:
                cand = get(i, j - 1) + gap
                if cand > best:
                    best, from_cell = cand, (i, j - 1)
            dp[(i, j)] = best
            parent[(i, j)] = from_cell

    if (n, m) not in dp:
        raise ValueError("最適アラインメントがバンド幅kの外にある可能性がある")

    aligned_a, aligned_b = [], []
    i, j = n, m
    while (i, j) != (0, 0):
        pi, pj = parent[(i, j)]
        if pi == i - 1 and pj == j - 1:
            aligned_a.append(a[i - 1]); aligned_b.append(b[j - 1])
        elif pi == i - 1:
            aligned_a.append(a[i - 1]); aligned_b.append("-")
        else:
            aligned_a.append("-"); aligned_b.append(b[j - 1])
        i, j = pi, pj

    return dp[(n, m)], "".join(reversed(aligned_a)), "".join(reversed(aligned_b))
```

```typescript
const NEG_INF = -Infinity;

function bandedAlignment(
  a: string,
  b: string,
  k: number,
  match = 1,
  mismatch = -1,
  gap = -2
): { score: number; alignedA: string; alignedB: string } {
  const n = a.length;
  const m = b.length;
  if (Math.abs(n - m) > k) throw new Error("バンド幅kは配列長の差以上でなければならない");

  const key = (i: number, j: number): string => `${i},${j}`;
  const dp = new Map<string, number>([[key(0, 0), 0]]);
  const parent = new Map<string, [number, number]>();
  const get = (i: number, j: number): number => dp.get(key(i, j)) ?? NEG_INF;

  for (let i = 0; i <= n; i++) {
    const lo = Math.max(0, i - k);
    const hi = Math.min(m, i + k);
    for (let j = lo; j <= hi; j++) {
      if (i === 0 && j === 0) continue;
      let best = NEG_INF;
      let from: [number, number] = [0, 0];
      if (i > 0 && j > 0) {
        const s = a[i - 1] === b[j - 1] ? match : mismatch;
        const cand = get(i - 1, j - 1) + s;
        if (cand > best) { best = cand; from = [i - 1, j - 1]; }
      }
      if (i > 0) {
        const cand = get(i - 1, j) + gap;
        if (cand > best) { best = cand; from = [i - 1, j]; }
      }
      if (j > 0) {
        const cand = get(i, j - 1) + gap;
        if (cand > best) { best = cand; from = [i, j - 1]; }
      }
      dp.set(key(i, j), best);
      parent.set(key(i, j), from);
    }
  }

  if (!dp.has(key(n, m))) throw new Error("最適アラインメントがバンド幅kの外にある可能性がある");

  const alignedA: string[] = [];
  const alignedB: string[] = [];
  let i = n;
  let j = m;
  while (i !== 0 || j !== 0) {
    const [pi, pj] = parent.get(key(i, j))!;
    if (pi === i - 1 && pj === j - 1) {
      alignedA.push(a[i - 1]); alignedB.push(b[j - 1]);
    } else if (pi === i - 1) {
      alignedA.push(a[i - 1]); alignedB.push("-");
    } else {
      alignedA.push("-"); alignedB.push(b[j - 1]);
    }
    i = pi; j = pj;
  }

  return {
    score: dp.get(key(n, m))!,
    alignedA: alignedA.reverse().join(""),
    alignedB: alignedB.reverse().join(""),
  };
}
```
