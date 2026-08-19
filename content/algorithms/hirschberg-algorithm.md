---
name: Hirschbergのアルゴリズム(線形空間アラインメント)
category: バイオインフォマティクス
subcategory: 配列アラインメント
complexity: O(n×m)時間、O(n+m)空間(長さn、mの2配列)
summary: 分割統治法で問題を半分ずつに割りながらNeedleman-Wunsch型のDPを2方向から走らせることで、大域アラインメントの計算量をO(nm)時間に保ったまま、必要な空間をO(nm)からO(n+m)まで削減する手法。
---

## 概要

[Needleman-Wunsch法](/algorithms/needleman-wunsch)は2つの配列の大域アラインメントを`O(n×m)`時間で求められるが、実際にアラインメントを復元する(トレースバックする)には`n×m`マスのDPテーブル全体を保持しておく必要があり、空間計算量も`O(n×m)`になる。ヒトゲノムの染色体のように配列長が数千万〜数億塩基に達する場合、この空間コストは現実的な計算機資源を容易に超えてしまう。1975年にダン・ヒルシュバーグが発表したこのアルゴリズムは、動的計画法のDPテーブルをまるごと保持する代わりに**分割統治法**を組み合わせることで、時間計算量`O(n×m)`を保ったまま空間計算量を`O(n+m)`まで削減する。「最適解のスコアそのもの」は少ないメモリで計算できるが、「経路の復元」には全履歴が要る、というDPの一般的なジレンマに対する古典的な解法として知られている。

## 仕組み

1. 配列`A`(長さ`n`)を中央`mid = n/2`で前半`A[0:mid]`と後半`A[mid:n]`に分割する
2. 前半`A[0:mid]`と`B`全体について、通常のNeedleman-Wunsch DPを**最後の行だけ保持しながら**前向きに計算する(各行を計算したら前の行は捨てるので、この時点で必要な空間は`O(m)`)。これにより「`A`の前半を使い切ったとき、`B`の各位置`j`まで整列させた場合の最適スコア」が`B`の長さ分のベクトルとして得られる
3. 同様に、`A`の後半`A[mid:n]`と`B`を**両方とも逆順にした上で**同じDPを前向きに計算し、それを逆順に並べ直す。これは「`A`の後半を(逆向きに)使い切ったとき、`B`の残り部分をどこまで整列させたかに応じた最適スコア」に相当する
4. 2つのスコアベクトルを`B`の各位置`j`について足し合わせ、`forward[j] + backward[j]`が最大になる`j`(これを`split`と呼ぶ)を求める。これが「`A`をちょうど中央で割ったとき、`B`のどこで対応する分割点になるはずか」を教えてくれる
5. `Hirschberg(A[0:mid], B[0:split])`と`Hirschberg(A[mid:n], B[split:m])`を再帰的に解き、それぞれの結果を単純に連結すれば、全体の最適アラインメントになる
6. 再帰の基底ケース(`A`が空、または長さ1)では、通常のNeedleman-Wunschをそのまま(小さい行列なので空間コストは無視できる)解いてアラインメントを直接構築する

## 特性・トレードオフ

- **時間計算量は変わらない**: 各再帰レベルで、前向き・後向きのDPパスにそれぞれ`O(n×m)`規模の計算をするように見えるが、再帰のたびに問題が半分になるため合計すると等比級数的に減少し、全体では通常のNeedleman-Wunschの定数倍(おおよそ2倍)の時間で収まる。漸近的な時間計算量`O(n×m)`はNeedleman-Wunschと変わらない
- **空間計算量の劇的な削減**: 各DPパスで保持するのは常に1行分(`O(m)`または`O(n)`)であり、再帰の深さは`O(log n)`なので、全体の空間計算量は`O(n+m)`にまで抑えられる。染色体スケールの配列比較のように空間が真のボトルネックになる場面での実用性が高い
- **時間と空間のトレードオフの典型例**: 素朴なNeedleman-Wunschは「1回のDPで済むが空間を食う」、ヒルシュバーグは「同じ計算を定数倍やり直す代わりに空間を減らす」という、アルゴリズム設計における時間・空間トレードオフの教科書的な例になっている
- **[バンド化アラインメント](/algorithms/banded-alignment)との組み合わせ**: 配列長の差が小さいと仮定できる場合は、ヒルシュバーグの分割統治とバンド化DPを組み合わせることで、時間・空間の両方をさらに削減できる。実際のゲノムアラインメントツールの多くは、この種の複数の高速化技法を積み重ねて実装されている
- **使いどころ**: 染色体やゲノム全体規模の大域アラインメント、メモリ制約の厳しい環境での配列比較、[複数配列アラインメント](/algorithms/multiple-sequence-alignment)のペアワイズ距離計算を大規模に行う際の基盤技術

## 実装例

