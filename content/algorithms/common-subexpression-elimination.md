---
name: 共通部分式除去(CSE, Common Subexpression Elimination)
category: コンパイラ・構文解析
subcategory: コード生成・最適化
complexity: O(n)(ローカルCSE、nは基本ブロック内の命令数。式をハッシュテーブルで管理する場合)
summary: 同じ値を計算する式がプログラム中の複数箇所に現れる場合、最初の1回だけ計算して結果を再利用することで冗長な再計算を省く最適化。
---

## 概要

[3番地コード生成](/algorithms/three-address-code-generation)で得られる中間表現では、`a * b`のような同じ式が、プログラマが意識しないうちに複数箇所で(たとえば配列の添字計算やループの境界チェックなどで)繰り返し現れることが珍しくない。共通部分式除去(CSE)は、こうした重複する計算を検出し、最初に計算した結果を変数に保持しておいて2回目以降はその変数を再利用することで、同じ演算を何度も実行する無駄を省く最適化である。1つの基本ブロック内だけを見るローカルCSEと、基本ブロックをまたいで解析する大域的CSE(Global CSE)があり、後者は[定数伝播](/algorithms/constant-propagation)と同じくデータフロー解析として定式化される。CSEで生まれた「参照されなくなった元の計算」は、[不要コード除去](/algorithms/dead-code-elimination)によってさらに削除される、という相乗効果を持つ。

## 仕組み

1. 中間表現の各命令`t = a op b`について、演算子`op`とオペランド`a`, `b`の組を式の**キー**として扱う。可換演算子(`+`, `*`など)の場合はオペランドの順序を正規化しておく(`a + b`と`b + a`を同一の式として扱えるようにする)ことで、より多くの重複を検出できる
2. 基本ブロック内を先頭から順に走査しながら、「どの式キーが、どの変数に計算結果として保持されているか」を管理する**利用可能式テーブル**を保持する
3. 各命令を処理する際、まずその命令の代入先の変数(`dest`)が、既存の利用可能式のオペランドや結果として使われていないかを確認し、使われていれば該当エントリを**無効化**する(`dest`が上書きされることで、それに依存していた式はもう「利用可能」ではなくなるため)
4. 次に、その命令が計算する式のキーが既にテーブルにあるかを調べる。あれば、この命令を実際の計算ではなく「既にその式を保持している変数からのコピー」に置き換える。なければ、命令をそのまま残し、この式キーと代入先の変数の組をテーブルに新規登録する
5. **大域的CSE**(複数の基本ブロックをまたぐ場合)では、「その式がプログラムのこの地点に到達するまでの、あらゆる実行経路上で必ず計算済みである」ことを保証する必要がある。これは**利用可能式解析(Available Expressions Analysis)**という前向きデータフロー解析として定式化され、[定数伝播](/algorithms/constant-propagation)の合流演算が「共通する定数なら残す」だったのに対し、こちらは複数の経路が合流する地点で「全ての経路に共通して利用可能な式だけを利用可能とみなす」積集合(共通部分)を合流演算に使う点が異なる

## 特性・トレードオフ

- **計算量**: ローカルCSEは式をハッシュテーブルで管理すれば基本ブロック内を1回走査するだけで済み、命令数`n`に対して`O(n)`。大域的CSEはデータフロー解析の反復計算が必要になるためCFGのサイズに応じたコストがかかるが、実用上は十分高速に収束する
- **副作用のある式への注意**: 関数呼び出しやメモリアクセスを含む式は、見た目のオペランドが同じでも呼び出すたびに異なる結果を返しうる(グローバル状態の変更、例外、複数の変数が同じメモリを指す可能性があるエイリアシングなど)。副作用がないと保証できる純粋な演算にのみCSEを安全に適用でき、この安全性の判定はコンパイラの解析基盤(エイリアス解析など)に依存する
- **[不要コード除去](/algorithms/dead-code-elimination)との相乗効果**: CSEによって重複する計算が1箇所にまとめられると、元々あった計算命令の一部が使われなくなり、[不要コード除去](/algorithms/dead-code-elimination)が削除できる対象が増える。逆に不要コード除去で無駄な代入が先に消えていると、CSEが認識すべき式の依存関係が単純になる——最適化パスは単独ではなく、他のパスと繰り返し交互に適用することで効果が積み重なっていく
- **値番号付け(Value Numbering)との違い**: CSEと似た目的を持つ技法に値番号付けがあり、こちらは構文的な一致だけでなく「計算結果が意味的に等しいかどうか」を交換法則・結合法則まで踏まえて積極的に判定できる場合がある。CSEは基本的に構文的な一致(同じ演算子・同じオペランドの並び)を基準にするのに対し、値番号付けはより意味的な等価性まで踏み込む点が異なる
- **使いどころ**: ほぼ全ての実用コンパイラの標準最適化パス。ループ内で毎回同じ添字計算やアドレス計算を行っているコード、複雑な数式を複数箇所で参照するコード、[3番地コード生成](/algorithms/three-address-code-generation)直後に真っ先に適用される軽量な最適化パスとして

