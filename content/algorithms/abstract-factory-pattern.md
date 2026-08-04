---
name: Abstract Factory(抽象ファクトリー)
category: デザインパターン
subcategory: 生成
complexity: 生成に関するパターン
summary: 関連するオブジェクト群をまとめて生成するインターフェースを提供し、具体的な実装群を丸ごと差し替え可能にする。
---
## 概要

互いに関連し合う複数の種類のオブジェクトを、**整合性を保ったまま一括で生成する**ためのインターフェースを提供する生成パターン。Factory Methodが「1種類のオブジェクトの生成」をサブクラスに委ねるのに対し、Abstract Factoryは「関連するオブジェクト一式(ファミリー)」の生成をまとめて切り替える点が異なる。代表例はGUIツールキットで、「ボタン」「チェックボックス」「スクロールバー」といった部品群を、Windows風・Mac風・Linux風のいずれかのファミリーとして統一的に生成したい場合に使われる。

## 仕組み

1. 生成したいオブジェクト群それぞれについて抽象インターフェース(`Button`、`Checkbox`など)を定義する
2. これらすべてを生成するメソッド(`createButton()`、`createCheckbox()`)を持つ抽象ファクトリーインターフェースを定義する
3. ファミリーごとに具体的なファクトリークラス(`WindowsFactory`、`MacFactory`)を実装し、それぞれが対応する具体クラス群(`WindowsButton`と`WindowsCheckbox`など)を生成する
4. アプリケーションは実行時にどのファクトリーを使うか(どのファミリーか)を1箇所だけで決定し、以降はすべて抽象インターフェース経由でオブジェクトを扱う
5. これにより「Windows用ボタンとMac用チェックボックスが混在する」といった、ファミリー間の不整合が構造的に起こり得なくなる

## 特性・トレードオフ

- **ファミリー全体の一貫性を保証する**: 個々の部品を別々のファクトリーメソッドで生成する場合と異なり、「異なるファミリーの部品が混ざる」バグを設計レベルで防げる
- **新しい部品の追加が高コスト**: 新しい種類の部品(例: `Slider`)をファミリーに追加する場合、抽象ファクトリーインターフェース自体と、それを実装する全ての具体ファクトリークラスを変更する必要がある(Factory Methodより拡張の柔軟性が低いというトレードオフ)
- **新しいファミリーの追加は容易**: 逆に、部品の種類を増やさず新しいファミリー(例: `LinuxFactory`)を追加するだけなら、既存コードに触れず新しいファクトリークラスを1つ足すだけで済む
- **使いどころ**: クロスプラットフォームUIツールキット、テーマ切り替え機能、データベースドライバ抽象化層(異なるRDBMS向けのConnection・Statement・ResultSetを一式で切り替える)など、「関連するオブジェクト群を丸ごと差し替える」ニーズがある場面

## 実装例

```python
from typing import Protocol


class Button(Protocol):
    def render(self) -> str: ...


class Checkbox(Protocol):
    def render(self) -> str: ...


class WindowsButton:
    def render(self) -> str:
        return "[Windows Button]"


class WindowsCheckbox:
    def render(self) -> str:
        return "[Windows Checkbox]"


class MacButton:
    def render(self) -> str:
        return "[Mac Button]"


class MacCheckbox:
    def render(self) -> str:
        return "[Mac Checkbox]"


class GUIFactory(Protocol):
    def create_button(self) -> Button: ...
    def create_checkbox(self) -> Checkbox: ...


class WindowsFactory:
    def create_button(self) -> Button:
        return WindowsButton()

    def create_checkbox(self) -> Checkbox:
        return WindowsCheckbox()


class MacFactory:
    def create_button(self) -> Button:
        return MacButton()

    def create_checkbox(self) -> Checkbox:
        return MacCheckbox()


def render_ui(factory: GUIFactory) -> list[str]:
    button = factory.create_button()
    checkbox = factory.create_checkbox()
    return [button.render(), checkbox.render()]
```

