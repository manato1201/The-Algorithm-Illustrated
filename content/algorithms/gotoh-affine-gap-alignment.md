---
name: ゴトー法(アフィンギャップのアラインメント)
category: バイオインフォマティクス
subcategory: 配列アラインメント
complexity: O(mn) 時間、O(mn) 領域(3枚の表。スコアだけなら O(min(m,n)) に減らせる)
summary: 連続した挿入・欠失(ギャップ)の罰則を「開始の罰則+延長の罰則×長さ」の1次式にしても、3つのDP表を使うことで、全体の整列を O(mn) で求められる。
---

## 概要

[Needleman-Wunsch法](/algorithms/needleman-wunsch)は、ギャップ1個につき一定の罰則を課す最も単純な全体アラインメントである。しかし、生物学的には、遺伝子の挿入や欠失は**1文字ずつ独立に起こるわけではなく、まとまった長さで一度に起こる**ことが多い。ギャップが1個ずつ並ぶ場合と、まとまって1個の長いギャップになる場合を同じ罰則で数えると、実際の進化的な事象を反映しにくい。そこで、ギャップを開く(open)コストを高く、延ばす(extend)コストを低くする、**アフィンギャップ罰則** `g(k) = 開始 + (k−1)×延長`(長さ `k` のギャップ)を使う。

任意の長さの関数 `g(k)` を許す一般のギャップ罰則だと、直前に何文字のギャップを開いたかを調べるので、計算量が O(m²n + mn²) に増える。Osamu Gotoh(1982年)は、**アフィン罰則に限ると、DP表を3枚持つことで O(mn) で解ける**ことを示した。長さの1次式という制約のおかげで、「いまギャップの途中にいるか」という状態を1つ覚えれば足りる。

## 仕組み

配列 `a`(長さ m)と `b`(長さ n)の接頭辞 `a[1..i]`、`b[1..j]` の最良のスコアを、**最後の列の状態**ごとに3枚の表に分けて持つ。

- `M[i][j]`: 最後が `a[i]` と `b[j]` の対応(一致またはミスマッチ)で終わる
- `X[i][j]`: 最後が `a[i]` を `b` 側のギャップに対応させる(縦方向のギャップ)で終わる
- `Y[i][j]`: 最後が `b[j]` を `a` 側のギャップに対応させる(横方向のギャップ)で終わる

罰則は、ギャップを開くと `go`、続けると `ge`(どちらも負の数)。漸化式は次の通り。

- `M[i][j] = max(M, X, Y)[i−1][j−1] + s(a[i], b[j])`
- `X[i][j] = max( M[i−1][j] + go, X[i−1][j] + ge, Y[i−1][j] + go )`
- `Y[i][j] = max( M[i][j−1] + go, Y[i][j−1] + ge, X[i][j−1] + go )`

初期値は `M[0][0] = 0`、他の端は上の式の通り(範囲外を `−∞`)。最終のスコアは `max(M, X, Y)[m][n]`。経路は、各セルでどの表のどのセルから来たかを逆にたどって復元する(トレースバック)。ギャップが連続している間は、`X` や `Y` の表の中だけで「延長」を選ぶので、開始の罰則を二重に払わない。

## 特性・トレードオフ

- **O(mn) を保つ**: 3枚の表を持つだけで、任意の長さのギャップを扱う場合の O(m²n + mn²) に比べて、アフィン罰則では大幅に速い
- **生物学的に自然**: 長い挿入・欠失が1つの出来事としてまとめられるので、散らばった短いギャップより長い1個のギャップが好まれる。実際の配列の整列の結果が自然になる
- **パラメータの選び方**: 開始と延長の罰則の比、一致・ミスマッチの得点(DNAなら単純な値、タンパク質ならBLOSUMなどの置換行列)が、結果に大きく影響する。目的に合わせた調整が要る
- **応用の広がり**: 局所アラインメントは[Smith-Waterman法](/algorithms/smith-waterman)にアフィン罰則を組み合わせて使う(BLASTなどの検索ツールの内部で使われる)。複数配列のアラインメントでも、ペアごとの整列に使われる
- **メモリの問題**: 表が3枚になるので、長い配列(ゲノム)ではメモリが大きくなる。[Hirschberg法](/algorithms/hirschberg-algorithm)のような分割統治で、領域を O(n) に減らす工夫がある
- **使いどころ**: タンパク質・DNAの配列比較、配列データベース検索の精密な整列、バリアント検出での挿入・欠失の判定、文字列の差分(アフィン罰則を使うdiff)

## 実装例

