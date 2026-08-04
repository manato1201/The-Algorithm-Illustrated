---
name: L-system(リンデンマイヤーシステム)
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(反復回数分の文字列長)
summary: 文字列の書き換え規則を繰り返し適用して自己相似な構造を生成する形式文法。植物やフラクタル地形の生成に使われる。
---

## 概要

L-system(リンデンマイヤーシステム)は、1968年に生物学者アリステッド・リンデンマイヤーが植物の細胞分裂パターンを説明するために考案した形式文法で、「ごく単純な書き換えルールを何度も適用するだけで、木の枝分かれのような複雑で自己相似な構造が生まれる」という性質を利用する。開始となる短い文字列(公理)に対し、各文字を対応する規則の文字列で置き換えることを指定した回数だけ繰り返すと、木の枝や葉脈、フラクタル図形のような文字列が得られる。この文字列を「前に進む」「左右に曲がる」といったタートルグラフィックスの命令として解釈すれば、そのまま植物や地形の描画に変換できる。

## 仕組み

1. **公理(axiom)**と呼ばれる開始文字列(例: `F`)を用意する
2. 各記号について「何に置き換えるか」を定めた**書き換え規則**を用意する(例: `F → F[+F]F[-F]F`。`[`と`]`は「現在の位置と向きを保存/復元」、`+`と`-`は「向きを回転」を表す)
3. 公理から始め、文字列中の全ての記号を、対応する規則で同時に(並列に)置き換える
4. 指定した反復回数だけ3を繰り返し、最終的な文字列を得る
5. 得られた文字列を先頭から1文字ずつ読み、タートルグラフィックス(現在位置と向きを持つペンで、`F`なら前進して線を描く、`+`/`-`なら向きを回転する、`[`/`]`ならスタックで分岐点を保存/復元する)として解釈すると、枝分かれした構造が描画される

反復回数を増やすほど、規則が入れ子的に適用されて構造が細かく複雑になっていく——1回の適用は単純でも、反復によって指数的に複雑な自己相似構造が生まれるのがL-systemの本質である。

## 特性・トレードオフ

- **計算量**: `n`回反復した際の文字列長は書き換え規則の展開率に応じて指数的に増加しうるため、反復回数を増やしすぎると生成コスト・描画コストが急激に膨らむ
- **自己相似性**: フラクタル図形(コッホ曲線、シダの葉など)がL-systemで自然に表現できるのは、書き換え規則が「全体と同じ構造を部分に埋め込む」性質を持つため。反復回数がそのままフラクタルの「詳細度」に対応する
- **確率的拡張**: 同じ記号に複数の書き換え規則を用意し、確率的にどれを適用するか選ぶ(確率文脈自由L-system)ことで、同じルールから多様なバリエーションの植物を生成できる。ゲームの背景に大量の「似ているが同一ではない」木を配置する際によく使われる
- **使いどころ**: 樹木・植物・シダ・血管網のようなプロシージャルなオーガニック形状の生成、地形の河川網生成。[パーリンノイズ](/algorithms/perlin-noise)が「滑らかな連続量」の生成に向くのに対し、L-systemは「枝分かれする離散的な構造」の生成に向く

## 実装例

```python
def expand(axiom: str, rules: dict[str, str], iterations: int) -> str:
    """公理を書き換え規則に従ってiterations回展開する(規則に無い文字はそのまま残す)。"""
    current = axiom
    for _ in range(iterations):
        current = "".join(rules.get(ch, ch) for ch in current)
    return current


def interpret(
    instructions: str, step: float = 1.0, angle_deg: float = 25.0
) -> list[tuple[float, float, float, float]]:
    """タートルグラフィックスとして解釈し、描画される各線分(x1,y1,x2,y2)を返す。"""
    import math

    x, y, heading = 0.0, 0.0, 90.0
    stack: list[tuple[float, float, float]] = []
    segments: list[tuple[float, float, float, float]] = []

    for ch in instructions:
        if ch == "F":
            nx = x + step * math.cos(math.radians(heading))
            ny = y + step * math.sin(math.radians(heading))
            segments.append((x, y, nx, ny))
            x, y = nx, ny
        elif ch == "+":
            heading += angle_deg
        elif ch == "-":
            heading -= angle_deg
        elif ch == "[":
            stack.append((x, y, heading))
        elif ch == "]":
            x, y, heading = stack.pop()
        # その他の記号(規則展開だけに使う非終端記号など)は描画上は無視する
    return segments
```

