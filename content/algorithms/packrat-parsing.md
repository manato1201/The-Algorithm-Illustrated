---
name: パックラット構文解析(Packrat Parsing)
category: コンパイラ・構文解析
subcategory: 構文解析
complexity: O(n)(nは入力長。各(非終端記号, 位置)の組をメモ化することで最悪でも線形時間を保証)
summary: PEG(解析表現文法)の順序付き選択とバックトラックによる重複計算を、各位置・各非終端記号ごとの解析結果のメモ化で消し去り、最悪でも入力長に対して線形時間の構文解析を実現する手法。
---

## 概要

PEG(Parsing Expression Grammar、解析表現文法)は、通常の文脈自由文法と似た記法を持ちながら、選択`e1 / e2`を「`e1`がまず成功したらそれを採用する」という**順序付き選択**として定義することで、曖昧性のない一意な解析結果を保証する枠組みである。この性質は[再帰下降構文解析](/algorithms/recursive-descent-parsing)と非常に相性が良く、PEGの規則をそのまま再帰下降の関数として素直に実装できる。しかし、素朴な実装では選択の1番目の枝が失敗して2番目の枝を試す際に、同じ入力位置・同じ非終端記号に対する解析を何度も繰り返してしまい、文法によっては最悪で指数時間かかることがある。Bryan Fordが2002年に提案したパックラット構文解析は、各`(非終端記号, 入力位置)`の組ごとに解析結果(成功なら消費した長さと構文木、失敗ならその印そのもの)をメモ化しておくことで、同じ計算が二度と行われないことを保証し、最悪でも入力長に対して線形時間で解析が完了することを保証する。名前の「パックラット(ネズミの一種)」は、あらゆる解析結果を「ため込んでおく」性質に由来する。

## 仕組み

1. PEGの各非終端記号`A`に対して、[再帰下降構文解析](/algorithms/recursive-descent-parsing)と同じ要領で`parseA(pos)`という解析関数を書く。選択`e1 / e2`は「`e1`をまず試し、失敗したら`e2`を試す」という順序で実装し、両方失敗すれば全体も失敗にする
2. 各解析関数の先頭で、まず「`(A, pos)`という組に対する結果が既にメモにあるか」を確認する。メモにヒットすれば、それが成功(構文木と次の位置)であれ失敗であれ、実際の解析処理を一切行わずその結果をそのまま返す——**失敗そのものをメモ化する**点が重要で、これによりバックトラックで同じ`(A, pos)`の組へ何度戻ってきても再計算が起きない
3. メモにヒットしなければ実際に解析処理を行い、得られた結果(成功時は消費後の位置と構文木、失敗時は失敗マーク)をメモに保存してから返す
4. PEGには通常の文脈自由文法にはない**先読み述語**もある。`&e`は「`e`にマッチするかどうかだけを確認し、入力を消費しない(肯定先読み)」、`!e`は「`e`にマッチしないことを確認し、入力を消費しない(否定先読み)」という演算で、これらも同様にメモ化の対象にできる。文脈依存の判断(「この後にこのトークンが続く場合だけこの規則を適用する」など)を、無限ループを起こさずに文法へ組み込める
5. 選択`/`で最初の枝が失敗して2番目の枝を試す際、両方の枝が内部で同じ非終端記号を同じ位置から呼び出していても、その呼び出しは既にメモにある結果を返すだけなので、実質的な計算量の増加がない

## 特性・トレードオフ

