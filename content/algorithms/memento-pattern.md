---
name: Memento(メメント)
category: デザインパターン
subcategory: 振る舞い
complexity: 振る舞いに関するパターン
summary: オブジェクトの内部状態をカプセル化して保存し、カプセル化を破らずに後から復元できるようにする。
---
## 概要

オブジェクトの内部状態のスナップショットを、**そのオブジェクトのカプセル化(privateフィールドへの外部アクセス禁止)を破ることなく**外部に保存し、後から復元できるようにするふるまいパターン。テキストエディタのUndo機能やゲームのセーブ/ロード機能のように、「過去のある時点の状態に戻したい」というニーズに対して、対象オブジェクトの内部実装を外部に晒すことなく実現する。

## 仕組み

1. 状態を保存したいオブジェクト(オリジネーター)が、自分自身の内部状態のスナップショットを表す「メメント」オブジェクトを生成するメソッド(`createMemento()`)を持つ
2. メメントは、生成元であるオリジネーター自身だけが中身を読み書きできるよう設計する(多くの言語ではメメントをオリジネーターの内部クラス(ネストクラス)にする、あるいは復元用のメソッドをオリジネーターにしか見えないアクセス制御にすることで実現する)
3. 外部の管理者(ケアテイカー、例えばUndo履歴を管理するコンポーネント)は、メメントを保持・管理するが、その中身を直接読み書きすることはできない。単に「いつか元に戻すためのブラックボックス」として保持するだけ
4. 復元したい時、ケアテイカーは保持していたメメントをオリジネーターに渡し(`originator.restore(memento)`)、オリジネーターがそのメメントの中身を使って自身の状態を書き戻す

## 特性・トレードオフ

- **カプセル化を保ったままの状態保存**: 状態のスナップショットを撮る・復元するという操作自体を、対象オブジェクトの内部実装を外部クラスに公開することなく実現できる。単純に「全フィールドをpublicにする」ような設計上の妥協が不要になる
- **メモリ消費というコスト**: 状態のスナップショットを複数保持する(Undo履歴を多段階持つなど)場合、各メメントが対象オブジェクトの状態を(部分的にせよ)複製して保持するため、履歴が深くなるほどメモリを消費する。差分(diff)だけを保存する最適化と組み合わせられることも多い
- **Commandパターンとの相性**: Undo/Redo機能は、実行された操作をCommandオブジェクトとして記録しつつ、各操作の実行前状態をMementoとして保存しておく、という2つのパターンの組み合わせで実装されることが多い
- **使いどころ**: テキストエディタ・グラフィックエディタのUndo/Redo機能、ゲームのセーブ/ロード・チェックポイント機能、トランザクションのロールバック、フォーム入力のキャンセル操作(編集前の状態に戻す)など

## 実装例

テキストエディタのUndo機能を題材に、オリジネーター(Editor)・メメント(EditorMemento)・ケアテイカー(History)の3者構成を最小実装する。

```python
class EditorMemento:
    def __init__(self, content: str):
        self._content = content

    def get_content(self) -> str:
        return self._content


class Editor:
    def __init__(self):
        self.content = ""

    def type(self, text: str) -> None:
        self.content += text

    def save(self) -> EditorMemento:
        return EditorMemento(self.content)

    def restore(self, memento: EditorMemento) -> None:
        self.content = memento.get_content()


class History:
    def __init__(self):
        self._mementos: list[EditorMemento] = []

    def push(self, memento: EditorMemento) -> None:
        self._mementos.append(memento)

    def pop(self) -> EditorMemento | None:
        return self._mementos.pop() if self._mementos else None


def demo() -> list[str]:
    editor = Editor()
    history = History()
    states = []

    editor.type("Hello")
    history.push(editor.save())
    editor.type(", World")
    history.push(editor.save())
    editor.type("!")
    states.append(editor.content)  # "Hello, World!"

    editor.restore(history.pop())
    states.append(editor.content)  # "Hello, World"

    editor.restore(history.pop())
    states.append(editor.content)  # "Hello"

    return states
```

