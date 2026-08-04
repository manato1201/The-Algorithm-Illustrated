---
name: State(ステート)
category: デザインパターン
subcategory: 振る舞い
complexity: 振る舞いに関するパターン
summary: オブジェクトの状態ごとの振る舞いを別クラスに分離し、状態遷移をif文の羅列ではなくオブジェクトの差し替えとして表現する。
---
## 概要

オブジェクトの振る舞いが内部の「状態」によって大きく変わる場合に、その状態ごとの振る舞いを**それぞれ別クラスに分離**し、状態遷移を巨大なif/switch文の羅列ではなく「保持しているオブジェクトの差し替え」として表現するふるまいパターン。自動販売機(硬貨投入待ち→商品選択待ち→払い出し中、のように状態ごとに受け付ける操作や挙動が変わる)、TCPコネクション(接続前・確立済み・切断中)、メディアプレイヤー(再生中・一時停止・停止)など、有限状態機械としてモデル化できる対象に自然に対応する。

## 仕組み

1. 状態ごとの振る舞いを表す共通インターフェース(`State`)を定義し、コンテキストが受け付ける操作(`handle()`など)をメソッドとして宣言する
2. 各状態に対応する具体クラス(`WaitingForCoinState`、`DispensingState`など)がこのインターフェースを実装し、その状態特有の振る舞い(何ができて何ができないか)を実装する。状態遷移が必要な場合、そのクラスの中でコンテキストが保持する現在の状態オブジェクトを次の状態のインスタンスに差し替える
3. コンテキストクラス(自動販売機本体)は、現在の状態オブジェクトへの参照を1つだけ保持し、外部からの操作呼び出しをすべて現在の状態オブジェクトに委譲する
4. 呼び出し側はコンテキストのメソッドを呼ぶだけでよく、内部で「今どの状態か」を判定するif分岐を書く必要が一切ない——その判定と分岐先の実装が、状態オブジェクトの差し替えという形にすでに織り込まれている

## 特性・トレードオフ

- **巨大な条件分岐の解消**: 「現在の状態 × 発生しうるイベント」の組み合わせをすべて1つのメソッド内のif/switch文で管理すると、状態が増えるたびに分岐が指数的に複雑化する。Stateパターンはこれを状態ごとのクラスに分割することで、各クラスが自分の状態の振る舞いだけに集中できるようにする
- **新しい状態の追加が容易**: 新しい状態を追加する場合、既存の状態クラスにほとんど手を入れず、新しい状態クラスを1つ追加するだけで済むことが多い(オープン・クローズド原則)
- **状態オブジェクト間の遷移ロジックの分散**: 「次にどの状態に遷移するか」の判断が各状態クラスに分散するため、全体の状態遷移図を一望したい場合は各クラスを横断して読む必要があり、把握しづらくなることがある(ドキュメントや状態遷移図での補完が重要)
- **Strategyパターンとの構造的な類似**: 実装の構造(コンテキストが差し替え可能なオブジェクトを保持し、処理を委譲する)はStrategyとほぼ同じだが、Stateは「状態オブジェクト自身が次の状態への遷移を引き起こす」点が異なる(Strategyは外部から戦略を選んで注入するだけで、戦略同士が互いを知らない)
- **使いどころ**: 自動販売機・注文処理・ワークフローエンジンなどの有限状態機械としてモデル化できる業務ロジック、ゲームのキャラクターAIステート(待機・追跡・攻撃)、TCP/HTTP等のプロトコル状態管理、UIコンポーネントの表示モード切り替えなど

## 実装例

「コイン投入待ち」「排出中」の2状態を持つ簡易自動販売機で検証する:コイン投入前の排出要求は拒否され、投入後は排出でき、二重投入は拒否される、という一連の遷移が状態オブジェクトの差し替えだけで表現されることを確認する。

```python
from __future__ import annotations
from abc import ABC, abstractmethod


class State(ABC):
    @abstractmethod
    def insert_coin(self, machine: "VendingMachine") -> str: ...

    @abstractmethod
    def dispense(self, machine: "VendingMachine") -> str: ...


class WaitingForCoinState(State):
    def insert_coin(self, machine: "VendingMachine") -> str:
        machine.state = DispensingState()
        return "コインを受け付けました"

    def dispense(self, machine: "VendingMachine") -> str:
        return "先にコインを入れてください"


class DispensingState(State):
    def insert_coin(self, machine: "VendingMachine") -> str:
        return "既にコインが投入済みです"

    def dispense(self, machine: "VendingMachine") -> str:
        machine.state = WaitingForCoinState()
        return "商品を排出しました"


class VendingMachine:
    def __init__(self) -> None:
        self.state: State = WaitingForCoinState()

    def insert_coin(self) -> str:
        return self.state.insert_coin(self)

    def dispense(self) -> str:
        return self.state.dispense(self)


def demo() -> list[str]:
    machine = VendingMachine()
    return [
        machine.dispense(),      # コインがまだなので拒否される
        machine.insert_coin(),   # 受け付け→Dispensingへ遷移
        machine.insert_coin(),   # 二重投入は拒否される
        machine.dispense(),      # 排出→WaitingForCoinへ遷移
    ]
```