```typescript
interface Button {
  render(): string;
}
interface Checkbox {
  render(): string;
}

class WindowsButton implements Button {
  render(): string {
    return "[Windows Button]";
  }
}
class WindowsCheckbox implements Checkbox {
  render(): string {
    return "[Windows Checkbox]";
  }
}
class MacButton implements Button {
  render(): string {
    return "[Mac Button]";
  }
}
class MacCheckbox implements Checkbox {
  render(): string {
    return "[Mac Checkbox]";
  }
}

interface GUIFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
}

class WindowsFactory implements GUIFactory {
  createButton(): Button {
    return new WindowsButton();
  }
  createCheckbox(): Checkbox {
    return new WindowsCheckbox();
  }
}
class MacFactory implements GUIFactory {
  createButton(): Button {
    return new MacButton();
  }
  createCheckbox(): Checkbox {
    return new MacCheckbox();
  }
}

function renderUI(factory: GUIFactory): string[] {
  const button = factory.createButton();
  const checkbox = factory.createCheckbox();
  return [button.render(), checkbox.render()];
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
class Checkbox {
public:
    virtual ~Checkbox() = default;
    virtual std::string render() const = 0;
};

class WindowsButton : public Button {
public:
    std::string render() const override { return "[Windows Button]"; }
};
class WindowsCheckbox : public Checkbox {
public:
    std::string render() const override { return "[Windows Checkbox]"; }
};
class MacButton : public Button {
public:
    std::string render() const override { return "[Mac Button]"; }
};
class MacCheckbox : public Checkbox {
public:
    std::string render() const override { return "[Mac Checkbox]"; }
};

class GUIFactory {
public:
    virtual ~GUIFactory() = default;
    virtual std::unique_ptr<Button> createButton() const = 0;
    virtual std::unique_ptr<Checkbox> createCheckbox() const = 0;
};

class WindowsFactory : public GUIFactory {
public:
    std::unique_ptr<Button> createButton() const override { return std::make_unique<WindowsButton>(); }
    std::unique_ptr<Checkbox> createCheckbox() const override { return std::make_unique<WindowsCheckbox>(); }
};
class MacFactory : public GUIFactory {
public:
    std::unique_ptr<Button> createButton() const override { return std::make_unique<MacButton>(); }
    std::unique_ptr<Checkbox> createCheckbox() const override { return std::make_unique<MacCheckbox>(); }
};

std::vector<std::string> renderUI(const GUIFactory& factory) {
    auto button = factory.createButton();
    auto checkbox = factory.createCheckbox();
    return {button->render(), checkbox->render()};
}
```

```rust
trait Button {
    fn render(&self) -> String;
}
trait Checkbox {
    fn render(&self) -> String;
}

struct WindowsButton;
impl Button for WindowsButton {
    fn render(&self) -> String {
        "[Windows Button]".to_string()
    }
}
struct WindowsCheckbox;
impl Checkbox for WindowsCheckbox {
    fn render(&self) -> String {
        "[Windows Checkbox]".to_string()
    }
}
struct MacButton;
impl Button for MacButton {
    fn render(&self) -> String {
        "[Mac Button]".to_string()
    }
}
struct MacCheckbox;
impl Checkbox for MacCheckbox {
    fn render(&self) -> String {
        "[Mac Checkbox]".to_string()
    }
}

trait GUIFactory {
    fn create_button(&self) -> Box<dyn Button>;
    fn create_checkbox(&self) -> Box<dyn Checkbox>;
}

struct WindowsFactory;
impl GUIFactory for WindowsFactory {
    fn create_button(&self) -> Box<dyn Button> {
        Box::new(WindowsButton)
    }
    fn create_checkbox(&self) -> Box<dyn Checkbox> {
        Box::new(WindowsCheckbox)
    }
}
struct MacFactory;
impl GUIFactory for MacFactory {
    fn create_button(&self) -> Box<dyn Button> {
        Box::new(MacButton)
    }
    fn create_checkbox(&self) -> Box<dyn Checkbox> {
        Box::new(MacCheckbox)
    }
}

fn render_ui(factory: &dyn GUIFactory) -> Vec<String> {
    let button = factory.create_button();
    let checkbox = factory.create_checkbox();
    vec![button.render(), checkbox.render()]
}
```

```csharp
interface IButton
{
    string Render();
}
interface ICheckbox
{
    string Render();
}

class WindowsButton : IButton
{
    public string Render() => "[Windows Button]";
}
class WindowsCheckbox : ICheckbox
{
    public string Render() => "[Windows Checkbox]";
}
class MacButton : IButton
{
    public string Render() => "[Mac Button]";
}
class MacCheckbox : ICheckbox
{
    public string Render() => "[Mac Checkbox]";
}

interface IGuiFactory
{
    IButton CreateButton();
    ICheckbox CreateCheckbox();
}

class WindowsFactory : IGuiFactory
{
    public IButton CreateButton() => new WindowsButton();
    public ICheckbox CreateCheckbox() => new WindowsCheckbox();
}
class MacFactory : IGuiFactory
{
    public IButton CreateButton() => new MacButton();
    public ICheckbox CreateCheckbox() => new MacCheckbox();
}

static class AbstractFactoryDemo
{
    public static string[] RenderUi(IGuiFactory factory)
    {
        var button = factory.CreateButton();
        var checkbox = factory.CreateCheckbox();
        return new[] { button.Render(), checkbox.Render() };
    }
}
```