```python
def nw_score_row(a: str, b: str, match: int = 1, mismatch: int = -1, gap: int = -2) -> list[int]:
    """Needleman-Wunschの最終行だけを線形空間で計算する(ヒルシュバーグの前半・後半パスで使う)。"""
    m = len(b)
    prev = [j * gap for j in range(m + 1)]
    for i in range(1, len(a) + 1):
        curr = [i * gap] + [0] * m
        for j in range(1, m + 1):
            s = match if a[i - 1] == b[j - 1] else mismatch
            curr[j] = max(prev[j - 1] + s, prev[j] + gap, curr[j - 1] + gap)
        prev = curr
    return prev


def _needleman_wunsch_full(a: str, b: str, match: int, mismatch: int, gap: int) -> tuple[str, str]:
    """基底ケース用: 小さい部分問題は通常のNeedleman-Wunschで直接、経路も含めて解く。"""
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i * gap
    for j in range(m + 1):
        dp[0][j] = j * gap
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = match if a[i - 1] == b[j - 1] else mismatch
            dp[i][j] = max(dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap)

    aligned_a, aligned_b = [], []
    i, j = n, m
    while i > 0 or j > 0:
        s = match if i > 0 and j > 0 and a[i - 1] == b[j - 1] else mismatch
        if i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + s:
            aligned_a.append(a[i - 1]); aligned_b.append(b[j - 1]); i -= 1; j -= 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + gap:
            aligned_a.append(a[i - 1]); aligned_b.append("-"); i -= 1
        else:
            aligned_a.append("-"); aligned_b.append(b[j - 1]); j -= 1
    return "".join(reversed(aligned_a)), "".join(reversed(aligned_b))


def hirschberg(a: str, b: str, match: int = 1, mismatch: int = -1, gap: int = -2) -> tuple[str, str]:
    if len(a) == 0:
        return "-" * len(b), b
    if len(b) == 0:
        return a, "-" * len(a)
    if len(a) == 1 or len(b) == 1:
        return _needleman_wunsch_full(a, b, match, mismatch, gap)

    mid = len(a) // 2
    score_left = nw_score_row(a[:mid], b, match, mismatch, gap)
    score_right = nw_score_row(a[mid:][::-1], b[::-1], match, mismatch, gap)
    score_right.reverse()

    total = [l + r for l, r in zip(score_left, score_right)]
    split = max(range(len(total)), key=lambda j: total[j])

    left_a, left_b = hirschberg(a[:mid], b[:split], match, mismatch, gap)
    right_a, right_b = hirschberg(a[mid:], b[split:], match, mismatch, gap)
    return left_a + right_a, left_b + right_b
```

```typescript
function nwScoreRow(a: string, b: string, match = 1, mismatch = -1, gap = -2): number[] {
  const m = b.length;
  let prev = Array.from({ length: m + 1 }, (_, j) => j * gap);
  for (let i = 1; i <= a.length; i++) {
    const curr = new Array(m + 1).fill(0);
    curr[0] = i * gap;
    for (let j = 1; j <= m; j++) {
      const s = a[i - 1] === b[j - 1] ? match : mismatch;
      curr[j] = Math.max(prev[j - 1] + s, prev[j] + gap, curr[j - 1] + gap);
    }
    prev = curr;
  }
  return prev;
}

function needlemanWunschFull(
  a: string,
  b: string,
  match: number,
  mismatch: number,
  gap: number
): [string, string] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i * gap;
  for (let j = 0; j <= m; j++) dp[0][j] = j * gap;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = a[i - 1] === b[j - 1] ? match : mismatch;
      dp[i][j] = Math.max(dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap);
    }
  }

  let i = n;
  let j = m;
  const alignedA: string[] = [];
  const alignedB: string[] = [];
  while (i > 0 || j > 0) {
    const s = i > 0 && j > 0 && a[i - 1] === b[j - 1] ? match : mismatch;
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + s) {
      alignedA.push(a[i - 1]); alignedB.push(b[j - 1]); i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + gap) {
      alignedA.push(a[i - 1]); alignedB.push("-"); i--;
    } else {
      alignedA.push("-"); alignedB.push(b[j - 1]); j--;
    }
  }
  return [alignedA.reverse().join(""), alignedB.reverse().join("")];
}

function hirschberg(a: string, b: string, match = 1, mismatch = -1, gap = -2): [string, string] {
  if (a.length === 0) return ["-".repeat(b.length), b];
  if (b.length === 0) return [a, "-".repeat(a.length)];
  if (a.length === 1 || b.length === 1) return needlemanWunschFull(a, b, match, mismatch, gap);

  const mid = Math.floor(a.length / 2);
  const scoreLeft = nwScoreRow(a.slice(0, mid), b, match, mismatch, gap);
  const scoreRight = nwScoreRow(
    a.slice(mid).split("").reverse().join(""),
    b.split("").reverse().join(""),
    match,
    mismatch,
    gap
  ).reverse();

  const total = scoreLeft.map((l, j) => l + scoreRight[j]);
  let split = 0;
  for (let j = 1; j < total.length; j++) if (total[j] > total[split]) split = j;

  const [leftA, leftB] = hirschberg(a.slice(0, mid), b.slice(0, split), match, mismatch, gap);
  const [rightA, rightB] = hirschberg(a.slice(mid), b.slice(split), match, mismatch, gap);
  return [leftA + rightA, leftB + rightB];
}
```
