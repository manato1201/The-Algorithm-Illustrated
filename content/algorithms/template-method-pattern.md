---
name: Template Method(テンプレートメソッド)
category: デザインパターン
subcategory: 振る舞い
complexity: 振る舞いに関するパターン
summary: 処理の骨格を親クラスに固定し、可変部分だけをサブクラスに実装させる。
---
## 概要

処理全体の「手順の骨格」を親クラスに固定したまま、その中の**一部のステップだけをサブクラスに実装させる**ふるまいパターン。「データを読み込む→検証する→変換する→保存する」という一連の処理手順そのものは常に同じ順序で実行されるが、各ステップの中身(どんな検証をするか、どんな変換をするか)はサブクラスごとに異なる、といった場面で使われる。処理フローの一貫性を守りつつ、変化する部分だけをサブクラスに委ねられる。

## 仕組み

1. 抽象基底クラスに、処理全体の手順を定義する「テンプレートメソッド」を実装する。このメソッドは`final`(オーバーライド不可)にして、手順の順序自体をサブクラスが変更できないようにするのが一般的
2. テンプレートメソッドの内部では、共通のステップはその場で直接実装し、サブクラスごとに変わるステップは抽象メソッド(あるいはデフォルト実装を持つ「フック」メソッド)として宣言し、それらを順番に呼び出すだけにする
3. 各サブクラスは、この抽象メソッド(可変ステップ)だけをオーバーライドして実装する。処理全体の順序には一切関与しない
4. 呼び出し側はテンプレートメソッドを1つ呼ぶだけで、サブクラスの種類に応じて異なる具体的な処理が、常に同じ順序で実行される

「フックメソッド」(デフォルトで何もしない空実装を持ち、必要な場合だけサブクラスがオーバーライドする拡張ポイント)を挟むことで、必須ではない部分的なカスタマイズも可能になる。

## 特性・トレードオフ

- **処理フローの一貫性を強制できる**: 手順の順序をテンプレートメソッド側に固定することで、サブクラスの実装者が手順を誤って入れ替えたり省略したりすることを防げる
- **コードの重複を排除**: 共通するステップのロジックを親クラスに1箇所だけ実装すればよく、サブクラスごとに同じコードを繰り返し書く必要がない
- **継承への強い依存というコスト**: このパターンはクラス継承を前提とするため、単一継承しか持たない言語では「他の理由での継承」と衝突しやすい。継承の代わりにコンポジション(Strategyパターンのように処理をオブジェクトとして注入する)で同様のことを実現できないか検討する価値もある
- **リスコフの置換原則との緊張**: サブクラスがフックメソッド内で親クラスの想定しない副作用を起こすと、テンプレートメソッド全体の振る舞いが壊れる場合があり、サブクラス実装者に「守るべき契約」を明確に伝えるドキュメントが重要になる
- **使いどころ**: データ処理パイプライン(読み込み→検証→変換→出力)、テストフレームワークのセットアップ/実行/後片付けの骨格(`setUp()`/`test()`/`tearDown()`)、フレームワークが提供するライフサイクルフック(初期化→描画→破棄)など

## 実装例

「読み込み→検証→変換→保存」という骨格を基底クラスの`run()`(テンプレートメソッド)に固定し、「正の値だけを通し、2倍にする」という可変部分だけをサブクラスに実装させる例。`saveフック`はデフォルトで何もしない。

```python
from __future__ import annotations
from abc import ABC, abstractmethod


class DataPipeline(ABC):
    def run(self, data: list[int]) -> list[int]:
        loaded = self.load(data)
        validated = [x for x in loaded if self.validate(x)]
        transformed = [self.transform(x) for x in validated]
        self.save(transformed)
        return transformed

    def load(self, data: list[int]) -> list[int]:
        return list(data)

    @abstractmethod
    def validate(self, value: int) -> bool: ...

    @abstractmethod
    def transform(self, value: int) -> int: ...

    def save(self, data: list[int]) -> None:
        pass  # フックメソッド: デフォルトは何もしない


class PositiveDoublingPipeline(DataPipeline):
    def validate(self, value: int) -> bool:
        return value > 0

    def transform(self, value: int) -> int:
        return value * 2


def demo() -> list[int]:
    pipeline = PositiveDoublingPipeline()
    return pipeline.run([3, -1, 5, 0, 2])
```

```typescript
abstract class DataPipeline {
  run(data: number[]): number[] {
    const loaded = this.load(data);
    const validated = loaded.filter((x) => this.validate(x));
    const transformed = validated.map((x) => this.transform(x));
    this.save(transformed);
    return transformed;
  }

  protected load(data: number[]): number[] {
    return [...data];
  }

  protected abstract validate(value: number): boolean;
  protected abstract transform(value: number): number;

  protected save(_data: number[]): void {
    // フックメソッド: デフォルトは何もしない
  }
}

class PositiveDoublingPipeline extends DataPipeline {
  protected validate(value: number): boolean {
    return value > 0;
  }
  protected transform(value: number): number {
    return value * 2;
  }
}

function demo(): number[] {
  const pipeline = new PositiveDoublingPipeline();
  return pipeline.run([3, -1, 5, 0, 2]);
}
```

```cpp
#include <vector>

class DataPipeline {
public:
    virtual ~DataPipeline() = default;

    std::vector<int> run(const std::vector<int>& data) {
        auto loaded = load(data);
        std::vector<int> validated;
        for (int x : loaded) {
            if (validate(x)) validated.push_back(x);
        }
        std::vector<int> transformed;
        for (int x : validated) {
            transformed.push_back(transform(x));
        }
        save(transformed);
        return transformed;
    }

protected:
    virtual std::vector<int> load(const std::vector<int>& data) { return data; }
    virtual bool validate(int value) = 0;
    virtual int transform(int value) = 0;
    virtual void save(const std::vector<int>& data) {}  // フックメソッド
};

class PositiveDoublingPipeline : public DataPipeline {
protected:
    bool validate(int value) override { return value > 0; }
    int transform(int value) override { return value * 2; }
};
```

```rust
trait DataPipeline {
    fn run(&self, data: &[i32]) -> Vec<i32> {
        let loaded = self.load(data);
        let validated: Vec<i32> = loaded.into_iter().filter(|&x| self.validate(x)).collect();
        let transformed: Vec<i32> = validated.into_iter().map(|x| self.transform(x)).collect();
        self.save(&transformed);
        transformed
    }

    fn load(&self, data: &[i32]) -> Vec<i32> {
        data.to_vec()
    }

    fn validate(&self, value: i32) -> bool;
    fn transform(&self, value: i32) -> i32;

    fn save(&self, _data: &[i32]) {
        // フックメソッド: デフォルトは何もしない
    }
}

struct PositiveDoublingPipeline;

impl DataPipeline for PositiveDoublingPipeline {
    fn validate(&self, value: i32) -> bool {
        value > 0
    }
    fn transform(&self, value: i32) -> i32 {
        value * 2
    }
}
```

```csharp
abstract class DataPipeline
{
    public List<int> Run(List<int> data)
    {
        var loaded = Load(data);
        var validated = loaded.Where(Validate).ToList();
        var transformed = validated.Select(Transform).ToList();
        Save(transformed);
        return transformed;
    }

    protected virtual List<int> Load(List<int> data) => new List<int>(data);
    protected abstract bool Validate(int value);
    protected abstract int Transform(int value);
    protected virtual void Save(List<int> data) { }  // フックメソッド
}

class PositiveDoublingPipeline : DataPipeline
{
    protected override bool Validate(int value) => value > 0;
    protected override int Transform(int value) => value * 2;
}
```
