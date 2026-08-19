---
name: ピープホール最適化(Peephole Optimization)
category: コンパイラ・構文解析
subcategory: コード生成・最適化
complexity: O(n)(nは命令数。固定サイズの窓を1回スライドさせる走査。パターン数は定数)
summary: 生成された命令列の小さな窓(数命令分)だけを局所的に見て、冗長な命令パターンをより効率的な命令列に置き換える最適化パス。
---

## 概要

[定数伝播](/algorithms/constant-propagation)や[共通部分式除去](/algorithms/common-subexpression-elimination)、[レジスタ割り当て](/algorithms/register-allocation-graph-coloring)といった最適化パスは、それぞれ理にかなった変換を行うにもかかわらず、パスの実行結果として局所的に見ると不自然な命令列(直後に読み返すだけの冗長なストア、値がすぐ分かる自明な演算など)を残してしまうことがある。ピープホール最適化は、名前の通り「小さな窓(peephole)」越しに生成済みの命令列を数命令ずつだけ覗き見て、あらかじめ用意した冗長パターンに一致する箇所を、意味的に等価だがより効率的な命令列に機械的に置き換える最適化パスである。1つ1つの変換規則は単純だが、他の最適化パスが残した「後始末」を掃除する仕上げ工程として、パイプラインの最後段に置かれることが多い。

## 仕組み

1. 生成された命令列(アセンブリや低レベルの中間表現)の上を、固定サイズ(2〜4命令程度)の「窓」をスライドさせながら走査する
2. 窓の中の命令列が、あらかじめ用意されたパターンのいずれかに一致するかを調べる。代表的なパターンには次のようなものがある
   - **冗長なロード/ストアの除去**: `store x, r1`の直後に`load r2, x`が続き、`r1`と`r2`が同じレジスタであれば後者を削除できる(値は既にレジスタ上にある)
   - **代数的簡約**: `x + 0`、`x * 1`、`x * 0`のような自明な演算を、より単純な命令(コピーや定数代入)、あるいは命令自体の削除に置き換える
   - **強度削減(strength reduction)**: `x * 2`のような演算を、意味的に等価だが安価な`x << 1`(左シフト)のような命令に置き換える
   - **ジャンプの連鎖の解消**: `jump L1`の飛び先`L1`が別の`jump L2`だけの場合、間に`L1`を経由せず直接`L2`へ飛ぶよう書き換える
   - **到達不能コードの除去**: 無条件`jump`やreturnの直後に続く、どこからも参照されない命令列を削除する
3. マッチした窓を、より効率的な等価な命令列に置き換えてから窓を進める
4. 1回の置き換えによって、その前後の命令列が新たに別のパターンにマッチするようになることがある(冗長なロードを消したことで、その前の命令と後の命令が隣接し新たな最適化の機会が生まれる、など)。そのため実用的な実装では、変化がなくなるまで走査を複数回繰り返すか、置き換え後に窓を少し後退させて再チェックする

## 特性・トレードオフ

- **計算量**: 窓のサイズが定数であれば、1回の走査は命令数`n`に対して`O(n)`(各位置で定数個のパターンとの照合を定数時間で行う)。複数回の走査を行う実装でも、実用上は収束までの反復回数が小さく抑えられる
- **局所性ゆえの限界**: ピープホール最適化は狭い窓の中の情報しか見ないため、[定数伝播](/algorithms/constant-propagation)や[共通部分式除去](/algorithms/common-subexpression-elimination)のようなプログラム全体にまたがるデータフロー解析と比べると、発見できる最適化の範囲は限定的である。しかし実装が単純で、他の最適化パスが生成した見た目に冗長なコードの後始末として非常に効果的
- **他の最適化パスとの相性**: [定数畳み込み](/algorithms/constant-folding)・[定数伝播](/algorithms/constant-propagation)・[レジスタ割り当て](/algorithms/register-allocation-graph-coloring)などのパスを実行した後には、局所的に不自然な命令列(冗長なコピーやロード/ストア)が残ることが多く、ピープホール最適化はそれらのパスの後、パイプラインの最終段で仕上げの掃除として適用されることが多い
- **パターンの正しさの保証が必要**: 窓の中で置き換えるパターンが本当に意味的に等価であることを保証しないと、誤った最適化になってしまう。浮動小数点演算では丸め誤差の観点で`x*2`と`x+x`が完全には等価でない場合がある、フラグレジスタへの副作用を考慮しないと後続の条件分岐の意味が変わってしまう場合がある、といった点に注意が必要
- **使いどころ**: アセンブリ・機械語レベルの最終出力に対する仕上げ最適化(GCC、LLVMのバックエンドなど)、JITコンパイラでのホットパスの命令列の即席簡約、教育用途での「実装は小さいが効果の大きい最適化」の入門例

## 実装例

固定サイズの窓をスライドさせながら命令列を走査し、冗長なロードの除去・代数的簡約・強度削減・ジャンプ連鎖の解消を、変化がなくなるまで繰り返し適用する。