- **計算量**: 文法中の非終端記号の種類数を`k`とすると、メモに保存されるエントリ数は最大でも入力長`n`に対して`n × k`個で、各エントリの実質的な計算コストを償却で`O(1)`とみなせるため全体で`O(n)`(`k`は文法サイズに依存する定数)を保証する。素朴なバックトラック型PEG解析が最悪指数時間になりうるのと対照的に、常に線形時間が保証される点がパックラット構文解析最大の利点
- **メモリコストとのトレードオフ**: 線形時間性と引き換えに、`O(n × k)`のメモリを消費する(全ての位置×非終端記号の組を保存する必要がある)。入力が非常に長い場合はこのメモリコストが実用上の制約になることがある
- **左再帰への非対応**: 文法規則が自分自身を先頭で呼び出す形(左再帰、`A → A x | y`のような形)になっていると、`parseA(pos)`が入力位置を進めないまま自分自身を呼び出し続けて無限再帰に陥る——素朴なパックラット構文解析ではこれを検出・解決できないため、[再帰下降構文解析](/algorithms/recursive-descent-parsing)と同様に文法を左再帰を含まない形に書き換えるか、専用の拡張(メモ化中の暫定結果を段階的に伸ばしていくseed-growing法など)が必要になる
- **[再帰下降構文解析](/algorithms/recursive-descent-parsing)との関係**: パックラット構文解析は本質的に、再帰下降構文解析にメモ化を追加したものと位置づけられる。PEGの順序付き選択によって解析結果が常に一意に定まる(曖昧性がない)という性質と、メモ化によってバックトラックの再計算コストを消し去る性質が組み合わさることで、「実装のシンプルさ」と「最悪計算量の保証」を同時に得られる
- **使いどころ**: PEG.jsやtree-sitterのような、PEGベースのパーサジェネレータ・インクリメンタル構文解析器の内部実装、正規言語を超えた文脈依存の判断(先読み述語)が必要な設定ファイル・DSL(ドメイン特化言語)の解析、構文が曖昧になりがちな言語仕様を「常に一意に解釈される」形で厳密に定義したい場面

## 実装例

四則演算(`Expr <- Term (('+' / '-') Term)*`, `Term <- Factor (('*' / '/') Factor)*`, `Factor <- Number / '(' Expr ')'`)をPEGとして、各非終端記号・位置ごとにメモ化しながら解析・評価する。

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class ParseResult:
    value: float
    next_pos: int


class PackratParser:
    def __init__(self, text: str):
        self.text = text
        # メモ: (規則名, 位置) -> 解析結果(失敗ならNoneをそのまま保存する)
        self.memo: dict[tuple[str, int], Optional[ParseResult]] = {}

    def parse(self) -> float:
        result = self.expr(0)
        if result is None or result.next_pos != len(self.text):
            raise SyntaxError("解析に失敗しました")
        return result.value

    def _memoized(self, rule: str, pos: int, compute) -> Optional[ParseResult]:
        key = (rule, pos)
        if key in self.memo:
            return self.memo[key]  # 成功・失敗どちらの結果も再計算せずそのまま返す
        result = compute(pos)
        self.memo[key] = result
        return result

    def _skip_ws(self, pos: int) -> int:
        while pos < len(self.text) and self.text[pos] == " ":
            pos += 1
        return pos

    def _literal(self, s: str, pos: int) -> Optional[int]:
        return pos + len(s) if self.text.startswith(s, pos) else None

    def number(self, pos: int) -> Optional[ParseResult]:
        def compute(p):
            p = self._skip_ws(p)
            start = p
            while p < len(self.text) and (self.text[p].isdigit() or self.text[p] == "."):
                p += 1
            return ParseResult(float(self.text[start:p]), p) if p > start else None
        return self._memoized("Number", pos, compute)

    def factor(self, pos: int) -> Optional[ParseResult]:
        def compute(p):
            num = self.number(p)
            if num is not None:
                return num
            open_pos = self._literal("(", self._skip_ws(p))
            if open_pos is not None:
                inner = self.expr(open_pos)
                if inner is not None:
                    close_pos = self._literal(")", self._skip_ws(inner.next_pos))
                    if close_pos is not None:
                        return ParseResult(inner.value, close_pos)
            return None
        return self._memoized("Factor", pos, compute)

    def term(self, pos: int) -> Optional[ParseResult]:
        def compute(p):
            left = self.factor(p)
            if left is None:
                return None
            value, p = left.value, left.next_pos
            while True:
                ws = self._skip_ws(p)
                op, op_pos = "*", self._literal("*", ws)
                if op_pos is None:
                    op, op_pos = "/", self._literal("/", ws)
                if op_pos is None:
                    break
                rhs = self.factor(op_pos)
                if rhs is None:
                    break
                value = value * rhs.value if op == "*" else value / rhs.value
                p = rhs.next_pos
            return ParseResult(value, p)
        return self._memoized("Term", pos, compute)

    def expr(self, pos: int) -> Optional[ParseResult]:
        def compute(p):
            left = self.term(p)
            if left is None:
                return None
            value, p = left.value, left.next_pos
            while True:
                ws = self._skip_ws(p)
                op, op_pos = "+", self._literal("+", ws)
                if op_pos is None:
                    op, op_pos = "-", self._literal("-", ws)
                if op_pos is None:
                    break
                rhs = self.term(op_pos)
                if rhs is None:
                    break
                value = value + rhs.value if op == "+" else value - rhs.value
                p = rhs.next_pos
            return ParseResult(value, p)
        return self._memoized("Expr", pos, compute)
