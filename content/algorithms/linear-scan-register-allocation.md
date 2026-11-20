---
name: 線形走査レジスタ割り当て
category: コンパイラ・構文解析
subcategory: コード生成・最適化
complexity: O(n log n)(n は変数の数。区間の整列が支配的)、ほぼ線形
summary: 変数の生存区間を開始位置の順に1回だけ走査し、レジスタが足りなくなったら終わりが最も遠い区間をメモリへ退避する。グラフ彩色より速く、JITコンパイラに向く。
---

## 概要

コンパイラが変数をCPUのレジスタに割り当てる問題は、変数の数がレジスタの数より多いことが普通なので、「どの変数をレジスタに置き、どれをメモリに退避(スピル)するか」を決める必要がある。古典的な[グラフ彩色による割り当て](/algorithms/register-allocation-graph-coloring)は、干渉グラフを作って色を塗る。品質は高いが、グラフの構築と彩色の繰り返しが重く、変数が多いと実行時間が膨らむ。

JIT(実行時コンパイル)では、コンパイル時間そのものがユーザーの待ち時間になるので、速さが重要になる。Poletto と Sarkar(1999年)が提案した**線形走査レジスタ割り当て(linear scan)**は、各変数が使われている区間(生存区間)をプログラムの順に1回なぞるだけで、グラフを作らずに割り当てを決める。品質はグラフ彩色にやや劣ることもあるが、速度に優れ、実装も簡単で、HotSpotのC1コンパイラやV8など、多くのJITコンパイラが改良版を採用していることで知られる。

## 仕組み

1. プログラムの命令に通し番号を振り、各変数について、**生存区間** `[開始, 終了]`(最初に定義された位置から、最後に使われる位置まで)を求める。ループがあれば、ループ全体にまで区間を延ばす
2. 区間を**開始位置の昇順**に並べる
3. 「アクティブな区間」の集合(いまレジスタを使っている区間)を持ち、終了位置の昇順に保つ
4. 区間 `i` を処理する:
   - **期限切れの除去**: アクティブな区間のうち、終了位置が `i` の開始位置より前のものをすべて取り除き、そのレジスタを空きに戻す
   - **空きがある**: 空きレジスタを1つ `i` に割り当て、アクティブに加える
   - **空きがない(スピル)**: アクティブな区間と `i` のうち、**終了位置が最も遠い**ものをメモリへ追い出す。`i` のほうが近く終わるなら、アクティブのうち最も遠く終わる区間のレジスタを `i` に譲り、その区間をスピルする。遠くまで使われる変数を追い出すほうが、レジスタを長く解放できるため

## 特性・トレードオフ

- **速い**: 区間の整列(O(n log n))と、各区間のアクティブ集合の操作だけ。グラフ彩色のように干渉グラフを作らない
- **区間を粗く扱う**: 生存区間を「開始から終了までの1つの連続した範囲」とみなすので、途中で使われていない「穴」も占有していると扱う。その分、レジスタを無駄に使うことがある。改良版は区間を分割して穴を活用する(second-chance binpacking、Wimmer と Franz のSSA形式への適用)
- **品質は十分実用的**: グラフ彩色の割り当てよりわずかにスピルが増えるが、実行時間の差は小さいことが多い
- **JITとの相性**: コンパイル時間が実行時間に含まれる環境で、現実的な選択肢。AOT(事前)コンパイラでは、品質重視でグラフ彩色が使われやすい
- **実際の制約**: 関数呼び出しで破壊されるレジスタ、特定のレジスタを要求する命令、レジスタのペアなどの制約を考慮する必要がある。実装は、これらの扱いで複雑になる

## 実装例

```python
def linear_scan(intervals, num_registers):
    """intervals: [(名前, 開始, 終了)]。割り当て結果 {名前: レジスタ番号 または 'spill'} を返す。"""
    intervals = sorted(intervals, key=lambda iv: iv[1])
    free = list(range(num_registers))
    active = []                     # (終了, 名前) を終了の昇順で保持
    reg = {}
    result = {}
    for name, start, end in intervals:
        # 期限切れの区間を取り除き、レジスタを解放する
        while active and active[0][0] < start:
            _, done = active.pop(0)
            free.append(reg[done])
        if free:
            reg[name] = free.pop(0)
            result[name] = reg[name]
        else:
            # 終了が最も遠い区間を追い出す
            far_end, far_name = active[-1]
            if far_end > end:
                reg[name] = reg[far_name]
                result[name] = reg[name]
                result[far_name] = "spill"
                active.pop()
            else:
                result[name] = "spill"
                continue
        active.append((end, name))
        active.sort()
    return result


ivs = [("a", 0, 8), ("b", 1, 3), ("c", 2, 10), ("d", 4, 6), ("e", 5, 9)]
print(linear_scan(ivs, 2))  # {'a': 0, 'b': 1, 'c': 'spill', 'd': 1, 'e': 'spill'}
```

```typescript
type Interval = { name: string; start: number; end: number };

function linearScan(intervals: Interval[], numRegisters: number): Record<string, number | "spill"> {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const free = Array.from({ length: numRegisters }, (_, i) => i);
  let active: { end: number; name: string }[] = [];
  const reg: Record<string, number> = {};
  const result: Record<string, number | "spill"> = {};
  for (const { name, start, end } of sorted) {
    while (active.length > 0 && active[0].end < start) {
      const done = active.shift()!;
      free.push(reg[done.name]);
    }
    if (free.length > 0) {
      reg[name] = free.shift()!;
      result[name] = reg[name];
    } else {
      const far = active[active.length - 1];
      if (far.end > end) {
        reg[name] = reg[far.name];
        result[name] = reg[name];
        result[far.name] = "spill";
        active.pop();
      } else {
        result[name] = "spill";
        continue;
      }
    }
    active.push({ end, name });
    active.sort((a, b) => a.end - b.end);
  }
  return result;
}

const ivs: Interval[] = [
  { name: "a", start: 0, end: 8 }, { name: "b", start: 1, end: 3 }, { name: "c", start: 2, end: 10 },
  { name: "d", start: 4, end: 6 }, { name: "e", start: 5, end: 9 },
];
console.log(linearScan(ivs, 2));
```
