---
name: Observer(オブザーバー)
category: デザインパターン
subcategory: 振る舞い
complexity: 振る舞いに関するパターン
summary: 状態変化を購読者全員に自動通知する。イベント駆動アーキテクチャの基礎。
---
## 概要

あるオブジェクト(サブジェクト)の状態が変化した際、**それを購読している他のオブジェクト(オブザーバー)全員に自動的に通知する**仕組みを提供するふるまいパターン。サブジェクトはオブザーバーの具体的な実装を知らなくても「変化した」という事実だけを一斉配信すればよく、オブザーバー側は自分がいつ通知を受け取りたいかを自分で登録・解除できる。GUIのイベントハンドリング、Pub/Subメッセージング、リアクティブプログラミングのストリームなど、イベント駆動アーキテクチャの根幹をなす最も基礎的なパターンの1つ。

## 仕組み

1. サブジェクトは、自分を購読しているオブザーバーの一覧を内部に保持し、オブザーバーの登録(`subscribe()`)・解除(`unsubscribe()`)メソッドを提供する
2. オブザーバーは共通のインターフェース(通常は`update()`のような通知受信メソッド1つ)を実装する
3. サブジェクトの状態が変化すると、サブジェクトは保持している購読者リストを走査し、各オブザーバーの`update()`を順番に呼び出す(通知)
4. サブジェクトはオブザーバーの具体的なクラスを知らず、共通インターフェース越しにしか呼び出さないため、通知先の種類や数を自由に増減させられる
5. 通知時に渡すデータの設計には「プッシュ型」(変化した内容そのものを引数として渡す)と「プル型」(変化したことだけを伝え、必要ならオブザーバー側がサブジェクトに問い合わせて詳細を取得する)の2つの流儀がある

## 特性・トレードオフ

- **疎結合な1対多の通知**: サブジェクトはオブザーバーの実装を一切知らなくてよく、新しい種類のオブザーバーを実行時に自由に追加・削除できる
- **通知順序・タイミングの制御が難しくなりやすい**: オブザーバーの数が増えると、通知がどの順で実行されるか、ある通知の処理中に別のオブザーバーが購読解除した場合どうなるか、といった実行時の挙動が複雑になりやすい
- **メモリリークのリスク**: オブザーバーの登録を忘れず解除しないと、不要になったオブザーバーがサブジェクトに参照され続け、ガベージコレクションされずメモリリークの原因になる(「弱い参照」を使った購読管理で緩和されることが多い)
- **連鎖的な通知の追跡困難性**: ある通知が別の状態変化を引き起こし、それがさらに別の通知を呼ぶ、といった連鎖が起きると、実行フローを追跡しづらくなることがある
- **使いどころ**: GUIのイベントリスナー、Pub/Subメッセージングシステム、リアクティブプログラミング(RxJS等)のストリーム購読、MVCアーキテクチャにおけるModelの変更をViewに伝える仕組み、状態管理ライブラリ(Redux等)のstore購読など

## 実装例

`Subject`が状態変化を購読者に通知する最小構成。購読解除したオブザーバーには以降の通知が届かないことを確認する。

```python
class Observer:
    def update(self, state: int) -> None:
        raise NotImplementedError


class ConcreteObserver(Observer):
    def __init__(self, name: str) -> None:
        self.name = name
        self.received: list[int] = []

    def update(self, state: int) -> None:
        self.received.append(state)


class Subject:
    def __init__(self) -> None:
        self._observers: list[Observer] = []
        self._state: int | None = None

    def subscribe(self, observer: Observer) -> None:
        self._observers.append(observer)

    def unsubscribe(self, observer: Observer) -> None:
        self._observers.remove(observer)

    def set_state(self, state: int) -> None:
        self._state = state
        self._notify()

    def _notify(self) -> None:
        for observer in self._observers:
            observer.update(self._state)


def observer_demo() -> tuple[list[int], list[int]]:
    subject = Subject()
    a, b = ConcreteObserver("A"), ConcreteObserver("B")
    subject.subscribe(a)
    subject.subscribe(b)
    subject.set_state(1)
    subject.unsubscribe(b)
    subject.set_state(2)
    return a.received, b.received  # ([1, 2], [1])
```