```typescript
interface State {
  insertCoin(machine: VendingMachine): string;
  dispense(machine: VendingMachine): string;
}

class WaitingForCoinState implements State {
  insertCoin(machine: VendingMachine): string {
    machine.state = new DispensingState();
    return "コインを受け付けました";
  }
  dispense(_machine: VendingMachine): string {
    return "先にコインを入れてください";
  }
}

class DispensingState implements State {
  insertCoin(_machine: VendingMachine): string {
    return "既にコインが投入済みです";
  }
  dispense(machine: VendingMachine): string {
    machine.state = new WaitingForCoinState();
    return "商品を排出しました";
  }
}

class VendingMachine {
  state: State = new WaitingForCoinState();

  insertCoin(): string {
    return this.state.insertCoin(this);
  }
  dispense(): string {
    return this.state.dispense(this);
  }
}

function demo(): string[] {
  const machine = new VendingMachine();
  return [
    machine.dispense(),
    machine.insertCoin(),
    machine.insertCoin(),
    machine.dispense(),
  ];
}
```

```cpp
#include <memory>
#include <string>
#include <vector>

class VendingMachine;

class VendingState {
public:
    virtual ~VendingState() = default;
    virtual std::string insertCoin(VendingMachine& machine) = 0;
    virtual std::string dispense(VendingMachine& machine) = 0;
};

class DispensingState : public VendingState {
public:
    std::string insertCoin(VendingMachine& machine) override {
        return "既にコインが投入済みです";
    }
    std::string dispense(VendingMachine& machine) override;
};

class WaitingForCoinState : public VendingState {
public:
    std::string insertCoin(VendingMachine& machine) override;
    std::string dispense(VendingMachine& machine) override {
        return "先にコインを入れてください";
    }
};

class VendingMachine {
public:
    VendingMachine() : state(std::make_unique<WaitingForCoinState>()) {}
    std::string insertCoin() { return state->insertCoin(*this); }
    std::string dispense() { return state->dispense(*this); }
    std::unique_ptr<VendingState> state;
};

std::string WaitingForCoinState::insertCoin(VendingMachine& machine) {
    machine.state = std::make_unique<DispensingState>();
    return "コインを受け付けました";
}

std::string DispensingState::dispense(VendingMachine& machine) {
    machine.state = std::make_unique<WaitingForCoinState>();
    return "商品を排出しました";
}

std::vector<std::string> demo() {
    VendingMachine machine;
    return {
        machine.dispense(),
        machine.insertCoin(),
        machine.insertCoin(),
        machine.dispense()
    };
}
```

```rust
trait VendingState {
    fn insert_coin(&self) -> (String, Option<Box<dyn VendingState>>);
    fn dispense(&self) -> (String, Option<Box<dyn VendingState>>);
}

struct WaitingForCoinState;
struct DispensingState;

impl VendingState for WaitingForCoinState {
    fn insert_coin(&self) -> (String, Option<Box<dyn VendingState>>) {
        ("コインを受け付けました".to_string(), Some(Box::new(DispensingState)))
    }
    fn dispense(&self) -> (String, Option<Box<dyn VendingState>>) {
        ("先にコインを入れてください".to_string(), None)
    }
}

impl VendingState for DispensingState {
    fn insert_coin(&self) -> (String, Option<Box<dyn VendingState>>) {
        ("既にコインが投入済みです".to_string(), None)
    }
    fn dispense(&self) -> (String, Option<Box<dyn VendingState>>) {
        ("商品を排出しました".to_string(), Some(Box::new(WaitingForCoinState)))
    }
}

struct VendingMachine {
    state: Box<dyn VendingState>,
}

impl VendingMachine {
    fn new() -> Self {
        VendingMachine { state: Box::new(WaitingForCoinState) }
    }

    fn insert_coin(&mut self) -> String {
        let (message, next) = self.state.insert_coin();
        if let Some(next_state) = next {
            self.state = next_state;
        }
        message
    }

    fn dispense(&mut self) -> String {
        let (message, next) = self.state.dispense();
        if let Some(next_state) = next {
            self.state = next_state;
        }
        message
    }
}

fn demo() -> Vec<String> {
    let mut machine = VendingMachine::new();
    vec![
        machine.dispense(),
        machine.insert_coin(),
        machine.insert_coin(),
        machine.dispense(),
    ]
}
```

```csharp
interface IState
{
    string InsertCoin(VendingMachine machine);
    string Dispense(VendingMachine machine);
}

class WaitingForCoinState : IState
{
    public string InsertCoin(VendingMachine machine)
    {
        machine.State = new DispensingState();
        return "コインを受け付けました";
    }
    public string Dispense(VendingMachine machine) => "先にコインを入れてください";
}

class DispensingState : IState
{
    public string InsertCoin(VendingMachine machine) => "既にコインが投入済みです";
    public string Dispense(VendingMachine machine)
    {
        machine.State = new WaitingForCoinState();
        return "商品を排出しました";
    }
}

class VendingMachine
{
    public IState State { get; set; } = new WaitingForCoinState();
    public string InsertCoin() => State.InsertCoin(this);
    public string Dispense() => State.Dispense(this);
}

static class VendingMachineDemo
{
    public static List<string> Demo()
    {
        var machine = new VendingMachine();
        return new List<string>
        {
            machine.Dispense(),
            machine.InsertCoin(),
            machine.InsertCoin(),
            machine.Dispense(),
        };
    }
}
```
