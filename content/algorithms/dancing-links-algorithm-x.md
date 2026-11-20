---
name: ダンシングリンクと Algorithm X(厳密被覆)
category: 最適化・確率的手法
subcategory: 厳密最適化
complexity: 最悪は指数時間(探索の枝刈りと、操作の取り消しが O(1) のリンク操作で行える点が強み)
summary: 「各要素をちょうど1回ずつ覆う部分集合の組」を求める厳密被覆問題を、行と列を双方向リンクの網にして、削除と復元を O(1) で行いながら深さ優先で解く。数独やパズルの解法の定番。
---

## 概要

**厳密被覆問題(exact cover)**は、「全体の集合 `X` と、そのいくつかの部分集合の一覧が与えられたとき、`X` のすべての要素をちょうど1回ずつ含むように、部分集合をいくつか選べるか」を問う。数独(各マスに数字が1つ、各行・列・ブロックに各数字が1つずつ)、ペントミノのタイル敷き詰め、N クイーンなど、制約が「ちょうど1つ」の形になるパズルの多くを、この形に書き換えられる。

Donald Knuth は、これを解く単純な深さ優先の探索を **Algorithm X** と呼び、その実装として、2000年の論文「Dancing Links」で、**ダンシングリンク(DLX)**というデータ構造のテクニックを示した。リンクで結んだリストから、ノードを取り除いた後も、ノード自身は取り除かれた前後の位置を覚えているので、**取り除いた順の逆順で戻せば、元通りに復元できる**。探索が行き止まりになって引き返すときに、この「リンクが踊る(外れて、また戻る)」性質が、状態の保存・復元のコストを O(1) に抑える。

## 仕組み

0/1の行列を用意する。列が `X` の要素(制約)、行が部分集合(1がある列がその部分集合に含まれる要素)。

**Algorithm X**(再帰):
1. 行列に列が残っていなければ、解が見つかった(選んだ行の組が解)
2. 要素数(1の数)が最小の列 `c` を選ぶ(最も制約の厳しいところから攻めると、枝が少ない)。1つも行がなければ行き止まり
3. 列 `c` に1を持つ行 `r` を1つずつ試す。`r` を解に加え、`r` が1を持つ**すべての列 `j`** について、その列自体と、その列に1を持つ**すべての行**(`r` と衝突する行)を行列から取り除く。残りの行列で再帰する。戻ってきたら、取り除いたものを元に戻して次の行を試す

**ダンシングリンク**: 1の位置をノードとし、上下左右の4方向の円環状の双方向リンクで結ぶ。列の頭に「列ヘッダ」(1の数を保持)を置く。ノード `x` を左右から取り除くとき、`x.left.right = x.right; x.right.left = x.left` と、前後だけを書き換える。`x` 自身の左右のリンクは触らないので、復元は `x.left.right = x; x.right.left = x` だけで済む。これを **cover(列を取り除く)** と **uncover(逆順で戻す)** に使う。

## 特性・トレードオフ

- **戻す操作が高速**: 状態を丸ごとコピーせず、リンクの書き換えだけで探索の枝を進み、戻れる。メモリの確保も要らない
- **列の選び方が重要**: 1の数が最小の列を選ぶ(MRV: minimum remaining values)だけで、探索量が桁違いに減る。数独の難問も、数ミリ秒で解ける
- **指数時間の問題そのものは変わらない**: 厳密被覆はNP完全。DLXは効率のよい総当たりで、一般には最悪の指数時間を免れない。問題の構造が制約を強く絞る場合に力を発揮する
- **問題の定式化が鍵**: パズルを「どのように行と列に写すか」を設計するのが仕事。数独なら行=(マス,数字)の組 729、列=4種類の制約 324
- **使いどころ**: 数独、ペントミノなどのタイル敷き詰め、N クイーンの全解、パズル・スケジューリングの制約充足、プログラミングコンテストの全列挙の問題

## 実装例

