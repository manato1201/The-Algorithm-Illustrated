---
name: Flyweight(フライウェイト)
category: デザインパターン
subcategory: 構造
complexity: 構造に関するパターン
summary: 共有可能な状態を複数のオブジェクトで使い回すことで、大量オブジェクト生成時のメモリ消費を抑える。
---
## 概要

大量に生成されるオブジェクトの中で、**複数のインスタンス間で共有できる状態(不変な部分)を1つのオブジェクトにまとめて使い回す**ことで、メモリ消費を大幅に削減する構造パターン。テキストエディタで数十万文字それぞれをオブジェクトとして扱う場合、各文字の「フォント・書体・色」のような共通データを毎回複製していてはメモリを圧迫するが、文字の種類ごとにフォント情報を1つだけ共有し、「その文字が画面のどこにあるか」という位置情報だけを個別に持たせれば、必要なメモリを劇的に減らせる——という発想。

## 仕組み

1. オブジェクトの状態を「**内在的状態**(intrinsic state、共有可能で不変な部分。文字の書体データなど)」と「**外在的状態**(extrinsic state、個々のインスタンスごとに異なる部分。文字の座標など)」に分離する
2. 内在的状態だけを持つ「フライウェイト」オブジェクトを用意し、これは同じ内在的状態を持つ全てのインスタンス間で共有される
3. フライウェイトファクトリーが、要求された内在的状態に対応するフライウェイトが既に存在すればそれを返し、なければ新規生成してキャッシュに登録する(内在的状態が同じなら同じインスタンスが再利用される)
4. 外在的状態は呼び出し側(クライアント)が管理し、フライウェイトのメソッドを呼び出す際に引数として毎回渡す(フライウェイト自体は外在的状態を保持しない)

## 特性・トレードオフ

- **メモリ使用量の劇的な削減**: 大量のオブジェクトが持つ共通データを1つのインスタンスに集約することで、素朴な実装に比べてメモリフットプリントを大きく減らせる
- **不変性の徹底が前提条件**: フライウェイトとして共有されるオブジェクトは複数の文脈から同時に参照されるため、内在的状態は不変(イミュータブル)でなければならない。もし可変にしてしまうと、ある箇所での変更が無関係な他の箇所に波及するバグを生む
- **設計・実装の複雑化とのトレードオフ**: 内在的状態と外在的状態を明確に切り分ける設計は、単純にオブジェクトをそのまま扱うより複雑になる。オブジェクト数がそれほど多くない、あるいはメモリが問題になっていない場面では過剰最適化になりやすい
- **使いどころ**: 大量の類似オブジェクトを扱う場面(テキストエディタの文字オブジェクト、ゲームにおける同種のパーティクルやタイル、地図アプリのアイコン描画など)、メモリ使用量が実際にボトルネックになっている場合に限定して適用すべき

## 実装例

テキストの各文字を描画する例。「フォント+サイズ」という内在的状態は`CharacterStyleFactory`が1つだけ生成して使い回し(5文字あっても同じフォント・サイズなら生成インスタンスは1個)、「どの文字か・どの座標か」という外在的状態は呼び出し側が都度渡す。

```python
class CharacterStyle:  # 内在的状態(共有可能): フォントとサイズ
    def __init__(self, font: str, size: int) -> None:
        self.font = font
        self.size = size

    def render(self, char: str, x: int, y: int) -> str:  # 外在的状態は引数として受け取る
        return f"'{char}' at ({x},{y}) [{self.font} {self.size}pt]"


class CharacterStyleFactory:
    def __init__(self) -> None:
        self._styles: dict[tuple[str, int], CharacterStyle] = {}

    def get_style(self, font: str, size: int) -> CharacterStyle:
        key = (font, size)
        if key not in self._styles:
            self._styles[key] = CharacterStyle(font, size)
        return self._styles[key]

    @property
    def unique_style_count(self) -> int:
        return len(self._styles)


def demo() -> tuple[list[str], int]:
    factory = CharacterStyleFactory()
    chars = [("H", 0, 0), ("e", 10, 0), ("l", 20, 0), ("l", 30, 0), ("o", 40, 0)]
    output = [factory.get_style("Arial", 12).render(ch, x, y) for ch, x, y in chars]
    return output, factory.unique_style_count  # 5文字でもフライウェイトは1個だけ生成される
```

