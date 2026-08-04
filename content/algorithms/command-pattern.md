---
name: Command(コマンド)
category: デザインパターン
subcategory: 振る舞い
complexity: 振る舞いに関するパターン
summary: 操作をオブジェクトとしてカプセル化し、実行の取り消し・キューイング・ログ記録を可能にする。
---
## 概要

「何かを実行する」という操作そのものを、**引数付きの関数呼び出しとしてではなくオブジェクトとして扱えるように**カプセル化するふるまいパターン。操作をオブジェクト化することで、それを変数に格納したり、キューに積んだり、後から取り消したり、ログとして記録したりといった、操作自体をデータのように扱う応用が可能になる。GUIのメニュー項目・ボタン・キーボードショートカットがそれぞれ同じ「保存」操作にひもづく場合や、Undo/Redo機能、タスクキューなどが典型的な適用例。

## 仕組み

1. 全てのコマンドが実装する共通インターフェース(通常は`execute()`メソッド1つを持つ)を定義する
2. 具体的な操作ごとに、そのインターフェースを実装するコマンドクラスを用意する(`SaveCommand`、`CopyCommand`など)。コマンドは実行に必要な情報(操作対象=レシーバーへの参照、パラメータ)を内部に保持する
3. `execute()`が呼ばれると、コマンドは保持しているレシーバーに対して実際の処理を委譲する
4. 呼び出し元(ボタンやメニュー項目、あるいは呼び出しをスケジュールする側)は、具体的な操作内容を知らなくても、共通インターフェースの`execute()`を呼ぶだけで済む
5. Undo機能が必要な場合、コマンドに`undo()`メソッドも持たせ、実行時の状態を記録しておくことで、逆操作を可能にする。実行履歴をスタックで管理すれば、Undo/Redoスタックとして機能する

## 特性・トレードオフ

- **呼び出し元と処理内容の分離**: UIコンポーネント(ボタンなど)は「どのコマンドを実行するか」だけを知っていればよく、実際の処理ロジック(レシーバー)を直接知らなくてよい
- **操作の履歴管理・取り消しが自然に実現できる**: コマンドオブジェクトを配列やスタックに積んでおくことで、実行履歴の記録、Undo/Redo、あるいは操作のキューイング・スケジューリング(バッチ処理、遅延実行)が自然な形で実装できる
- **クラス数が増える**: 操作の種類ごとにコマンドクラスが必要になるため、単純な操作しかない場面では素朴な関数呼び出しに比べて冗長になりやすい(ただし現代の言語ではラムダ・クロージャで簡略化されることも多い)
- **使いどころ**: GUIのメニュー・ツールバー・ショートカットキーの統一的な操作管理、Undo/Redo機能、ジョブキュー・タスクスケジューラ、トランザクションのロールバック処理、マクロ記録機能など

## 実装例

```python
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...

class Document:
    def __init__(self):
        self.text = ""

class InsertTextCommand(Command):
    def __init__(self, doc: Document, text: str):
        self.doc = doc
        self.text = text

    def execute(self) -> None:
        self.doc.text += self.text

    def undo(self) -> None:
        self.doc.text = self.doc.text[: -len(self.text)]

class CommandInvoker:
    def __init__(self):
        self.history: list[Command] = []

    def execute(self, command: Command) -> None:
        command.execute()
        self.history.append(command)

    def undo(self) -> None:
        if self.history:
            self.history.pop().undo()

def command_demo() -> list[str]:
    doc = Document()
    invoker = CommandInvoker()
    invoker.execute(InsertTextCommand(doc, "Hello, "))
    invoker.execute(InsertTextCommand(doc, "World!"))
    snapshot1 = doc.text
    invoker.undo()
    snapshot2 = doc.text
    return [snapshot1, snapshot2]
```

```typescript
interface Command {
  execute(): void;
  undo(): void;
}

class TextDocument {
  text = "";
}

class InsertTextCommand implements Command {
  private doc: TextDocument;
  private text: string;
  constructor(doc: TextDocument, text: string) {
    this.doc = doc;
    this.text = text;
  }

  execute(): void {
    this.doc.text += this.text;
  }

  undo(): void {
    this.doc.text = this.doc.text.slice(0, -this.text.length);
  }
}

class CommandInvoker {
  private history: Command[] = [];

  execute(command: Command): void {
    command.execute();
    this.history.push(command);
  }

  undo(): void {
    const command = this.history.pop();
    if (command) command.undo();
  }
}

function commandDemo(): string[] {
  const doc = new TextDocument();
  const invoker = new CommandInvoker();
  invoker.execute(new InsertTextCommand(doc, "Hello, "));
  invoker.execute(new InsertTextCommand(doc, "World!"));
  const snapshot1 = doc.text;
  invoker.undo();
  const snapshot2 = doc.text;
  return [snapshot1, snapshot2];
}
```