```python
class DancingLinks:
    """rows[i] は、行 i が覆う列の番号(0 始まり)のリスト。"""

    def __init__(self, n_cols, rows):
        n = n_cols
        self.L = [(i - 1) % (n + 1) for i in range(n + 1)]
        self.R = [(i + 1) % (n + 1) for i in range(n + 1)]
        self.U = list(range(n + 1))
        self.D = list(range(n + 1))
        self.C = list(range(n + 1))
        self.S = [0] * (n + 1)
        self.row = [-1] * (n + 1)
        for r, cols in enumerate(rows):
            first = None
            for col in cols:
                c = col + 1
                x = len(self.L)
                self.U.append(self.U[c]); self.D.append(c)
                self.D[self.U[c]] = x; self.U[c] = x
                self.C.append(c); self.row.append(r); self.S[c] += 1
                if first is None:
                    self.L.append(x); self.R.append(x); first = x
                else:
                    self.L.append(self.L[first]); self.R.append(first)
                    self.R[self.L[first]] = x; self.L[first] = x

    def cover(self, c):
        self.R[self.L[c]] = self.R[c]; self.L[self.R[c]] = self.L[c]
        i = self.D[c]
        while i != c:
            j = self.R[i]
            while j != i:
                self.D[self.U[j]] = self.D[j]; self.U[self.D[j]] = self.U[j]
                self.S[self.C[j]] -= 1
                j = self.R[j]
            i = self.D[i]

    def uncover(self, c):
        i = self.U[c]
        while i != c:
            j = self.L[i]
            while j != i:
                self.S[self.C[j]] += 1
                self.D[self.U[j]] = j; self.U[self.D[j]] = j
                j = self.L[j]
            i = self.U[i]
        self.R[self.L[c]] = c; self.L[self.R[c]] = c

    def solve(self, solution=None):
        solution = [] if solution is None else solution
        if self.R[0] == 0:
            yield list(solution)
            return
        c, s = self.R[0], self.S[self.R[0]]
        j = self.R[c]
        while j != 0:                      # 1 の数が最小の列を選ぶ
            if self.S[j] < s:
                c, s = j, self.S[j]
            j = self.R[j]
        self.cover(c)
        r = self.D[c]
        while r != c:
            solution.append(self.row[r])
            j = self.R[r]
            while j != r:
                self.cover(self.C[j]); j = self.R[j]
            yield from self.solve(solution)
            j = self.L[r]
            while j != r:
                self.uncover(self.C[j]); j = self.L[j]
            solution.pop()
            r = self.D[r]
        self.uncover(c)


# Knuth の例: 要素 0..6 を、部分集合 A〜F から「ちょうど1回ずつ」覆う
subsets = {"A": [0, 3, 6], "B": [0, 3], "C": [3, 4, 6], "D": [2, 4, 5], "E": [1, 2, 5, 6], "F": [1, 6]}
names = list(subsets)
dlx = DancingLinks(7, [subsets[k] for k in names])
print([[names[r] for r in sol] for sol in dlx.solve()])  # [['B', 'D', 'F']](行番号を探索順に並べた結果)
```

```typescript
class DancingLinks {
  L: number[]; R: number[]; U: number[]; D: number[]; C: number[]; S: number[]; row: number[];

  constructor(nCols: number, rows: number[][]) {
    const n = nCols;
    this.L = Array.from({ length: n + 1 }, (_, i) => (i + n) % (n + 1));
    this.R = Array.from({ length: n + 1 }, (_, i) => (i + 1) % (n + 1));
    this.U = Array.from({ length: n + 1 }, (_, i) => i);
    this.D = Array.from({ length: n + 1 }, (_, i) => i);
    this.C = Array.from({ length: n + 1 }, (_, i) => i);
    this.S = new Array<number>(n + 1).fill(0);
    this.row = new Array<number>(n + 1).fill(-1);
    rows.forEach((cols, r) => {
      let first = -1;
      for (const col of cols) {
        const c = col + 1;
        const x = this.L.length;
        this.U.push(this.U[c]); this.D.push(c);
        this.D[this.U[c]] = x; this.U[c] = x;
        this.C.push(c); this.row.push(r); this.S[c]++;
        if (first < 0) {
          this.L.push(x); this.R.push(x); first = x;
        } else {
          this.L.push(this.L[first]); this.R.push(first);
          this.R[this.L[first]] = x; this.L[first] = x;
        }
      }
    });
  }

  cover(c: number): void {
    this.R[this.L[c]] = this.R[c]; this.L[this.R[c]] = this.L[c];
    for (let i = this.D[c]; i !== c; i = this.D[i]) {
      for (let j = this.R[i]; j !== i; j = this.R[j]) {
        this.D[this.U[j]] = this.D[j]; this.U[this.D[j]] = this.U[j];
        this.S[this.C[j]]--;
      }
    }
  }

  uncover(c: number): void {
    for (let i = this.U[c]; i !== c; i = this.U[i]) {
      for (let j = this.L[i]; j !== i; j = this.L[j]) {
        this.S[this.C[j]]++;
        this.D[this.U[j]] = j; this.U[this.D[j]] = j;
      }
    }
    this.R[this.L[c]] = c; this.L[this.R[c]] = c;
  }

  *solve(solution: number[] = []): Generator<number[]> {
    if (this.R[0] === 0) {
      yield [...solution];
      return;
    }
    let c = this.R[0];
    for (let j = this.R[c]; j !== 0; j = this.R[j]) if (this.S[j] < this.S[c]) c = j;
    this.cover(c);
    for (let r = this.D[c]; r !== c; r = this.D[r]) {
      solution.push(this.row[r]);
      for (let j = this.R[r]; j !== r; j = this.R[j]) this.cover(this.C[j]);
      yield* this.solve(solution);
      for (let j = this.L[r]; j !== r; j = this.L[j]) this.uncover(this.C[j]);
      solution.pop();
    }
    this.uncover(c);
  }
}

const subsets: Record<string, number[]> = {
  A: [0, 3, 6], B: [0, 3], C: [3, 4, 6], D: [2, 4, 5], E: [1, 2, 5, 6], F: [1, 6],
};
const names = Object.keys(subsets);
const dlx = new DancingLinks(7, names.map((k) => subsets[k]));
console.log([...dlx.solve()].map((sol) => sol.map((r) => names[r]))); // [["B","D","F"]](行番号を探索順に並べた結果)
```