```

```typescript
interface ParseResult {
  value: number;
  nextPos: number;
}

class PackratParser {
  // メモ: "規則名:位置" -> 解析結果(失敗はnullとしてそのまま保存する)
  private memo = new Map<string, ParseResult | null>();

  constructor(private text: string) {}

  parse(): number {
    const result = this.expr(0);
    if (result === null || result.nextPos !== this.text.length) {
      throw new Error("解析に失敗しました");
    }
    return result.value;
  }

  private memoized(
    rule: string,
    pos: number,
    compute: (p: number) => ParseResult | null,
  ): ParseResult | null {
    const key = `${rule}:${pos}`;
    if (this.memo.has(key)) return this.memo.get(key)!; // 成功・失敗どちらも再計算せずそのまま返す
    const result = compute(pos);
    this.memo.set(key, result);
    return result;
  }

  private skipWs(pos: number): number {
    while (pos < this.text.length && this.text[pos] === " ") pos++;
    return pos;
  }

  private literal(s: string, pos: number): number | null {
    return this.text.startsWith(s, pos) ? pos + s.length : null;
  }

  number(pos: number): ParseResult | null {
    return this.memoized("Number", pos, (p) => {
      p = this.skipWs(p);
      const start = p;
      while (
        p < this.text.length &&
        (/[0-9]/.test(this.text[p]) || this.text[p] === ".")
      )
        p++;
      return p > start
        ? { value: parseFloat(this.text.slice(start, p)), nextPos: p }
        : null;
    });
  }

  factor(pos: number): ParseResult | null {
    return this.memoized("Factor", pos, (p) => {
      const num = this.number(p);
      if (num !== null) return num;
      const openPos = this.literal("(", this.skipWs(p));
      if (openPos !== null) {
        const inner = this.expr(openPos);
        if (inner !== null) {
          const closePos = this.literal(")", this.skipWs(inner.nextPos));
          if (closePos !== null)
            return { value: inner.value, nextPos: closePos };
        }
      }
      return null;
    });
  }

  term(pos: number): ParseResult | null {
    return this.memoized("Term", pos, (p) => {
      const left = this.factor(p);
      if (left === null) return null;
      let { value } = left;
      p = left.nextPos;
      while (true) {
        const ws = this.skipWs(p);
        let op = "*";
        let opPos = this.literal("*", ws);
        if (opPos === null) {
          op = "/";
          opPos = this.literal("/", ws);
        }
        if (opPos === null) break;
        const rhs = this.factor(opPos);
        if (rhs === null) break;
        value = op === "*" ? value * rhs.value : value / rhs.value;
        p = rhs.nextPos;
      }
      return { value, nextPos: p };
    });
  }

  expr(pos: number): ParseResult | null {
    return this.memoized("Expr", pos, (p) => {
      const left = this.term(p);
      if (left === null) return null;
      let { value } = left;
      p = left.nextPos;
      while (true) {
        const ws = this.skipWs(p);
        let op = "+";
        let opPos = this.literal("+", ws);
        if (opPos === null) {
          op = "-";
          opPos = this.literal("-", ws);
        }
        if (opPos === null) break;
        const rhs = this.term(opPos);
        if (rhs === null) break;
        value = op === "+" ? value + rhs.value : value - rhs.value;
        p = rhs.nextPos;
      }
      return { value, nextPos: p };
    });
  }
}
```
