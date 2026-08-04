---
name: Bridge(ブリッジ)
category: デザインパターン
subcategory: 構造
complexity: 構造に関するパターン
summary: 抽象と実装を別々の継承階層に分離し、両者を独立に拡張できるようにする。
---
## 概要

「何をするか(抽象)」と「どう実現するか(実装)」を別々の継承階層に分離し、**両者を独立に拡張できるようにする**構造パターン。1つの継承階層だけで「図形の種類 × 描画方法」のような2軸の組み合わせを表現しようとすると、組み合わせの数だけサブクラスが爆発的に増える(「円×OpenGL描画」「円×DirectX描画」「四角×OpenGL描画」...)。Bridgeはこの2軸を「抽象側の継承階層」と「実装側の継承階層」に分け、抽象側が実装側のインスタンスを**保持(コンポジション)**することで橋渡しする。

## 仕組み

1. 「何をするか」を表す抽象クラス(例: `Shape`)を用意し、その中に実装側インターフェースへの参照をフィールドとして持たせる
2. 「どう実現するか」を表す実装インターフェース(例: `Renderer`)を別に定義し、複数の具体的な実装クラス(`OpenGLRenderer`、`DirectXRenderer`)を用意する
3. 抽象クラスのサブクラス(`Circle`、`Square`)は、実際の処理を自分で行わず、保持している`Renderer`のメソッドを呼び出すことで処理を委譲する
4. 「図形の種類」と「描画方法」はそれぞれ独立に増やせる。新しい描画方法を追加しても図形クラス側には手を入れず、新しい図形を追加しても描画方法側には手を入れない

継承だけで表現していれば`N × M`個必要だったクラスが、Bridgeでは`N + M`個で済む。

## 特性・トレードオフ

- **クラス爆発の回避**: 2つ(あるいはそれ以上)の独立した軸を持つ設計において、継承の組み合わせ爆発を防ぎ、それぞれの軸を独立に拡張可能にする
- **実行時の実装差し替え**: 継承と違いコンポジションで実装を保持しているため、実行時に使用する`Renderer`を動的に切り替えることも可能(継承では静的にコンパイル時に決まってしまう)
- **設計の初期コストが高い**: 最初から2つの軸に分割する設計は、単純な継承階層に比べて考えることが増え、小規模なプロジェクトでは過剰設計になりがち。「将来的に2軸目の拡張が必要になりそうか」を見極めてから導入すべき
- **使いどころ**: GUIツールキットとレンダリングバックエンドの分離、デバイスドライバ(デバイスの種類×プラットフォーム)、通知システム(通知の種類×送信チャネル)など、直交する2つ以上の変化軸を持つ設計

## 実装例

```python
from abc import ABC, abstractmethod

class Renderer(ABC):
    @abstractmethod
    def render_circle(self, radius: float) -> str: ...

class OpenGLRenderer(Renderer):
    def render_circle(self, radius: float) -> str:
        return f"[OpenGL] circle(radius={radius})"

class DirectXRenderer(Renderer):
    def render_circle(self, radius: float) -> str:
        return f"[DirectX] circle(radius={radius})"

class Shape(ABC):
    def __init__(self, renderer: Renderer):
        self.renderer = renderer

    @abstractmethod
    def draw(self) -> str: ...

class Circle(Shape):
    def __init__(self, renderer: Renderer, radius: float):
        super().__init__(renderer)
        self.radius = radius

    def draw(self) -> str:
        return self.renderer.render_circle(self.radius)

def bridge_demo() -> list[str]:
    shapes = [Circle(OpenGLRenderer(), 5), Circle(DirectXRenderer(), 3)]
    return [s.draw() for s in shapes]
```