```python
NEG = float("-inf")


def gotoh(a, b, match=2, mismatch=-1, gap_open=-3, gap_extend=-1):
    n, m = len(a), len(b)
    M = [[NEG] * (m + 1) for _ in range(n + 1)]
    X = [[NEG] * (m + 1) for _ in range(n + 1)]   # a[i] がギャップに対応
    Y = [[NEG] * (m + 1) for _ in range(n + 1)]   # b[j] がギャップに対応
    M[0][0] = 0
    for i in range(n + 1):
        for j in range(m + 1):
            if i > 0 and j > 0:
                s = match if a[i - 1] == b[j - 1] else mismatch
                M[i][j] = max(M[i - 1][j - 1], X[i - 1][j - 1], Y[i - 1][j - 1]) + s
            if i > 0:
                X[i][j] = max(M[i - 1][j] + gap_open, X[i - 1][j] + gap_extend, Y[i - 1][j] + gap_open)
            if j > 0:
                Y[i][j] = max(M[i][j - 1] + gap_open, Y[i][j - 1] + gap_extend, X[i][j - 1] + gap_open)
    tables = {"M": M, "X": X, "Y": Y}
    state = max("MXY", key=lambda t: tables[t][n][m])
    score = tables[state][n][m]
    # トレースバック
    i, j = n, m
    ra, rb = [], []
    while i > 0 or j > 0:
        cur = tables[state][i][j]
        if state == "M":
            s = match if a[i - 1] == b[j - 1] else mismatch
            prev = next(t for t in "MXY" if tables[t][i - 1][j - 1] + s == cur)
            ra.append(a[i - 1]); rb.append(b[j - 1]); i -= 1; j -= 1
        elif state == "X":
            prev = next(t for t, p in (("M", gap_open), ("X", gap_extend), ("Y", gap_open)) if tables[t][i - 1][j] + p == cur)
            ra.append(a[i - 1]); rb.append("-"); i -= 1
        else:
            prev = next(t for t, p in (("M", gap_open), ("Y", gap_extend), ("X", gap_open)) if tables[t][i][j - 1] + p == cur)
            ra.append("-"); rb.append(b[j - 1]); j -= 1
        state = prev
    return score, "".join(reversed(ra)), "".join(reversed(rb))


score, top, bottom = gotoh("GATTACA", "GACA")
print(score)
print(top)
print(bottom)  # 長さ3のギャップ(---)を1つにまとめた整列。スコアは 一致4×2 + ギャップ(−3 −1×2) = 3
```

```typescript
const NEG = -Infinity;

function gotoh(
  a: string,
  b: string,
  match = 2,
  mismatch = -1,
  gapOpen = -3,
  gapExtend = -1,
) {
  const n = a.length;
  const m = b.length;
  const make = () =>
    Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(NEG));
  const M = make();
  const X = make();
  const Y = make();
  M[0][0] = 0;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (i > 0 && j > 0) {
        const s = a[i - 1] === b[j - 1] ? match : mismatch;
        M[i][j] =
          Math.max(M[i - 1][j - 1], X[i - 1][j - 1], Y[i - 1][j - 1]) + s;
      }
      if (i > 0)
        X[i][j] = Math.max(
          M[i - 1][j] + gapOpen,
          X[i - 1][j] + gapExtend,
          Y[i - 1][j] + gapOpen,
        );
      if (j > 0)
        Y[i][j] = Math.max(
          M[i][j - 1] + gapOpen,
          Y[i][j - 1] + gapExtend,
          X[i][j - 1] + gapOpen,
        );
    }
  }
  const tables = { M, X, Y } as const;
  type State = keyof typeof tables;
  let state = (["M", "X", "Y"] as State[]).reduce((best, t) =>
    tables[t][n][m] > tables[best][n][m] ? t : best,
  );
  const score = tables[state][n][m];
  let i = n;
  let j = m;
  const ra: string[] = [];
  const rb: string[] = [];
  while (i > 0 || j > 0) {
    const cur = tables[state][i][j];
    let prev: State;
    if (state === "M") {
      const s = a[i - 1] === b[j - 1] ? match : mismatch;
      prev = (["M", "X", "Y"] as State[]).find(
        (t) => tables[t][i - 1][j - 1] + s === cur,
      )!;
      ra.push(a[i - 1]);
      rb.push(b[j - 1]);
      i--;
      j--;
    } else if (state === "X") {
      prev = (["M", "X", "Y"] as State[]).find(
        (t) => tables[t][i - 1][j] + (t === "X" ? gapExtend : gapOpen) === cur,
      )!;
      ra.push(a[i - 1]);
      rb.push("-");
      i--;
    } else {
      prev = (["M", "Y", "X"] as State[]).find(
        (t) => tables[t][i][j - 1] + (t === "Y" ? gapExtend : gapOpen) === cur,
      )!;
      ra.push("-");
      rb.push(b[j - 1]);
      j--;
    }
    state = prev;
  }
  return { score, top: ra.reverse().join(""), bottom: rb.reverse().join("") };
}

console.log(gotoh("GATTACA", "GACA"));
```
