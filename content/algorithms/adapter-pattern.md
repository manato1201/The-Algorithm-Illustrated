---
name: Adapter(アダプター)
category: デザインパターン
subcategory: 構造
complexity: 構造に関するパターン
summary: 互換性のないインターフェース同士を仲介し、既存クラスを変更せずに新しい文脈で使えるようにする。
---
## 概要

呼び出し側が期待するインターフェースと、実際に使いたいクラスが提供するインターフェースが食い違っている時に、その**橋渡し役**として間に挟まるラッパークラスを用意する構造パターン。電源プラグの変換アダプタと同じ発想で、既存のクラス(サードパーティのライブラリやレガシーコードなど、変更できないもの)を直接書き換えることなく、新しい文脈のインターフェースに適合させる。

## 仕組み

1. 呼び出し側が期待するインターフェース(ターゲットインターフェース)を定義する
2. 適合させたい既存クラス(アダプティ)はそのままにしておく
3. アダプタークラスを作り、ターゲットインターフェースを実装させる
4. アダプターの内部にアダプティのインスタンスを保持し(委譲)、ターゲットインターフェースのメソッドが呼ばれたら、それをアダプティが持つ対応するメソッドの呼び出しに変換して転送する
5. 呼び出し側はアダプターをターゲットインターフェースとして扱うだけでよく、内部で実際にどのクラスの、どんなメソッドが呼ばれているかを意識する必要がない

継承を使って両方のインターフェースを1つのクラスにまとめる「クラスアダプタ」という実装方式もあるが、多重継承を持たない言語では上記の「委譲」による「オブジェクトアダプタ」が一般的。

## 特性・トレードオフ

- **既存コードを変更しない**: サードパーティライブラリやレガシーシステムなど、ソースを直接書き換えられない(あるいは書き換えるべきではない)クラスを、新しいシステムに無理なく統合できる
- **単一責任原則との相性**: インターフェース変換というインターフェース変換の責務をアダプタークラスに閉じ込めることで、既存クラスにも呼び出し側にも変換ロジックが漏れ出さない
- **間接層が増えるコスト**: アダプターを挟むことで呼び出し経路が1段階増え、デバッグ時に「実際に何が呼ばれているか」を追う手間がわずかに増える。変換ロジックが複雑になりすぎる場合は、そもそもの設計の見直しサインでもある
- **使いどころ**: 外部ライブラリのAPIを自社の抽象インターフェースに合わせたい場合、レガシーAPIを新しいクライアントコードから利用したい場合、テストでレガシー依存を差し替え可能にしたい場合など

## 実装例

```python
from typing import Protocol


class MediaPlayer(Protocol):
    def play(self, filename: str) -> str: ...


class LegacyMp4Player:
    def play_mp4(self, filename: str) -> str:
        return f"mp4再生: {filename}"


class LegacyVlcPlayer:
    def play_vlc(self, filename: str) -> str:
        return f"vlc再生: {filename}"


class Mp4Adapter:
    def __init__(self, adaptee: LegacyMp4Player):
        self._adaptee = adaptee

    def play(self, filename: str) -> str:
        return self._adaptee.play_mp4(filename)


class VlcAdapter:
    def __init__(self, adaptee: LegacyVlcPlayer):
        self._adaptee = adaptee

    def play(self, filename: str) -> str:
        return self._adaptee.play_vlc(filename)


def play_all(players: list[MediaPlayer], filename: str) -> list[str]:
    return [p.play(filename) for p in players]
```

```typescript
interface MediaPlayer {
  play(filename: string): string;
}

class LegacyMp4Player {
  playMp4(filename: string): string {
    return `mp4再生: ${filename}`;
  }
}
class LegacyVlcPlayer {
  playVlc(filename: string): string {
    return `vlc再生: ${filename}`;
  }
}

class Mp4Adapter implements MediaPlayer {
  private adaptee: LegacyMp4Player;
  constructor(adaptee: LegacyMp4Player) {
    this.adaptee = adaptee;
  }
  play(filename: string): string {
    return this.adaptee.playMp4(filename);
  }
}
class VlcAdapter implements MediaPlayer {
  private adaptee: LegacyVlcPlayer;
  constructor(adaptee: LegacyVlcPlayer) {
    this.adaptee = adaptee;
  }
  play(filename: string): string {
    return this.adaptee.playVlc(filename);
  }
}

function playAll(players: MediaPlayer[], filename: string): string[] {
  return players.map((p) => p.play(filename));
}
```