```cpp
#include <string>
#include <vector>
#include <memory>

class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class TextDocument {
public:
    std::string text;
};

class InsertTextCommand : public Command {
    TextDocument& doc;
    std::string text;
public:
    InsertTextCommand(TextDocument& doc, std::string text) : doc(doc), text(std::move(text)) {}
    void execute() override { doc.text += text; }
    void undo() override { doc.text.resize(doc.text.size() - text.size()); }
};

class CommandInvoker {
    std::vector<std::unique_ptr<Command>> history;
public:
    void execute(std::unique_ptr<Command> command) {
        command->execute();
        history.push_back(std::move(command));
    }
    void undo() {
        if (!history.empty()) {
            history.back()->undo();
            history.pop_back();
        }
    }
};

std::vector<std::string> commandDemo() {
    TextDocument doc;
    CommandInvoker invoker;
    invoker.execute(std::make_unique<InsertTextCommand>(doc, "Hello, "));
    invoker.execute(std::make_unique<InsertTextCommand>(doc, "World!"));
    std::string snapshot1 = doc.text;
    invoker.undo();
    std::string snapshot2 = doc.text;
    return {snapshot1, snapshot2};
}
```

```rust
// Rustでは「コマンドが受信者への可変参照を保持する」設計は借用チェッカーと
// 相性が悪いため、コマンドをデータ(enum)として表現し、execute/undo に
// 受信者への可変参照を都度渡す慣用的な形に適応させている。
struct TextDocument {
    text: String,
}

enum DocCommand {
    InsertText(String),
}

impl DocCommand {
    fn execute(&self, doc: &mut TextDocument) {
        match self {
            DocCommand::InsertText(text) => doc.text.push_str(text),
        }
    }

    fn undo(&self, doc: &mut TextDocument) {
        match self {
            DocCommand::InsertText(text) => {
                let new_len = doc.text.len() - text.len();
                doc.text.truncate(new_len);
            }
        }
    }
}

struct CommandInvoker {
    history: Vec<DocCommand>,
}

impl CommandInvoker {
    fn new() -> Self {
        CommandInvoker { history: Vec::new() }
    }

    fn execute(&mut self, doc: &mut TextDocument, command: DocCommand) {
        command.execute(doc);
        self.history.push(command);
    }

    fn undo(&mut self, doc: &mut TextDocument) {
        if let Some(command) = self.history.pop() {
            command.undo(doc);
        }
    }
}

fn command_demo() -> Vec<String> {
    let mut doc = TextDocument { text: String::new() };
    let mut invoker = CommandInvoker::new();
    invoker.execute(&mut doc, DocCommand::InsertText("Hello, ".to_string()));
    invoker.execute(&mut doc, DocCommand::InsertText("World!".to_string()));
    let snapshot1 = doc.text.clone();
    invoker.undo(&mut doc);
    let snapshot2 = doc.text.clone();
    vec![snapshot1, snapshot2]
}
```

```csharp
interface ICommand
{
    void Execute();
    void Undo();
}

class TextDocument
{
    public string Text = "";
}

class InsertTextCommand : ICommand
{
    private readonly TextDocument _doc;
    private readonly string _text;
    public InsertTextCommand(TextDocument doc, string text) { _doc = doc; _text = text; }
    public void Execute() => _doc.Text += _text;
    public void Undo() => _doc.Text = _doc.Text.Substring(0, _doc.Text.Length - _text.Length);
}

class CommandInvoker
{
    private readonly Stack<ICommand> _history = new();
    public void Execute(ICommand command) { command.Execute(); _history.Push(command); }
    public void Undo() { if (_history.Count > 0) _history.Pop().Undo(); }
}

static class CommandDemo
{
    public static List<string> Run()
    {
        var doc = new TextDocument();
        var invoker = new CommandInvoker();
        invoker.Execute(new InsertTextCommand(doc, "Hello, "));
        invoker.Execute(new InsertTextCommand(doc, "World!"));
        var snapshot1 = doc.Text;
        invoker.Undo();
        var snapshot2 = doc.Text;
        return new List<string> { snapshot1, snapshot2 };
    }
}
```