```python
import math
from dataclasses import dataclass
from typing import Optional


@dataclass
class Instr:
    op: str
    args: tuple


def is_power_of_two(n: int) -> Optional[int]:
    """nが2の冪ならlog2(n)を返し、そうでなければNoneを返す"""
    if n > 0 and (n & (n - 1)) == 0:
        return int(math.log2(n))
    return None


def peephole_pass(instrs: list[Instr]) -> list[Instr]:
    """命令列に対して1回のピープホール走査を行い、書き換え後の命令列を返す"""
    result: list[Instr] = []
    i = 0
    while i < len(instrs):
        window = instrs[i : i + 2]

        # パターン1: store x, r の直後の load r2, x で r == r2 なら冗長なロードを削除
        if (
            len(window) == 2
            and window[0].op == "store"
            and window[1].op == "load"
            and window[0].args[0] == window[1].args[1]
            and window[0].args[1] == window[1].args[0]
        ):
            result.append(window[0])
            i += 2
            continue

        instr = instrs[i]

        # パターン2: 加算・乗算の代数的簡約(x+0, x*1, x*0)
        if instr.op == "add" and instr.args[2] == 0:
            result.append(Instr("copy", (instr.args[0], instr.args[1])))
            i += 1
            continue
        if instr.op == "mul":
            dest, a, imm = instr.args
            if imm == 1:
                result.append(Instr("copy", (dest, a)))
                i += 1
                continue
            if imm == 0:
                result.append(Instr("const", (dest, 0)))
                i += 1
                continue
            shift = is_power_of_two(imm)
            if shift is not None:
                # パターン3: 強度削減。2の冪の乗算をシフト演算に置き換える
                result.append(Instr("shl", (dest, a, shift)))
                i += 1
                continue

        result.append(instr)
        i += 1

    return result


def resolve_jump_chains(instrs: list[Instr], labels: dict[str, int]) -> list[Instr]:
    """jump L1 の飛び先が jump L2 だけの場合、L1を経由せず直接L2へ飛ぶよう書き換える"""

    def final_target(label: str, seen: frozenset[str]) -> str:
        if label in seen:
            return label  # 循環ジャンプはそのまま返す(無限ループの温存を避ける)
        idx = labels.get(label)
        if idx is not None and idx < len(instrs) and instrs[idx].op == "jump":
            return final_target(instrs[idx].args[0], seen | {label})
        return label

    return [
        Instr("jump", (final_target(instr.args[0], frozenset()),)) if instr.op == "jump" else instr
        for instr in instrs
    ]


def optimize(instrs: list[Instr], labels: dict[str, int]) -> list[Instr]:
    """変化がなくなるまでピープホール走査を繰り返し適用する"""
    current = instrs
    while True:
        next_pass = resolve_jump_chains(peephole_pass(current), labels)
        if next_pass == current:
            return next_pass
        current = next_pass
```

```typescript
interface Instr {
  op: string;
  args: (string | number)[];
}

// nが2の冪ならlog2(n)を返し、そうでなければnullを返す
function isPowerOfTwo(n: number): number | null {
  return n > 0 && (n & (n - 1)) === 0 ? Math.log2(n) : null;
}

// 命令列に対して1回のピープホール走査を行い、書き換え後の命令列を返す
function peepholePass(instrs: Instr[]): Instr[] {
  const result: Instr[] = [];
  let i = 0;
  while (i < instrs.length) {
    const window = instrs.slice(i, i + 2);

    // パターン1: store x, r の直後の load r2, x で r == r2 なら冗長なロードを削除
    if (
      window.length === 2 &&
      window[0].op === "store" &&
      window[1].op === "load" &&
      window[0].args[0] === window[1].args[1] &&
      window[0].args[1] === window[1].args[0]
    ) {
      result.push(window[0]);
      i += 2;
      continue;
    }

    const instr = instrs[i];

    // パターン2: 加算・乗算の代数的簡約(x+0, x*1, x*0)
    if (instr.op === "add" && instr.args[2] === 0) {
      result.push({ op: "copy", args: [instr.args[0], instr.args[1]] });
      i++;
      continue;
    }
    if (instr.op === "mul") {
      const [dest, a, imm] = instr.args as [string, string, number];
      if (imm === 1) {
        result.push({ op: "copy", args: [dest, a] });
        i++;
        continue;
      }
      if (imm === 0) {
        result.push({ op: "const", args: [dest, 0] });
        i++;
        continue;
      }
      const shift = isPowerOfTwo(imm);
      if (shift !== null) {
        // パターン3: 強度削減。2の冪の乗算をシフト演算に置き換える
        result.push({ op: "shl", args: [dest, a, shift] });
        i++;
        continue;
      }
    }

    result.push(instr);
    i++;
  }
  return result;
}

// jump L1 の飛び先が jump L2 だけの場合、L1を経由せず直接L2へ飛ぶよう書き換える
function resolveJumpChains(
  instrs: Instr[],
  labels: Map<string, number>,
): Instr[] {
  function finalTarget(label: string, seen: Set<string>): string {
    if (seen.has(label)) return label; // 循環ジャンプはそのまま返す(無限ループの温存を避ける)
    const idx = labels.get(label);
    if (idx !== undefined && idx < instrs.length && instrs[idx].op === "jump") {
      return finalTarget(
        instrs[idx].args[0] as string,
        new Set([...seen, label]),
      );
    }
    return label;
  }

  return instrs.map((instr) =>
    instr.op === "jump"
      ? { op: "jump", args: [finalTarget(instr.args[0] as string, new Set())] }
      : instr,
  );
}

// 変化がなくなるまでピープホール走査を繰り返し適用する
function optimize(instrs: Instr[], labels: Map<string, number>): Instr[] {
  let current = instrs;
  while (true) {
    const nextPass = resolveJumpChains(peepholePass(current), labels);
    if (JSON.stringify(nextPass) === JSON.stringify(current)) return nextPass;
    current = nextPass;
  }
}
```
