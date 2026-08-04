---
name: 初等セルオートマトン(Rule 30等)
category: シミュレーション・群知能
subcategory: セルオートマトン
complexity: O(n)(1世代あたり、nはセル数)
summary: 1次元に並んだ白黒2状態のセルが、自分と両隣3セルの状態だけから次の状態を決める、8通りのパターンの組み合わせ(256通りのルール)だけで、ランダムに見える複雑な模様からフラクタル、さらにはチューリング完全な計算までもが生まれることをスティーブン・ウルフラムが体系的に示した、最も単純な計算モデル。
---

## 概要

[コンウェイのライフゲーム](/algorithms/conways-game-of-life)は2次元グリッド上のセルオートマトンだが、それをさらに単純化して1次元の列に並んだセルだけで考えたらどうなるだろうか。初等セルオートマトンは、1次元に並んだ白黒2状態のセルが、「自分自身と左右の隣接セル」というたった3セルの組み合わせ(2³=8通り)だけから次の世代の状態を決める、考えうる限り最も単純な部類のセルオートマトンである。1980年代にスティーブン・ウルフラム(Wolfram)がこの256通りの規則(ルール)を体系的に分類し、その中の「Rule 30」が完全に決定論的な規則から予測不可能に見える複雑なパターンを生み出すこと、「Rule 110」に至ってはチューリング完全(あらゆる計算を原理的に実行できる)であることを示したことで、計算理論・複雑系科学における画期的な発見として知られるようになった。

## 仕組み

1. 1次元に並んだ`n`個のセル(それぞれ白0または黒1の状態)を初期状態として用意する(典型的には中央のセルだけを黒にした状態から始める)
2. 各セルについて、自分自身と左右の隣接セルの3セルの状態の組み合わせ(`000`から`111`までの8パターン)を調べる
3. 各パターンに対して、次の世代でそのセルが白になるか黒になるかを定めた規則表を適用する。この規則表自体は8ビットの数値として表現でき、`00011110`のような8ビットパターンを10進数に変換した数(0〜255)が、その規則の「ルール番号」になる(例えば`Rule 30`は2進数`00011110`に対応)
4. 全セルについて同時に次世代の状態を計算し、1行下に新しい世代として描画する
5. これを世代数の分だけ繰り返すと、各行が1世代に対応する2次元の模様(時間軸を縦方向に伸ばした図)が完成する

## 特性・トレードオフ

- **計算量**: 各世代で全`n`セルを1回ずつ調べるだけなので`O(n)`per世代——[ライフゲーム](/algorithms/conways-game-of-life)の2次元版と同様、規則自体は極めて軽量な計算で済む
- **ウルフラムによる4つのクラス分類**: 256通りの規則は、その振る舞いによって「クラス1(すぐに単調な状態に収束)」「クラス2(単純な周期パターンを繰り返す)」「クラス3(ランダムに見えるカオス的な模様)」「クラス4(局所的な構造が複雑に相互作用し続ける、Rule 110のように計算能力を持つ)」の4つに分類できることが示されており、単純な規則から複雑さがどう生まれるかを研究する複雑系科学の基礎的な分類法になっている
- **決定論的な規則から予測不可能な複雑さが生まれるという逆説**: Rule 30は完全に決定論的(乱数を一切使わない)であるにもかかわらず、生成されるパターンは統計的検定をパスするほど「ランダムに見える」——実際にMathematica(ウルフラムが開発した数式処理システム)の擬似乱数生成器の一部として実際に採用されたことがある
- **使いどころ**: 複雑系科学・人工生命の研究(単純な局所規則から創発する複雑さの研究)、暗号学における擬似乱数生成(Rule 30ベース)、計算理論の教育教材(Rule 110のチューリング完全性証明)、テクスチャ生成(貝殻の模様の一部はセルオートマトンに似た化学反応で形成されることが知られている)

## 実装例

```python
def elementary_ca(rule: int, initial: list[int], generations: int) -> list[list[int]]:
    rule_bits = [(rule >> i) & 1 for i in range(8)]
    rows = [initial]
    current = initial
    n = len(initial)
    for _ in range(generations - 1):
        nxt = [0] * n
        for i in range(n):
            left = current[i - 1] if i > 0 else 0
            mid = current[i]
            right = current[i + 1] if i < n - 1 else 0
            pattern = (left << 2) | (mid << 1) | right
            nxt[i] = rule_bits[pattern]
        rows.append(nxt)
        current = nxt
    return rows
```

```typescript
function elementaryCA(rule: number, initial: number[], generations: number): number[][] {
  const ruleBits = Array.from({ length: 8 }, (_, i) => (rule >> i) & 1);
  const rows: number[][] = [initial];
  let current = initial;
  const n = initial.length;
  for (let g = 0; g < generations - 1; g++) {
    const next = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const left = i > 0 ? current[i - 1] : 0;
      const mid = current[i];
      const right = i < n - 1 ? current[i + 1] : 0;
      const pattern = (left << 2) | (mid << 1) | right;
      next[i] = ruleBits[pattern];
    }
    rows.push(next);
    current = next;
  }
  return rows;
}
```

```cpp
#include <vector>

std::vector<std::vector<int>> elementaryCA(int rule, const std::vector<int>& initial, int generations) {
    std::vector<int> ruleBits(8);
    for (int i = 0; i < 8; i++) ruleBits[i] = (rule >> i) & 1;

    std::vector<std::vector<int>> rows;
    rows.push_back(initial);
    std::vector<int> current = initial;
    int n = static_cast<int>(initial.size());

    for (int g = 0; g < generations - 1; g++) {
        std::vector<int> next(n, 0);
        for (int i = 0; i < n; i++) {
            int left = i > 0 ? current[i - 1] : 0;
            int mid = current[i];
            int right = i < n - 1 ? current[i + 1] : 0;
            int pattern = (left << 2) | (mid << 1) | right;
            next[i] = ruleBits[pattern];
        }
        rows.push_back(next);
        current = next;
    }
    return rows;
}
```

```rust
fn elementary_ca(rule: u8, initial: &[u8], generations: usize) -> Vec<Vec<u8>> {
    let rule_bits: Vec<u8> = (0..8).map(|i| (rule >> i) & 1).collect();
    let n = initial.len();
    let mut rows = vec![initial.to_vec()];
    let mut current = initial.to_vec();

    for _ in 0..generations.saturating_sub(1) {
        let mut next = vec![0u8; n];
        for i in 0..n {
            let left = if i > 0 { current[i - 1] } else { 0 };
            let mid = current[i];
            let right = if i < n - 1 { current[i + 1] } else { 0 };
            let pattern = (left << 2) | (mid << 1) | right;
            next[i] = rule_bits[pattern as usize];
        }
        rows.push(next.clone());
        current = next;
    }
    rows
}
```

```csharp
static List<int[]> ElementaryCa(int rule, int[] initial, int generations)
{
    var ruleBits = Enumerable.Range(0, 8).Select(i => (rule >> i) & 1).ToArray();
    var rows = new List<int[]> { initial };
    var current = initial;
    int n = initial.Length;

    for (int g = 0; g < generations - 1; g++)
    {
        var next = new int[n];
        for (int i = 0; i < n; i++)
        {
            int left = i > 0 ? current[i - 1] : 0;
            int mid = current[i];
            int right = i < n - 1 ? current[i + 1] : 0;
            int pattern = (left << 2) | (mid << 1) | right;
            next[i] = ruleBits[pattern];
        }
        rows.Add(next);
        current = next;
    }
    return rows;
}
```
