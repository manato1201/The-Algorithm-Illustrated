---
name: Composite(コンポジット)
category: デザインパターン
subcategory: 構造
complexity: 構造に関するパターン
summary: 個々のオブジェクトとその集合を同じインターフェースで扱い、木構造を再帰的に統一的に処理する。
---
## 概要

「個々の要素(葉)」と「要素の集合(枝)」を**同じインターフェースで扱えるようにする**ことで、木構造全体を再帰的かつ統一的に処理できるようにする構造パターン。ファイルシステム(ファイルとフォルダ)、GUIのビューツリー(単一の部品と、部品をまとめたコンテナ)、組織図(社員と部署)など、「1つのもの」と「複数のものをまとめたもの」が同じように振る舞ってほしい場面で使われる。呼び出し側は、対象が単一要素なのか集合なのかを意識せずに操作できる。

## 仕組み

1. 「葉」と「枝」の両方が実装する共通インターフェース(コンポーネント)を定義する。例えば`FileSystemNode`に`getSize()`のような操作を宣言する
2. 葉クラス(`File`)はこの操作を自分自身の値として素直に実装する
3. 枝クラス(`Directory`)は、自分が保持する子要素(コンポーネント型の配列。葉でも枝でも構わない)それぞれに対して同じ操作を再帰的に呼び出し、その結果を集約して返す(例: 子の合計サイズ)
4. 呼び出し側は`node.getSize()`を呼ぶだけでよく、対象が単一ファイルかディレクトリ全体かを判定する分岐を書く必要がない
5. 枝は子として葉だけでなく別の枝も持てるため、任意の深さの木構造が自然に表現できる

## 特性・トレードオフ

- **統一的なクライアントコード**: 呼び出し側は「単一要素か集合か」で処理を分岐する必要がなくなり、木構造の走査ロジックが大幅にシンプルになる
- **再帰との相性の良さ**: 木構造の集約処理(合計サイズ、深さ、要素数など)は、Compositeの再帰的な構造にそのまま乗せられる
- **型の均質化に伴う制約**: 葉と枝を同じインターフェースにまとめる代わりに、「葉には本来意味を持たない操作(子を追加する`add()`など)」もインターフェースに含めざるを得ないことがあり、葉クラス側でその操作を例外を投げるなどして無効化する必要が出てくる場合がある(インターフェース分離原則との緊張関係)
- **使いどころ**: ファイルシステム、GUIのウィジェットツリー、組織階層、AST(抽象構文木)、メニュー構造など、再帰的な部分-全体階層を扱うあらゆる場面

## 実装例

```python
from abc import ABC, abstractmethod

class FileSystemNode(ABC):
    @abstractmethod
    def get_size(self) -> int: ...

class File(FileSystemNode):
    def __init__(self, name: str, size: int):
        self.name = name
        self.size = size

    def get_size(self) -> int:
        return self.size

class Directory(FileSystemNode):
    def __init__(self, name: str):
        self.name = name
        self.children: list[FileSystemNode] = []

    def add(self, node: FileSystemNode) -> "Directory":
        self.children.append(node)
        return self

    def get_size(self) -> int:
        return sum(child.get_size() for child in self.children)

def composite_demo() -> int:
    root = Directory("root")
    src = Directory("src")
    src.add(File("main.py", 120)).add(File("utils.py", 80))
    root.add(src).add(File("README.md", 40))
    return root.get_size()
```

```typescript
interface FileSystemNode {
  getSize(): number;
}

class FileNode implements FileSystemNode {
  private name: string;
  private size: number;
  constructor(name: string, size: number) {
    this.name = name;
    this.size = size;
  }
  getSize(): number {
    return this.size;
  }
}

class DirectoryNode implements FileSystemNode {
  private name: string;
  private children: FileSystemNode[] = [];
  constructor(name: string) {
    this.name = name;
  }

  add(node: FileSystemNode): DirectoryNode {
    this.children.push(node);
    return this;
  }

  getSize(): number {
    return this.children.reduce((sum, c) => sum + c.getSize(), 0);
  }
}

function compositeDemo(): number {
  const root = new DirectoryNode("root");
  const src = new DirectoryNode("src");
  src.add(new FileNode("main.py", 120)).add(new FileNode("utils.py", 80));
  root.add(src).add(new FileNode("README.md", 40));
  return root.getSize();
}
```