## 実装例

基本ブロック内の命令列に対してローカル共通部分式除去を行う。可換演算子のオペランドを正規化してキー化し、重複する計算をコピー命令に置き換える。

```python
from dataclasses import dataclass
from typing import Optional

COMMUTATIVE = {"+", "*"}


@dataclass
class Instr:
    dest: str
    op: str  # '+', '-', '*', '/', または単純代入を表す 'copy'
    a: str
    b: Optional[str] = None  # copy命令の場合はNone


def expr_key(op: str, a: str, b: str) -> tuple:
    """可換演算子はオペランドをソートして正規化し、a+bとb+aを同一視できるようにする"""
    if op in COMMUTATIVE:
        a, b = sorted((a, b))
    return (op, a, b)


def invalidate(available: dict[tuple, str], var: str) -> None:
    """varへの再代入によって使えなくなった利用可能式をテーブルから取り除く"""
    stale = [k for k, v in available.items() if var in (k[1], k[2]) or v == var]
    for k in stale:
        del available[k]


def local_cse(instrs: list[Instr]) -> list[Instr]:
    """基本ブロック内のローカル共通部分式除去。重複する計算をコピー命令に置き換えた命令列を返す"""
    available: dict[tuple, str] = {}  # 式のキー -> それを計算済みの変数名
    result: list[Instr] = []

    for instr in instrs:
        # destが再定義されるので、destに依存していた利用可能式は先に無効化しておく
        invalidate(available, instr.dest)

        if instr.b is None:
            result.append(instr)
            continue

        key = expr_key(instr.op, instr.a, instr.b)
        if key in available:
            result.append(Instr(instr.dest, "copy", available[key]))
        else:
            result.append(instr)
            available[key] = instr.dest

    return result
```

```typescript
const COMMUTATIVE = new Set(["+", "*"]);

interface Instr {
  dest: string;
  op: string; // '+', '-', '*', '/', または単純代入を表す 'copy'
  a: string;
  b?: string; // copy命令の場合はundefined
}

// 可換演算子はオペランドをソートして正規化し、a+bとb+aを同一視できるようにする
function exprKey(op: string, a: string, b: string): string {
  if (COMMUTATIVE.has(op)) {
    [a, b] = a <= b ? [a, b] : [b, a];
  }
  return `${op}:${a}:${b}`;
}

// varへの再代入によって使えなくなった利用可能式をテーブルから取り除く
function invalidate(available: Map<string, string>, varName: string): void {
  for (const [key, dest] of [...available]) {
    const [, a, b] = key.split(":");
    if (a === varName || b === varName || dest === varName) {
      available.delete(key);
    }
  }
}

// 基本ブロック内のローカル共通部分式除去。重複する計算をコピー命令に置き換えた命令列を返す
function localCse(instrs: Instr[]): Instr[] {
  const available = new Map<string, string>(); // 式のキー -> それを計算済みの変数名
  const result: Instr[] = [];

  for (const instr of instrs) {
    // destが再定義されるので、destに依存していた利用可能式は先に無効化しておく
    invalidate(available, instr.dest);

    if (instr.b === undefined) {
      result.push(instr);
      continue;
    }

    const key = exprKey(instr.op, instr.a, instr.b);
    if (available.has(key)) {
      result.push({ dest: instr.dest, op: "copy", a: available.get(key)! });
    } else {
      result.push(instr);
      available.set(key, instr.dest);
    }
  }

  return result;
}
```
