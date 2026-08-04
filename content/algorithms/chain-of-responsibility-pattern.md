---
name: Chain of Responsibility(責任の連鎖)
category: デザインパターン
subcategory: 振る舞い
complexity: 振る舞いに関するパターン
summary: 複数のハンドラを鎖状につなぎ、処理できるものが現れるまで順に受け渡していく。
---
## 概要

1つの要求を、複数のハンドラを**鎖状につないだ経路**に沿って順番に渡していき、途中のいずれかのハンドラが処理できればそこで完結させる(あるいは全員が処理を加えた上で次に渡す)ふるまいパターン。要求を送る側は「誰が最終的に処理するか」を知らなくてよく、鎖の構成(どのハンドラをどの順で並べるか)を変えるだけで処理フローを柔軟に組み替えられる。GUIのイベントバブリング、ミドルウェアパイプライン、承認フロー(担当者→マネージャー→部長と順に決裁権限を確認する)などが代表例。

## 仕組み

1. 全てのハンドラが実装する共通インターフェースを定義する。通常は「要求を処理する」メソッドと「次のハンドラへの参照を設定する」メソッドを持つ
2. 各具体ハンドラは、渡された要求を自分が処理できるかどうかを判定する
3. 処理できる場合はそこで処理を行う(鎖を止めるか、処理した上でさらに次に渡すかは設計次第)
4. 処理できない、あるいは次にも渡したい場合は、自分が保持している「次のハンドラ」に要求をそのまま転送する
5. 送信側は鎖の先頭のハンドラにだけ要求を渡せばよく、実際にどのハンドラが処理したか(あるいは誰も処理しなかったか)を意識する必要がない

## 特性・トレードオフ

- **送信側と受信側の疎結合**: 要求の送信元は、実際に処理を行うハンドラの具体的なクラスを知る必要がなく、鎖の構成を変えるだけで処理フローを差し替えられる
- **鎖の構成を柔軟に組み替えられる**: ハンドラの追加・削除・並び替えが、送信側のコードに影響を与えずに行える(オープン・クローズド原則)
- **「誰も処理しなかった」ケースの扱いに注意**: 鎖の最後まで到達しても誰も処理しなかった場合の挙動(無視する、デフォルト処理をする、例外を投げるなど)を明確に設計しておかないと、要求が握りつぶされるバグを生みやすい
- **デバッグの難しさ**: 実行時に要求がどのハンドラを経由して処理されたかを追跡しづらくなることがある(鎖が長くなるほど顕著)
- **使いどころ**: HTTPミドルウェアパイプライン(認証→ロギング→レート制限→本処理)、GUIのイベント伝播、例外ハンドリングの階層、承認・決裁フローなど、複数の候補者のうち条件に合う者が処理を引き受ける場面

## 実装例

```python
from abc import ABC, abstractmethod
from typing import Optional

class Handler(ABC):
    def __init__(self):
        self._next: Optional["Handler"] = None

    def set_next(self, handler: "Handler") -> "Handler":
        self._next = handler
        return handler

    @abstractmethod
    def handle(self, amount: int) -> Optional[str]: ...

    def pass_to_next(self, amount: int) -> Optional[str]:
        if self._next:
            return self._next.handle(amount)
        return None

class Approver(Handler):
    def __init__(self, name: str, limit: int):
        super().__init__()
        self.name = name
        self.limit = limit

    def handle(self, amount: int) -> Optional[str]:
        if amount <= self.limit:
            return f"{self.name} approved {amount}"
        return self.pass_to_next(amount)

def chain_demo() -> list[str]:
    staff = Approver("Staff", 1000)
    manager = Approver("Manager", 5000)
    director = Approver("Director", 20000)
    staff.set_next(manager).set_next(director)
    amounts = [500, 3000, 15000, 50000]
    return [staff.handle(a) or "Rejected" for a in amounts]
```