```typescript
interface Observer {
  update(state: number): void;
}

class ConcreteObserver implements Observer {
  name: string;
  received: number[] = [];

  constructor(name: string) {
    this.name = name;
  }

  update(state: number): void {
    this.received.push(state);
  }
}

class Subject {
  private observers: Observer[] = [];
  private state: number | null = null;

  subscribe(observer: Observer): void {
    this.observers.push(observer);
  }

  unsubscribe(observer: Observer): void {
    this.observers = this.observers.filter((o) => o !== observer);
  }

  setState(state: number): void {
    this.state = state;
    this.notify();
  }

  private notify(): void {
    for (const observer of this.observers) observer.update(this.state!);
  }
}

function observerDemo(): [number[], number[]] {
  const subject = new Subject();
  const [a, b] = [new ConcreteObserver("A"), new ConcreteObserver("B")];
  subject.subscribe(a);
  subject.subscribe(b);
  subject.setState(1);
  subject.unsubscribe(b);
  subject.setState(2);
  return [a.received, b.received]; // [[1, 2], [1]]
}
```

```cpp
#include <vector>
#include <string>
#include <algorithm>
#include <memory>

class Observer {
public:
    virtual ~Observer() = default;
    virtual void update(int state) = 0;
};

class ConcreteObserver : public Observer {
public:
    std::string name;
    std::vector<int> received;
    explicit ConcreteObserver(std::string n) : name(std::move(n)) {}
    void update(int state) override { received.push_back(state); }
};

class Subject {
public:
    void subscribe(Observer* observer) { observers.push_back(observer); }

    void unsubscribe(Observer* observer) {
        observers.erase(std::remove(observers.begin(), observers.end(), observer), observers.end());
    }

    void setState(int newState) {
        state = newState;
        notify();
    }

private:
    std::vector<Observer*> observers;
    int state = 0;

    void notify() {
        for (auto* observer : observers) observer->update(state);
    }
};

void observerDemo() {
    Subject subject;
    ConcreteObserver a("A"), b("B");
    subject.subscribe(&a);
    subject.subscribe(&b);
    subject.setState(1);
    subject.unsubscribe(&b);
    subject.setState(2);
    // a.received == {1, 2}, b.received == {1}
}
```

```rust
trait Observer {
    fn update(&mut self, state: i32);
}

struct ConcreteObserver {
    name: String,
    received: Vec<i32>,
}

impl ConcreteObserver {
    fn new(name: &str) -> Self {
        ConcreteObserver { name: name.to_string(), received: Vec::new() }
    }
}

impl Observer for ConcreteObserver {
    fn update(&mut self, state: i32) {
        self.received.push(state);
    }
}

struct Subject {
    observers: Vec<Box<dyn Observer>>,
    state: i32,
}

impl Subject {
    fn new() -> Self {
        Subject { observers: Vec::new(), state: 0 }
    }

    fn subscribe(&mut self, observer: Box<dyn Observer>) {
        self.observers.push(observer);
    }

    fn set_state(&mut self, state: i32) {
        self.state = state;
        for observer in self.observers.iter_mut() {
            observer.update(state);
        }
    }
}

// Rustでは所有権の都合上、購読解除はIDやインデックスで管理するのが実用的
struct IdentifiedSubject {
    observers: Vec<(u32, Box<dyn Observer>)>,
    state: i32,
    next_id: u32,
}

impl IdentifiedSubject {
    fn new() -> Self {
        IdentifiedSubject { observers: Vec::new(), state: 0, next_id: 0 }
    }

    fn subscribe(&mut self, observer: Box<dyn Observer>) -> u32 {
        let id = self.next_id;
        self.next_id += 1;
        self.observers.push((id, observer));
        id
    }

    fn unsubscribe(&mut self, id: u32) {
        self.observers.retain(|(oid, _)| *oid != id);
    }

    fn set_state(&mut self, state: i32) {
        self.state = state;
        for (_, observer) in self.observers.iter_mut() {
            observer.update(state);
        }
    }
}
```

```csharp
interface IObserver
{
    void Update(int state);
}

class ConcreteObserver : IObserver
{
    public string Name;
    public List<int> Received = new();

    public ConcreteObserver(string name) => Name = name;

    public void Update(int state) => Received.Add(state);
}

class Subject
{
    private List<IObserver> observers = new();
    private int state;

    public void Subscribe(IObserver observer) => observers.Add(observer);

    public void Unsubscribe(IObserver observer) => observers.Remove(observer);

    public void SetState(int newState)
    {
        state = newState;
        Notify();
    }

    private void Notify()
    {
        foreach (var observer in observers) observer.Update(state);
    }
}

static (List<int>, List<int>) ObserverDemo()
{
    var subject = new Subject();
    var (a, b) = (new ConcreteObserver("A"), new ConcreteObserver("B"));
    subject.Subscribe(a);
    subject.Subscribe(b);
    subject.SetState(1);
    subject.Unsubscribe(b);
    subject.SetState(2);
    return (a.Received, b.Received); // ([1, 2], [1])
}
```