```cpp
#include <string>
#include <vector>
#include <memory>

class FileSystemNode {
public:
    virtual ~FileSystemNode() = default;
    virtual int getSize() const = 0;
};

class FileNode : public FileSystemNode {
    std::string name;
    int size;
public:
    FileNode(std::string name, int size) : name(std::move(name)), size(size) {}
    int getSize() const override { return size; }
};

class DirectoryNode : public FileSystemNode {
    std::string name;
    std::vector<std::shared_ptr<FileSystemNode>> children;
public:
    explicit DirectoryNode(std::string name) : name(std::move(name)) {}
    DirectoryNode& add(std::shared_ptr<FileSystemNode> node) {
        children.push_back(std::move(node));
        return *this;
    }
    int getSize() const override {
        int total = 0;
        for (const auto& c : children) total += c->getSize();
        return total;
    }
};

int compositeDemo() {
    auto root = std::make_shared<DirectoryNode>("root");
    auto src = std::make_shared<DirectoryNode>("src");
    src->add(std::make_shared<FileNode>("main.py", 120)).add(std::make_shared<FileNode>("utils.py", 80));
    root->add(src).add(std::make_shared<FileNode>("README.md", 40));
    return root->getSize();
}
```

```rust
trait FileSystemNode {
    fn get_size(&self) -> i64;
}

struct FileNode {
    #[allow(dead_code)]
    name: String,
    size: i64,
}

impl FileSystemNode for FileNode {
    fn get_size(&self) -> i64 {
        self.size
    }
}

struct DirectoryNode {
    #[allow(dead_code)]
    name: String,
    children: Vec<Box<dyn FileSystemNode>>,
}

impl DirectoryNode {
    fn new(name: &str) -> Self {
        DirectoryNode { name: name.to_string(), children: Vec::new() }
    }

    fn add(mut self, node: Box<dyn FileSystemNode>) -> Self {
        self.children.push(node);
        self
    }
}

impl FileSystemNode for DirectoryNode {
    fn get_size(&self) -> i64 {
        self.children.iter().map(|c| c.get_size()).sum()
    }
}

fn composite_demo() -> i64 {
    let src = DirectoryNode::new("src")
        .add(Box::new(FileNode { name: "main.py".to_string(), size: 120 }))
        .add(Box::new(FileNode { name: "utils.py".to_string(), size: 80 }));
    let root = DirectoryNode::new("root")
        .add(Box::new(src))
        .add(Box::new(FileNode { name: "README.md".to_string(), size: 40 }));
    root.get_size()
}
```

```csharp
interface IFileSystemNode
{
    int GetSize();
}

class FileNode : IFileSystemNode
{
    private readonly string _name;
    private readonly int _size;
    public FileNode(string name, int size) { _name = name; _size = size; }
    public int GetSize() => _size;
}

class DirectoryNode : IFileSystemNode
{
    private readonly string _name;
    private readonly List<IFileSystemNode> _children = new();
    public DirectoryNode(string name) { _name = name; }
    public DirectoryNode Add(IFileSystemNode node) { _children.Add(node); return this; }
    public int GetSize() => _children.Sum(c => c.GetSize());
}

static class CompositeDemo
{
    public static int Run()
    {
        var root = new DirectoryNode("root");
        var src = new DirectoryNode("src");
        src.Add(new FileNode("main.py", 120)).Add(new FileNode("utils.py", 80));
        root.Add(src).Add(new FileNode("README.md", 40));
        return root.GetSize();
    }
}
```
