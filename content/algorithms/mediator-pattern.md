---
name: Mediator(メディエーター)
category: デザインパターン
subcategory: 振る舞い
complexity: 振る舞いに関するパターン
summary: オブジェクト同士を直接やりとりさせず、仲介役に集約することで結合度を下げる。
---
## 概要

複数のオブジェクトが互いに直接参照し合って通信する代わりに、**すべてのやり取りを1つの仲介者(メディエーター)オブジェクトに集約する**ことで、オブジェクト間の結合を減らすふるまいパターン。航空管制塔が個々の飛行機同士を直接無線でやり取りさせず、すべての通信を管制塔経由にすることで衝突を防いでいるのと同じ発想。GUIのダイアログ内で「チェックボックスの状態が変わったらテキストボックスを有効/無効にする」といった複数コンポーネント間の連携ロジックを、各コンポーネントに直接書き込まず、ダイアログ自体(メディエーター)に集約する。

## 仕組み

1. やり取りを行う複数のオブジェクト(コロリーグ)が、互いを直接参照する代わりに、共通のメディエーターインターフェースへの参照だけを持つ
2. コロリーグは自分の状態が変化した際、直接他のコロリーグを呼び出すのではなく、メディエーターに通知する(`mediator.notify(this, event)`)
3. メディエーターは、通知の内容に応じて「どのコロリーグに何をさせるか」というオーケストレーションロジックをすべて自分の中に持ち、必要な他のコロリーグのメソッドを呼び出す
4. コロリーグ同士は互いの存在を全く知らなくてよくなり、依存関係が「各コロリーグ⇔メディエーター」の星型に集約される(コロリーグ同士のN対N結合が、メディエーターとのN対1結合に変わる)

## 特性・トレードオフ

- **オブジェクト間の結合を劇的に減らす**: 通信経路がメディエーター1箇所に集約されるため、個々のコロリーグは他のコロリーグの実装を一切知らなくてよくなり、単体テストや再利用がしやすくなる
- **メディエーターへの複雑さの集中**: N対Nの結合が消える代わりに、その複雑さはメディエーター1つのクラスに集中する。連携ロジックが多くなるとメディエーター自体が神クラス化し、今度はメディエーターの保守が困難になるリスクがある
- **Observerパターンとの組み合わせ**: メディエーターへの通知にObserverパターン(イベント購読)を使う実装も多く、両者は組み合わさって使われることが多い
- **使いどころ**: GUIダイアログ内のウィジェット間連携、チャットルーム(参加者同士が直接通信せず、ルームサーバーを介してメッセージを配送する)、航空管制システムのような複数エージェント間の調整、マイクロサービス間のオーケストレーション層など

## 実装例

チャットルームを題材に、参加者(コロリーグ)同士が互いを知らずにメディエーター経由でメッセージをやり取りする最小構成。

```python
class ChatRoomMediator:
    def __init__(self):
        self.users: dict[str, "User"] = {}

    def register(self, user: "User") -> None:
        self.users[user.name] = user
        user.mediator = self

    def notify(self, sender: str, message: str) -> list[str]:
        """送信者以外の全ユーザーにメッセージを配送し、受信者名の一覧を返す"""
        delivered = []
        for name, user in self.users.items():
            if name != sender:
                user.receive(sender, message)
                delivered.append(name)
        return delivered


class User:
    def __init__(self, name: str):
        self.name = name
        self.mediator: ChatRoomMediator | None = None
        self.inbox: list[tuple[str, str]] = []

    def send(self, message: str) -> list[str]:
        return self.mediator.notify(self.name, message)

    def receive(self, sender: str, message: str) -> None:
        self.inbox.append((sender, message))


def demo() -> dict[str, list[tuple[str, str]]]:
    mediator = ChatRoomMediator()
    alice, bob, carol = User("Alice"), User("Bob"), User("Carol")
    for u in (alice, bob, carol):
        mediator.register(u)
    alice.send("Hello everyone")
    bob.send("Hi Alice")
    return {u.name: u.inbox for u in (alice, bob, carol)}
```