```cpp
#include <memory>
#include <string>
#include <vector>

class MediaPlayer {
public:
    virtual ~MediaPlayer() = default;
    virtual std::string play(const std::string& filename) const = 0;
};

class LegacyMp4Player {
public:
    std::string playMp4(const std::string& filename) const { return "mp4再生: " + filename; }
};
class LegacyVlcPlayer {
public:
    std::string playVlc(const std::string& filename) const { return "vlc再生: " + filename; }
};

class Mp4Adapter : public MediaPlayer {
public:
    explicit Mp4Adapter(std::shared_ptr<LegacyMp4Player> adaptee) : adaptee_(std::move(adaptee)) {}
    std::string play(const std::string& filename) const override { return adaptee_->playMp4(filename); }

private:
    std::shared_ptr<LegacyMp4Player> adaptee_;
};
class VlcAdapter : public MediaPlayer {
public:
    explicit VlcAdapter(std::shared_ptr<LegacyVlcPlayer> adaptee) : adaptee_(std::move(adaptee)) {}
    std::string play(const std::string& filename) const override { return adaptee_->playVlc(filename); }

private:
    std::shared_ptr<LegacyVlcPlayer> adaptee_;
};

std::vector<std::string> playAll(const std::vector<std::shared_ptr<MediaPlayer>>& players, const std::string& filename) {
    std::vector<std::string> results;
    for (const auto& p : players) {
        results.push_back(p->play(filename));
    }
    return results;
}
```

```rust
trait MediaPlayer {
    fn play(&self, filename: &str) -> String;
}

struct LegacyMp4Player;
impl LegacyMp4Player {
    fn play_mp4(&self, filename: &str) -> String {
        format!("mp4再生: {filename}")
    }
}
struct LegacyVlcPlayer;
impl LegacyVlcPlayer {
    fn play_vlc(&self, filename: &str) -> String {
        format!("vlc再生: {filename}")
    }
}

struct Mp4Adapter {
    adaptee: LegacyMp4Player,
}
impl MediaPlayer for Mp4Adapter {
    fn play(&self, filename: &str) -> String {
        self.adaptee.play_mp4(filename)
    }
}
struct VlcAdapter {
    adaptee: LegacyVlcPlayer,
}
impl MediaPlayer for VlcAdapter {
    fn play(&self, filename: &str) -> String {
        self.adaptee.play_vlc(filename)
    }
}

fn play_all(players: &[Box<dyn MediaPlayer>], filename: &str) -> Vec<String> {
    players.iter().map(|p| p.play(filename)).collect()
}
```

```csharp
interface IMediaPlayer
{
    string Play(string filename);
}

class LegacyMp4Player
{
    public string PlayMp4(string filename) => $"mp4再生: {filename}";
}
class LegacyVlcPlayer
{
    public string PlayVlc(string filename) => $"vlc再生: {filename}";
}

class Mp4Adapter : IMediaPlayer
{
    private readonly LegacyMp4Player _adaptee;
    public Mp4Adapter(LegacyMp4Player adaptee) { _adaptee = adaptee; }
    public string Play(string filename) => _adaptee.PlayMp4(filename);
}
class VlcAdapter : IMediaPlayer
{
    private readonly LegacyVlcPlayer _adaptee;
    public VlcAdapter(LegacyVlcPlayer adaptee) { _adaptee = adaptee; }
    public string Play(string filename) => _adaptee.PlayVlc(filename);
}

static class AdapterDemo
{
    public static string[] PlayAll(List<IMediaPlayer> players, string filename) =>
        players.Select(p => p.Play(filename)).ToArray();
}
```