```typescript
class EditorMemento {
  private content: string;
  constructor(content: string) {
    this.content = content;
  }
  getContent(): string {
    return this.content;
  }
}

class Editor {
  content = "";
  type(text: string): void {
    this.content += text;
  }
  save(): EditorMemento {
    return new EditorMemento(this.content);
  }
  restore(memento: EditorMemento): void {
    this.content = memento.getContent();
  }
}

class History {
  private mementos: EditorMemento[] = [];
  push(memento: EditorMemento): void {
    this.mementos.push(memento);
  }
  pop(): EditorMemento | undefined {
    return this.mementos.pop();
  }
}

function demo(): string[] {
  const editor = new Editor();
  const history = new History();
  const states: string[] = [];

  editor.type("Hello");
  history.push(editor.save());
  editor.type(", World");
  history.push(editor.save());
  editor.type("!");
  states.push(editor.content); // "Hello, World!"

  editor.restore(history.pop()!);
  states.push(editor.content); // "Hello, World"

  editor.restore(history.pop()!);
  states.push(editor.content); // "Hello"

  return states;
}
```

```cpp
#include <string>
#include <vector>
#include <optional>

class EditorMemento {
public:
    explicit EditorMemento(std::string content) : content(std::move(content)) {}
    const std::string& getContent() const { return content; }
private:
    std::string content;
};

class Editor {
public:
    std::string content;
    void type(const std::string& text) { content += text; }
    EditorMemento save() const { return EditorMemento(content); }
    void restore(const EditorMemento& memento) { content = memento.getContent(); }
};

class History {
public:
    void push(const EditorMemento& memento) { mementos.push_back(memento); }
    std::optional<EditorMemento> pop() {
        if (mementos.empty()) return std::nullopt;
        EditorMemento m = mementos.back();
        mementos.pop_back();
        return m;
    }
private:
    std::vector<EditorMemento> mementos;
};
```

```rust
struct EditorMemento {
    content: String,
}

impl EditorMemento {
    fn get_content(&self) -> &str {
        &self.content
    }
}

struct Editor {
    content: String,
}

impl Editor {
    fn new() -> Self {
        Editor { content: String::new() }
    }
    fn type_text(&mut self, text: &str) {
        self.content.push_str(text);
    }
    fn save(&self) -> EditorMemento {
        EditorMemento { content: self.content.clone() }
    }
    fn restore(&mut self, memento: &EditorMemento) {
        self.content = memento.get_content().to_string();
    }
}

struct History {
    mementos: Vec<EditorMemento>,
}

impl History {
    fn new() -> Self {
        History { mementos: Vec::new() }
    }
    fn push(&mut self, memento: EditorMemento) {
        self.mementos.push(memento);
    }
    fn pop(&mut self) -> Option<EditorMemento> {
        self.mementos.pop()
    }
}
```

```csharp
class EditorMemento
{
    private readonly string content;
    public EditorMemento(string content) { this.content = content; }
    public string GetContent() => content;
}

class Editor
{
    public string Content = "";
    public void Type(string text) => Content += text;
    public EditorMemento Save() => new EditorMemento(Content);
    public void Restore(EditorMemento memento) => Content = memento.GetContent();
}

class History
{
    private readonly List<EditorMemento> mementos = new();
    public void Push(EditorMemento memento) => mementos.Add(memento);
    public EditorMemento? Pop()
    {
        if (mementos.Count == 0) return null;
        var m = mementos[^1];
        mementos.RemoveAt(mementos.Count - 1);
        return m;
    }
}

static List<string> Demo()
{
    var editor = new Editor();
    var history = new History();
    var states = new List<string>();

    editor.Type("Hello");
    history.Push(editor.Save());
    editor.Type(", World");
    history.Push(editor.Save());
    editor.Type("!");
    states.Add(editor.Content); // "Hello, World!"

    editor.Restore(history.Pop()!);
    states.Add(editor.Content); // "Hello, World"

    editor.Restore(history.Pop()!);
    states.Add(editor.Content); // "Hello"

    return states;
}
```