```typescript
class ChatRoomMediator {
  users = new Map<string, User>();

  register(user: User): void {
    this.users.set(user.name, user);
    user.mediator = this;
  }

  notify(sender: string, message: string): string[] {
    const delivered: string[] = [];
    for (const [name, user] of this.users) {
      if (name !== sender) {
        user.receive(sender, message);
        delivered.push(name);
      }
    }
    return delivered;
  }
}

class User {
  name: string;
  mediator: ChatRoomMediator | null = null;
  inbox: [string, string][] = [];
  constructor(name: string) {
    this.name = name;
  }
  send(message: string): string[] {
    return this.mediator!.notify(this.name, message);
  }
  receive(sender: string, message: string): void {
    this.inbox.push([sender, message]);
  }
}

function demo(): Record<string, [string, string][]> {
  const mediator = new ChatRoomMediator();
  const alice = new User("Alice"),
    bob = new User("Bob"),
    carol = new User("Carol");
  for (const u of [alice, bob, carol]) mediator.register(u);
  alice.send("Hello everyone");
  bob.send("Hi Alice");
  return { Alice: alice.inbox, Bob: bob.inbox, Carol: carol.inbox };
}
```

```cpp
#include <string>
#include <vector>
#include <map>
#include <utility>

class User;

class ChatRoomMediator {
public:
    std::map<std::string, User*> users;
    void registerUser(User* user);
    std::vector<std::string> notify(const std::string& sender, const std::string& message);
};

class User {
public:
    std::string name;
    ChatRoomMediator* mediator = nullptr;
    std::vector<std::pair<std::string, std::string>> inbox;

    explicit User(std::string name) : name(std::move(name)) {}

    std::vector<std::string> send(const std::string& message) {
        return mediator->notify(name, message);
    }
    void receive(const std::string& sender, const std::string& message) {
        inbox.push_back({sender, message});
    }
};

void ChatRoomMediator::registerUser(User* user) {
    users[user->name] = user;
    user->mediator = this;
}

std::vector<std::string> ChatRoomMediator::notify(const std::string& sender, const std::string& message) {
    std::vector<std::string> delivered;
    for (auto& [name, user] : users) {
        if (name != sender) {
            user->receive(sender, message);
            delivered.push_back(name);
        }
    }
    return delivered;
}
```

```rust
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

struct UserData {
    name: String,
    inbox: Vec<(String, String)>,
}

struct ChatRoomMediator {
    users: HashMap<String, Rc<RefCell<UserData>>>,
}

impl ChatRoomMediator {
    fn new() -> Self {
        ChatRoomMediator { users: HashMap::new() }
    }

    fn register(&mut self, user: Rc<RefCell<UserData>>) {
        let name = user.borrow().name.clone();
        self.users.insert(name, user);
    }

    fn notify(&self, sender: &str, message: &str) -> Vec<String> {
        let mut delivered = Vec::new();
        for (name, user) in &self.users {
            if name != sender {
                user.borrow_mut().inbox.push((sender.to_string(), message.to_string()));
                delivered.push(name.clone());
            }
        }
        delivered
    }
}
```

```csharp
class ChatRoomMediator
{
    public Dictionary<string, ChatUser> Users = new();

    public void Register(ChatUser user)
    {
        Users[user.Name] = user;
        user.Mediator = this;
    }

    public List<string> Notify(string sender, string message)
    {
        var delivered = new List<string>();
        foreach (var (name, user) in Users)
        {
            if (name != sender)
            {
                user.Receive(sender, message);
                delivered.Add(name);
            }
        }
        return delivered;
    }
}

class ChatUser
{
    public string Name;
    public ChatRoomMediator? Mediator;
    public List<(string, string)> Inbox = new();
    public ChatUser(string name) { Name = name; }
    public List<string> Send(string message) => Mediator!.Notify(Name, message);
    public void Receive(string sender, string message) => Inbox.Add((sender, message));
}

static Dictionary<string, List<(string, string)>> Demo()
{
    var mediator = new ChatRoomMediator();
    var alice = new ChatUser("Alice");
    var bob = new ChatUser("Bob");
    var carol = new ChatUser("Carol");
    foreach (var u in new[] { alice, bob, carol }) mediator.Register(u);
    alice.Send("Hello everyone");
    bob.Send("Hi Alice");
    return new Dictionary<string, List<(string, string)>>
    {
        ["Alice"] = alice.Inbox,
        ["Bob"] = bob.Inbox,
        ["Carol"] = carol.Inbox,
    };
}
```
