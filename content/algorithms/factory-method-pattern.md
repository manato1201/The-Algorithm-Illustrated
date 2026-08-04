---
name: Factory Method(ファクトリーメソッド)
category: デザインパターン
subcategory: 生成
complexity: 生成に関するパターン
summary: インスタンス生成をサブクラスに委ねることで、生成ロジックと利用側を分離する。
---
## 概要

オブジェクトの生成処理を専用の「生成メソッド」に切り出し、**どの具体クラスを生成するかの決定をサブクラスに委ねる**生成パターン。呼び出し側は常に抽象的な型(インターフェースや基底クラス)としてオブジェクトを受け取るため、「何を生成するか」と「生成されたものをどう使うか」が疎結合になる。UIフレームワークにおけるボタン生成(OSごとに見た目の異なるボタンを生成する)や、ロガーの実装切り替えなど、実行環境やコンテキストに応じて生成すべき具体クラスが変わる場面で典型的に使われる。

## 仕組み

1. 生成されるオブジェクト群に共通のインターフェース(または抽象基底クラス)を定義する
2. そのインターフェースを実装する具体クラスを複数用意する(例: `WindowsButton`、`MacButton`)
3. オブジェクトを生成する「ファクトリーメソッド」を親クラスに抽象メソッドとして宣言する
4. 各サブクラスがこのファクトリーメソッドをオーバーライドし、自分が担当する具体クラスを`new`して返す
5. 親クラスの他のロジック(テンプレート的な処理)は、ファクトリーメソッドが返す抽象型だけを見て動作するため、どのサブクラスが使われても変更なしに機能する

呼び出し側のコードには具体クラス名(`WindowsButton`など)が一切登場しないため、新しい種類のボタンを追加してもファクトリーメソッドをオーバーライドするサブクラスを1つ増やすだけで済む。

## 特性・トレードオフ

- **オープン・クローズド原則の体現**: 新しい生成対象を追加する際、既存コードを変更せず新しいサブクラスの追加だけで済む(拡張に対して開いており、修正に対して閉じている)
- **クラス数の増加というコスト**: 生成対象の種類が増えるたびに、それに対応するクリエイター側のサブクラスも増えていくため、シンプルなif分岐による生成に比べてクラス階層が複雑になりやすい
- **単純な条件分岐との比較**: 生成対象の種類が少なく将来増える見込みも薄いなら、素直な`if`/`switch`によるファクトリー関数の方が読みやすいことも多い。「将来の拡張性」を過大評価して過剰設計にならないよう注意が必要
- **使いどころ**: フレームワークが処理の骨格を提供しつつ、利用側アプリケーションに具体的な生成対象を決めさせたい場面(テンプレートメソッドパターンと組み合わさることが多い)、プラグイン機構やドライバの切り替えなど

## 実装例

OS(Windows/Mac)ごとに異なるボタンを生成する例。`Dialog`側のロジックは`createButton()`が返す抽象型`Button`だけを見て動作し、具体クラス名を一切知らない。

```python
from abc import ABC, abstractmethod


class Button(ABC):
    @abstractmethod
    def render(self) -> str: ...


class WindowsButton(Button):
    def render(self) -> str:
        return "[Windows Button]"


class MacButton(Button):
    def render(self) -> str:
        return "[Mac Button]"


class Dialog(ABC):
    @abstractmethod
    def create_button(self) -> Button: ...

    def render_dialog(self) -> str:
        button = self.create_button()  # ファクトリーメソッド呼び出し
        return f"Dialog with {button.render()}"


class WindowsDialog(Dialog):
    def create_button(self) -> Button:
        return WindowsButton()


class MacDialog(Dialog):
    def create_button(self) -> Button:
        return MacButton()


def demo() -> list[str]:
    dialogs: list[Dialog] = [WindowsDialog(), MacDialog()]
    return [d.render_dialog() for d in dialogs]
```