```typescript
abstract class Handler {
  protected next: Handler | null = null;

  setNext(handler: Handler): Handler {
    this.next = handler;
    return handler;
  }

  abstract handle(amount: number): string | null;

  protected passToNext(amount: number): string | null {
    return this.next ? this.next.handle(amount) : null;
  }
}

class Approver extends Handler {
  private name: string;
  private limit: number;
  constructor(name: string, limit: number) {
    super();
    this.name = name;
    this.limit = limit;
  }

  handle(amount: number): string | null {
    if (amount <= this.limit) return `${this.name} approved ${amount}`;
    return this.passToNext(amount);
  }
}

function chainDemo(): string[] {
  const staff = new Approver("Staff", 1000);
  const manager = new Approver("Manager", 5000);
  const director = new Approver("Director", 20000);
  staff.setNext(manager).setNext(director);
  const amounts = [500, 3000, 15000, 50000];
  return amounts.map((a) => staff.handle(a) ?? "Rejected");
}
```

```cpp
#include <string>
#include <optional>
#include <vector>

class Handler {
protected:
    Handler* next = nullptr;
public:
    virtual ~Handler() = default;
    Handler* setNext(Handler* handler) { next = handler; return handler; }
    virtual std::optional<std::string> handle(int amount) = 0;
protected:
    std::optional<std::string> passToNext(int amount) {
        return next ? next->handle(amount) : std::nullopt;
    }
};

class Approver : public Handler {
    std::string name;
    int limit;
public:
    Approver(std::string name, int limit) : name(std::move(name)), limit(limit) {}
    std::optional<std::string> handle(int amount) override {
        if (amount <= limit) return name + " approved " + std::to_string(amount);
        return passToNext(amount);
    }
};

std::vector<std::string> chainDemo() {
    Approver staff("Staff", 1000);
    Approver manager("Manager", 5000);
    Approver director("Director", 20000);
    staff.setNext(&manager)->setNext(&director);
    std::vector<int> amounts = {500, 3000, 15000, 50000};
    std::vector<std::string> results;
    for (int a : amounts) {
        auto r = staff.handle(a);
        results.push_back(r.value_or("Rejected"));
    }
    return results;
}
```

```rust
// Rustでは可変な next ポインタを持つ連結リストは借用チェッカーと相性が悪いため、
// ハンドラの列をVecで保持し先頭から順に試す、という慣用的な形に適応させている。
struct Approver {
    name: String,
    limit: i64,
}

impl Approver {
    fn new(name: &str, limit: i64) -> Self {
        Approver { name: name.to_string(), limit }
    }

    fn try_handle(&self, amount: i64) -> Option<String> {
        if amount <= self.limit {
            Some(format!("{} approved {}", self.name, amount))
        } else {
            None
        }
    }
}

fn handle_chain(chain: &[Approver], amount: i64) -> String {
    for approver in chain {
        if let Some(result) = approver.try_handle(amount) {
            return result;
        }
    }
    "Rejected".to_string()
}

fn chain_demo() -> Vec<String> {
    let chain = vec![
        Approver::new("Staff", 1000),
        Approver::new("Manager", 5000),
        Approver::new("Director", 20000),
    ];
    let amounts = [500, 3000, 15000, 50000];
    amounts.iter().map(|&a| handle_chain(&chain, a)).collect()
}
```

```csharp
abstract class Handler
{
    protected Handler? Next;

    public Handler SetNext(Handler handler) { Next = handler; return handler; }
    public abstract string? Handle(int amount);
    protected string? PassToNext(int amount) => Next?.Handle(amount);
}

class Approver : Handler
{
    private readonly string _name;
    private readonly int _limit;
    public Approver(string name, int limit) { _name = name; _limit = limit; }

    public override string? Handle(int amount)
    {
        if (amount <= _limit) return $"{_name} approved {amount}";
        return PassToNext(amount);
    }
}

static class ChainDemo
{
    public static List<string> Run()
    {
        var staff = new Approver("Staff", 1000);
        var manager = new Approver("Manager", 5000);
        var director = new Approver("Director", 20000);
        staff.SetNext(manager).SetNext(director);
        var amounts = new[] { 500, 3000, 15000, 50000 };
        return amounts.Select(a => staff.Handle(a) ?? "Rejected").ToList();
    }
}
```