```typescript
class CharacterStyle {
  private font: string;
  private size: number;
  constructor(font: string, size: number) {
    this.font = font;
    this.size = size;
  }
  render(char: string, x: number, y: number): string {
    return `'${char}' at (${x},${y}) [${this.font} ${this.size}pt]`;
  }
}

class CharacterStyleFactory {
  private styles = new Map<string, CharacterStyle>();
  getStyle(font: string, size: number): CharacterStyle {
    const key = `${font}|${size}`;
    if (!this.styles.has(key)) {
      this.styles.set(key, new CharacterStyle(font, size));
    }
    return this.styles.get(key)!;
  }
  get uniqueStyleCount(): number {
    return this.styles.size;
  }
}

function demo(): [string[], number] {
  const factory = new CharacterStyleFactory();
  const chars: [string, number, number][] = [
    ["H", 0, 0], ["e", 10, 0], ["l", 20, 0], ["l", 30, 0], ["o", 40, 0],
  ];
  const output = chars.map(([ch, x, y]) => factory.getStyle("Arial", 12).render(ch, x, y));
  return [output, factory.uniqueStyleCount];
}
```

```cpp
#include <string>
#include <map>
#include <vector>
#include <memory>

class CharacterStyle {
    std::string font;
    int size;
public:
    CharacterStyle(std::string font, int size) : font(std::move(font)), size(size) {}
    std::string render(const std::string& ch, int x, int y) const {
        return "'" + ch + "' at (" + std::to_string(x) + "," + std::to_string(y) +
               ") [" + font + " " + std::to_string(size) + "pt]";
    }
};

class CharacterStyleFactory {
    std::map<std::pair<std::string, int>, std::unique_ptr<CharacterStyle>> styles;
public:
    CharacterStyle& getStyle(const std::string& font, int size) {
        auto key = std::make_pair(font, size);
        auto it = styles.find(key);
        if (it == styles.end()) {
            it = styles.emplace(key, std::make_unique<CharacterStyle>(font, size)).first;
        }
        return *it->second;
    }
    size_t uniqueStyleCount() const { return styles.size(); }
};
```

```rust
use std::collections::HashMap;

struct CharacterStyle {
    font: String,
    size: u32,
}
impl CharacterStyle {
    fn render(&self, ch: char, x: i32, y: i32) -> String {
        format!("'{ch}' at ({x},{y}) [{} {}pt]", self.font, self.size)
    }
}

struct CharacterStyleFactory {
    styles: HashMap<(String, u32), CharacterStyle>,
}
impl CharacterStyleFactory {
    fn new() -> Self {
        Self { styles: HashMap::new() }
    }
    fn get_style(&mut self, font: &str, size: u32) -> &CharacterStyle {
        self.styles
            .entry((font.to_string(), size))
            .or_insert_with(|| CharacterStyle { font: font.to_string(), size })
    }
    fn unique_style_count(&self) -> usize {
        self.styles.len()
    }
}
```

```csharp
class CharacterStyle
{
    private readonly string font;
    private readonly int size;
    public CharacterStyle(string font, int size) { this.font = font; this.size = size; }
    public string Render(string ch, int x, int y) => $"'{ch}' at ({x},{y}) [{font} {size}pt]";
}

class CharacterStyleFactory
{
    private readonly Dictionary<(string, int), CharacterStyle> styles = new();
    public CharacterStyle GetStyle(string font, int size)
    {
        var key = (font, size);
        if (!styles.ContainsKey(key)) styles[key] = new CharacterStyle(font, size);
        return styles[key];
    }
    public int UniqueStyleCount => styles.Count;
}
```