```typescript
interface Renderer {
  renderCircle(radius: number): string;
}

class OpenGLRenderer implements Renderer {
  renderCircle(radius: number): string {
    return `[OpenGL] circle(radius=${radius})`;
  }
}

class DirectXRenderer implements Renderer {
  renderCircle(radius: number): string {
    return `[DirectX] circle(radius=${radius})`;
  }
}

abstract class Shape {
  protected renderer: Renderer;
  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }
  abstract draw(): string;
}

class Circle extends Shape {
  private radius: number;
  constructor(renderer: Renderer, radius: number) {
    super(renderer);
    this.radius = radius;
  }
  draw(): string {
    return this.renderer.renderCircle(this.radius);
  }
}

function bridgeDemo(): string[] {
  const shapes: Shape[] = [new Circle(new OpenGLRenderer(), 5), new Circle(new DirectXRenderer(), 3)];
  return shapes.map((s) => s.draw());
}
```

```cpp
#include <string>
#include <memory>
#include <vector>

class Renderer {
public:
    virtual ~Renderer() = default;
    virtual std::string renderCircle(double radius) const = 0;
};

class OpenGLRenderer : public Renderer {
public:
    std::string renderCircle(double radius) const override {
        return "[OpenGL] circle(radius=" + std::to_string(radius) + ")";
    }
};

class DirectXRenderer : public Renderer {
public:
    std::string renderCircle(double radius) const override {
        return "[DirectX] circle(radius=" + std::to_string(radius) + ")";
    }
};

class Shape {
protected:
    std::shared_ptr<Renderer> renderer;
public:
    explicit Shape(std::shared_ptr<Renderer> r) : renderer(std::move(r)) {}
    virtual ~Shape() = default;
    virtual std::string draw() const = 0;
};

class Circle : public Shape {
    double radius;
public:
    Circle(std::shared_ptr<Renderer> r, double radius) : Shape(std::move(r)), radius(radius) {}
    std::string draw() const override {
        return renderer->renderCircle(radius);
    }
};

std::vector<std::string> bridgeDemo() {
    std::vector<std::shared_ptr<Shape>> shapes;
    shapes.push_back(std::make_shared<Circle>(std::make_shared<OpenGLRenderer>(), 5));
    shapes.push_back(std::make_shared<Circle>(std::make_shared<DirectXRenderer>(), 3));
    std::vector<std::string> result;
    for (const auto& s : shapes) result.push_back(s->draw());
    return result;
}
```

```rust
trait Renderer {
    fn render_circle(&self, radius: f64) -> String;
}

struct OpenGlRenderer;
impl Renderer for OpenGlRenderer {
    fn render_circle(&self, radius: f64) -> String {
        format!("[OpenGL] circle(radius={})", radius)
    }
}

struct DirectXRenderer;
impl Renderer for DirectXRenderer {
    fn render_circle(&self, radius: f64) -> String {
        format!("[DirectX] circle(radius={})", radius)
    }
}

struct Circle {
    renderer: Box<dyn Renderer>,
    radius: f64,
}

impl Circle {
    fn draw(&self) -> String {
        self.renderer.render_circle(self.radius)
    }
}

fn bridge_demo() -> Vec<String> {
    let shapes: Vec<Circle> = vec![
        Circle { renderer: Box::new(OpenGlRenderer), radius: 5.0 },
        Circle { renderer: Box::new(DirectXRenderer), radius: 3.0 },
    ];
    shapes.iter().map(|s| s.draw()).collect()
}
```

```csharp
interface IRenderer
{
    string RenderCircle(double radius);
}

class OpenGLRenderer : IRenderer
{
    public string RenderCircle(double radius) => $"[OpenGL] circle(radius={radius})";
}

class DirectXRenderer : IRenderer
{
    public string RenderCircle(double radius) => $"[DirectX] circle(radius={radius})";
}

abstract class Shape
{
    protected IRenderer Renderer;
    protected Shape(IRenderer renderer) { Renderer = renderer; }
    public abstract string Draw();
}

class Circle : Shape
{
    private readonly double _radius;
    public Circle(IRenderer renderer, double radius) : base(renderer) { _radius = radius; }
    public override string Draw() => Renderer.RenderCircle(_radius);
}

static class BridgeDemo
{
    public static List<string> Run()
    {
        var shapes = new List<Shape> { new Circle(new OpenGLRenderer(), 5), new Circle(new DirectXRenderer(), 3) };
        return shapes.Select(s => s.Draw()).ToList();
    }
}
```
