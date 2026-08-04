---
name: Proxy(プロキシ)
category: デザインパターン
subcategory: 構造
complexity: 構造に関するパターン
summary: 本体への参照を代理オブジェクトが仲介し、遅延生成・アクセス制御・キャッシュなどを透過的に挟み込む。
---
## 概要

本体(実オブジェクト)と同じインターフェースを持つ「代理」オブジェクトを間に挟むことで、**本体へのアクセスに対して透過的に追加の処理を挟み込む**構造パターン。呼び出し側は代理と本体を区別せず同じインターフェースとして扱えるため、「本体を直接呼んでいるつもり」のコードの裏側で、遅延初期化・アクセス権限チェック・キャッシュ・リモート通信の隠蔽といった処理を、呼び出し側に気づかれることなく差し込める。

## 仕組み

1. 本体クラスとプロキシクラスの両方が実装する共通インターフェースを定義する
2. プロキシクラスは内部に本体への参照(またはそれを生成する手段)を保持する
3. 呼び出し側からのメソッド呼び出しをプロキシが受け取り、必要な前処理・後処理を行った上で、実際の処理は内部の本体オブジェクトに委譲する
4. 目的に応じていくつかの型がある:
   - **仮想プロキシ**: 生成コストの高い本体の生成を実際に必要になるまで遅延させる
   - **保護プロキシ**: 呼び出し元の権限をチェックし、アクセス可否を制御する
   - **リモートプロキシ**: ネットワーク越しの本体へのアクセスを、あたかもローカルオブジェクトであるかのように隠蔽する(RPCクライアントスタブなど)
   - **キャッシュプロキシ**: 過去の呼び出し結果をキャッシュし、同じ要求には本体を呼ばずに即座に返す

## 特性・トレードオフ

- **呼び出し側に透過的**: 本体とプロキシが同じインターフェースを持つため、呼び出し側のコードを一切変更せずに、遅延生成やアクセス制御といった横断的関心事を追加できる
- **Decoratorとの違い**: 見た目の構造(同じインターフェースを持つオブジェクトで包む)はDecoratorと似ているが、Decoratorが「機能の追加」を目的とするのに対し、Proxyは「本体へのアクセス制御・仲介」自体を目的とする点が異なる
- **間接層によるオーバーヘッド**: プロキシを挟むことで呼び出し経路が1段階増え、わずかながら処理コストが加わる。特にリモートプロキシでは失敗しうる通信が透過的に見えてしまうため、エラーハンドリングの設計が重要になる
- **使いどころ**: ORM(Object-Relational Mapping)における遅延読み込み(関連レコードを実際にアクセスするまでDBから取得しない)、リモートAPIクライアントのスタブ生成、アクセス制御が必要なリソースへのラッパー、頻繁に呼ばれる重い処理へのキャッシュ層など

## 実装例

「生成コストの高い本体」を模した`RealImage`(生成時にカウンタをインクリメント)を、仮想プロキシ`ImageProxy`が遅延生成しつつ結果をキャッシュする。`render()`を3回呼んでも実体の生成は1回だけであることを検証する。

```python
from abc import ABC, abstractmethod


class Image(ABC):
    @abstractmethod
    def render(self) -> str: ...


class RealImage(Image):
    """生成コストの高い本体。生成のたびにload_countをインクリメントし、
    実際に何回「読み込み」が起きたかを外から観測できるようにしている。"""
    load_count = 0

    def __init__(self, filename: str) -> None:
        self.filename = filename
        RealImage.load_count += 1

    def render(self) -> str:
        return f"rendering {self.filename}"


class ImageProxy(Image):
    """仮想プロキシ: render()が最初に呼ばれるまでRealImageの生成を遅延し、
    以降の呼び出しはキャッシュした結果を返す。"""
    def __init__(self, filename: str) -> None:
        self.filename = filename
        self._real: RealImage | None = None
        self._cached_result: str | None = None

    def render(self) -> str:
        if self._real is None:
            self._real = RealImage(self.filename)
        if self._cached_result is None:
            self._cached_result = self._real.render()
        return self._cached_result


def demo() -> None:
    RealImage.load_count = 0
    proxy = ImageProxy("photo.png")

    assert RealImage.load_count == 0  # まだ本体は生成されていない
    r1, r2, r3 = proxy.render(), proxy.render(), proxy.render()
    assert RealImage.load_count == 1  # 3回呼んでも生成は1回だけ
    assert r1 == r2 == r3 == "rendering photo.png"
```