```typescript
function expand(axiom: string, rules: Record<string, string>, iterations: number): string {
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of current) next += rules[ch] ?? ch;
    current = next;
  }
  return current;
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function interpret(instructions: string, step = 1.0, angleDeg = 25.0): Segment[] {
  let x = 0;
  let y = 0;
  let heading = 90.0;
  const stack: [number, number, number][] = [];
  const segments: Segment[] = [];
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  for (const ch of instructions) {
    if (ch === "F") {
      const nx = x + step * Math.cos(toRad(heading));
      const ny = y + step * Math.sin(toRad(heading));
      segments.push({ x1: x, y1: y, x2: nx, y2: ny });
      x = nx;
      y = ny;
    } else if (ch === "+") {
      heading += angleDeg;
    } else if (ch === "-") {
      heading -= angleDeg;
    } else if (ch === "[") {
      stack.push([x, y, heading]);
    } else if (ch === "]") {
      const [px, py, ph] = stack.pop()!;
      x = px;
      y = py;
      heading = ph;
    }
  }
  return segments;
}
```

```cpp
#include <string>
#include <unordered_map>
#include <vector>
#include <cmath>
#include <tuple>

std::string expand(const std::string& axiom, const std::unordered_map<char, std::string>& rules, int iterations) {
    std::string current = axiom;
    for (int i = 0; i < iterations; i++) {
        std::string next;
        for (char ch : current) {
            auto it = rules.find(ch);
            next += (it != rules.end()) ? it->second : std::string(1, ch);
        }
        current = next;
    }
    return current;
}

struct Segment { double x1, y1, x2, y2; };

std::vector<Segment> interpret(const std::string& instructions, double step = 1.0, double angleDeg = 25.0) {
    double x = 0, y = 0, heading = 90.0;
    std::vector<std::tuple<double, double, double>> stack;
    std::vector<Segment> segments;
    const double pi = 3.14159265358979323846;

    for (char ch : instructions) {
        if (ch == 'F') {
            double rad = heading * pi / 180.0;
            double nx = x + step * std::cos(rad);
            double ny = y + step * std::sin(rad);
            segments.push_back({x, y, nx, ny});
            x = nx; y = ny;
        } else if (ch == '+') {
            heading += angleDeg;
        } else if (ch == '-') {
            heading -= angleDeg;
        } else if (ch == '[') {
            stack.push_back({x, y, heading});
        } else if (ch == ']') {
            std::tie(x, y, heading) = stack.back();
            stack.pop_back();
        }
    }
    return segments;
}
```

```rust
use std::collections::HashMap;

fn expand(axiom: &str, rules: &HashMap<char, String>, iterations: usize) -> String {
    let mut current = axiom.to_string();
    for _ in 0..iterations {
        let mut next = String::new();
        for ch in current.chars() {
            match rules.get(&ch) {
                Some(replacement) => next.push_str(replacement),
                None => next.push(ch),
            }
        }
        current = next;
    }
    current
}

struct Segment {
    x1: f64,
    y1: f64,
    x2: f64,
    y2: f64,
}

fn interpret(instructions: &str, step: f64, angle_deg: f64) -> Vec<Segment> {
    let mut x = 0.0_f64;
    let mut y = 0.0_f64;
    let mut heading = 90.0_f64;
    let mut stack: Vec<(f64, f64, f64)> = Vec::new();
    let mut segments = Vec::new();

    for ch in instructions.chars() {
        match ch {
            'F' => {
                let rad = heading.to_radians();
                let nx = x + step * rad.cos();
                let ny = y + step * rad.sin();
                segments.push(Segment { x1: x, y1: y, x2: nx, y2: ny });
                x = nx;
                y = ny;
            }
            '+' => heading += angle_deg,
            '-' => heading -= angle_deg,
            '[' => stack.push((x, y, heading)),
            ']' => {
                if let Some((px, py, ph)) = stack.pop() {
                    x = px;
                    y = py;
                    heading = ph;
                }
            }
            _ => {}
        }
    }
    segments
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Text;

record Segment(double X1, double Y1, double X2, double Y2);

static class LSystem
{
    public static string Expand(string axiom, Dictionary<char, string> rules, int iterations)
    {
        string current = axiom;
        for (int i = 0; i < iterations; i++)
        {
            var next = new StringBuilder();
            foreach (char ch in current)
                next.Append(rules.TryGetValue(ch, out var replacement) ? replacement : ch.ToString());
            current = next.ToString();
        }
        return current;
    }

    public static List<Segment> Interpret(string instructions, double step = 1.0, double angleDeg = 25.0)
    {
        double x = 0, y = 0, heading = 90.0;
        var stack = new Stack<(double X, double Y, double Heading)>();
        var segments = new List<Segment>();

        foreach (char ch in instructions)
        {
            if (ch == 'F')
            {
                double rad = heading * Math.PI / 180.0;
                double nx = x + step * Math.Cos(rad);
                double ny = y + step * Math.Sin(rad);
                segments.Add(new Segment(x, y, nx, ny));
                x = nx; y = ny;
            }
            else if (ch == '+') heading += angleDeg;
            else if (ch == '-') heading -= angleDeg;
            else if (ch == '[') stack.Push((x, y, heading));
            else if (ch == ']') (x, y, heading) = stack.Pop();
        }
        return segments;
    }
}
```