```typescript
interface Button {
  render(): string;
}
class WindowsButton implements Button {
  render(): string {
    return "[Windows Button]";
  }
}
class MacButton implements Button {
  render(): string {
    return "[Mac Button]";
  }
}

abstract class Dialog {
  abstract createButton(): Button;
  renderDialog(): string {
    const button = this.createButton();
    return `Dialog with ${button.render()}`;
  }
}
class WindowsDialog extends Dialog {
  createButton(): Button {
    return new WindowsButton();
  }
}
class MacDialog extends Dialog {
  createButton(): Button {
    return new MacButton();
  }
}

function demo(): string[] {
  const dialogs: Dialog[] = [new WindowsDialog(), new MacDialog()];
  return dialogs.map((d) => d.renderDialog());
}
```

```cpp
#include <memory>
#include <string>
#include <vector>

class Button {
public:
    virtual ~Button() = default;
    virtual std::string render() const = 0;
};
class WindowsButton : public Button {
public:
    std::string render() const override { return "[Windows Button]"; }
};
class MacButton : public Button {
public:
    std::string render() const override { return "[Mac Button]"; }
};

class Dialog {
public:
    virtual ~Dialog() = default;
    virtual std::unique_ptr<Button> createButton() const = 0;
    std::string renderDialog() const {
        auto button = createButton();
        return "Dialog with " + button->render();
    }
};
class WindowsDialog : public Dialog {
public:
    std::unique_ptr<Button> createButton() const override { return std::make_unique<WindowsButton>(); }
};
class MacDialog : public Dialog {
public:
    std::unique_ptr<Button> createButton() const override { return std::make_unique<MacButton>(); }
};

std::vector<std::string> demo() {
    std::vector<std::unique_ptr<Dialog>> dialogs;
    dialogs.push_back(std::make_unique<WindowsDialog>());
    dialogs.push_back(std::make_unique<MacDialog>());
    std::vector<std::string> result;
    for (const auto& d : dialogs) result.push_back(d->renderDialog());
    return result;
}
```

```rust
trait Button {
    fn render(&self) -> String;
}
struct WindowsButton;
impl Button for WindowsButton {
    fn render(&self) -> String {
        "[Windows Button]".to_string()
    }
}
struct MacButton;
impl Button for MacButton {
    fn render(&self) -> String {
        "[Mac Button]".to_string()
    }
}

trait Dialog {
    fn create_button(&self) -> Box<dyn Button>;
    fn render_dialog(&self) -> String {
        let button = self.create_button();
        format!("Dialog with {}", button.render())
    }
}
struct WindowsDialog;
impl Dialog for WindowsDialog {
    fn create_button(&self) -> Box<dyn Button> {
        Box::new(WindowsButton)
    }
}
struct MacDialog;
impl Dialog for MacDialog {
    fn create_button(&self) -> Box<dyn Button> {
        Box::new(MacButton)
    }
}

fn demo() -> Vec<String> {
    let dialogs: Vec<Box<dyn Dialog>> = vec![Box::new(WindowsDialog), Box::new(MacDialog)];
    dialogs.iter().map(|d| d.render_dialog()).collect()
}
```

```csharp
interface IButton { string Render(); }
class WindowsButton : IButton { public string Render() => "[Windows Button]"; }
class MacButton : IButton { public string Render() => "[Mac Button]"; }

abstract class Dialog
{
    public abstract IButton CreateButton();
    public string RenderDialog() => $"Dialog with {CreateButton().Render()}";
}
class WindowsDialog : Dialog { public override IButton CreateButton() => new WindowsButton(); }
class MacDialog : Dialog { public override IButton CreateButton() => new MacButton(); }

static class FactoryMethodDemo
{
    public static List<string> Demo()
    {
        var dialogs = new List<Dialog> { new WindowsDialog(), new MacDialog() };
        return dialogs.Select(d => d.RenderDialog()).ToList();
    }
}
```