```typescript
interface Image {
  render(): string;
}

class RealImage implements Image {
  static loadCount = 0;
  filename: string;
  constructor(filename: string) {
    this.filename = filename;
    RealImage.loadCount++;
  }
  render(): string {
    return `rendering ${this.filename}`;
  }
}

class ImageProxy implements Image {
  filename: string;
  private real: RealImage | null = null;
  private cachedResult: string | null = null;

  constructor(filename: string) {
    this.filename = filename;
  }

  render(): string {
    if (this.real === null) this.real = new RealImage(this.filename);
    if (this.cachedResult === null) this.cachedResult = this.real.render();
    return this.cachedResult;
  }
}

function demo(): void {
  RealImage.loadCount = 0;
  const proxy = new ImageProxy("photo.png");

  console.assert(RealImage.loadCount === 0);
  const r1 = proxy.render(), r2 = proxy.render(), r3 = proxy.render();
  console.assert(RealImage.loadCount === 1);
  console.assert(r1 === r2 && r2 === r3 && r1 === "rendering photo.png");
}
```

```cpp
#include <string>
#include <memory>
#include <optional>

class Image {
public:
    virtual std::string render() const = 0;
    virtual ~Image() = default;
};

class RealImage : public Image {
public:
    static int loadCount;
    std::string filename;

    explicit RealImage(std::string filename) : filename(std::move(filename)) {
        loadCount++;
    }
    std::string render() const override {
        return "rendering " + filename;
    }
};
int RealImage::loadCount = 0;

class ImageProxy : public Image {
public:
    explicit ImageProxy(std::string filename) : filename(std::move(filename)) {}

    std::string render() const override {
        if (!real) real = std::make_unique<RealImage>(filename);
        if (!cachedResult) cachedResult = real->render();
        return *cachedResult;
    }
private:
    std::string filename;
    mutable std::unique_ptr<RealImage> real;
    mutable std::optional<std::string> cachedResult;
};

void demo() {
    RealImage::loadCount = 0;
    ImageProxy proxy("photo.png");

    // loadCount == 0 (まだ本体は生成されていない)
    std::string r1 = proxy.render();
    std::string r2 = proxy.render();
    std::string r3 = proxy.render();
    // RealImage::loadCount == 1 (3回呼んでも生成は1回だけ)
}
```

```rust
trait Image {
    fn render(&mut self) -> String;
}

struct RealImage {
    filename: String,
}

impl RealImage {
    fn new(filename: &str, load_count: &mut i32) -> Self {
        *load_count += 1;
        RealImage { filename: filename.to_string() }
    }
    fn render(&self) -> String {
        format!("rendering {}", self.filename)
    }
}

struct ImageProxy {
    filename: String,
    real: Option<RealImage>,
    cached_result: Option<String>,
    load_count: i32,
}

impl ImageProxy {
    fn new(filename: &str) -> Self {
        ImageProxy { filename: filename.to_string(), real: None, cached_result: None, load_count: 0 }
    }
}

impl Image for ImageProxy {
    fn render(&mut self) -> String {
        if self.real.is_none() {
            self.real = Some(RealImage::new(&self.filename, &mut self.load_count));
        }
        if self.cached_result.is_none() {
            self.cached_result = Some(self.real.as_ref().unwrap().render());
        }
        self.cached_result.clone().unwrap()
    }
}

fn demo() {
    let mut proxy = ImageProxy::new("photo.png");
    assert_eq!(proxy.load_count, 0);
    let r1 = proxy.render();
    let r2 = proxy.render();
    let r3 = proxy.render();
    assert_eq!(proxy.load_count, 1);
    assert!(r1 == r2 && r2 == r3 && r1 == "rendering photo.png");
}
```

```csharp
interface IImage { string Render(); }

class RealImage : IImage
{
    public static int LoadCount = 0;
    string filename;
    public RealImage(string filename) { this.filename = filename; RealImage.LoadCount++; }
    public string Render() => $"rendering {filename}";
}

class ImageProxy : IImage
{
    string filename; RealImage? real; string? cachedResult;
    public ImageProxy(string filename) { this.filename = filename; }

    public string Render()
    {
        real ??= new RealImage(filename);
        cachedResult ??= real.Render();
        return cachedResult;
    }

    public static void Demo()
    {
        RealImage.LoadCount = 0;
        var proxy = new ImageProxy("photo.png");

        // RealImage.LoadCount == 0 (まだ本体は生成されていない)
        var r1 = proxy.Render();
        var r2 = proxy.Render();
        var r3 = proxy.Render();
        // RealImage.LoadCount == 1 (3回呼んでも生成は1回だけ)
    }
}
```
