---
name: Facade(ファサード)
category: デザインパターン
subcategory: 構造
complexity: 構造に関するパターン
summary: 複雑なサブシステム群に対して単純な窓口を1つ提供し、利用側の依存を減らす。
---
## 概要

多数のクラスが複雑に連携し合うサブシステムに対して、**単純化された窓口(ファサード)を1つ提供する**構造パターン。動画のエンコード処理が「コーデック選択」「音声抽出」「ビットレート計算」「圧縮」など何十ものクラスの連携で成り立っていたとしても、利用側は`VideoConverter.convert(file, format)`のような単純な1メソッド呼び出しだけで済ませたい——という発想。サブシステムの内部構造そのものを変えるわけではなく、その手前に「使いやすい表玄関」を追加する点が特徴。

## 仕組み

1. 複雑なサブシステムを構成する既存のクラス群はそのままにしておく(サブシステムの内部設計自体には手を入れない)
2. ファサードクラスを新たに用意し、サブシステムの各クラスへの参照を内部に持たせる
3. ファサードは、サブシステムの複数クラスにまたがる一連の操作手順(初期化→設定→処理→後片付け、など)を1つのメソッドとしてまとめ、内部で正しい順序・正しい引数でサブシステムの各クラスを呼び出す
4. 利用側はファサードの単純なメソッドを呼ぶだけでよく、サブシステム内部のクラス名や呼び出し順序を知る必要がなくなる
5. サブシステムへの直接アクセスが必要な高度なユースケースのために、ファサードを経由しないルートも残しておくのが一般的(ファサードは「唯一の入口」を強制するものではない)

## 特性・トレードオフ

- **利用側の学習コストと結合度を下げる**: サブシステムの内部クラス構成を隠蔽することで、利用側コードがサブシステムの実装詳細に依存しなくなり、サブシステム側の内部リファクタリングの影響を受けにくくなる
- **サブシステム自体は簡略化されない**: ファサードはあくまで「窓口」であり、サブシステムの複雑さそのものをなくすわけではない。複雑さは隠蔽されるだけで消えていない、という点を見誤ってはいけない
- **神クラス化のリスク**: ファサードにあらゆる操作を詰め込みすぎると、それ自体が肥大化した「神クラス」になり、単一責任原則に反する巨大な依存の塊になってしまう
- **使いどころ**: 複雑なライブラリ・フレームワークをラップして簡易APIを提供する場合、レガシーシステム群への統一的なアクセス窓口を作る場合、マイクロサービス群への統一APIゲートウェイなど

## 実装例

動画変換のサブシステム(コーデック選択・音声抽出・ビットレート計算・圧縮)を、`convert()`という単一メソッドの窓口にまとめる例。

```python
class CodecFinder:
    def find(self, fmt: str) -> str:
        return f"codec-for-{fmt}"


class AudioExtractor:
    def extract(self, file: str) -> str:
        return f"audio-from-{file}"


class BitrateCalculator:
    def calculate(self, file: str) -> int:
        return 128


class Compressor:
    def compress(self, file: str, codec: str, audio: str, bitrate: int) -> str:
        return f"{file}.compressed[{codec},{audio},{bitrate}kbps]"


class VideoConverterFacade:
    def __init__(self) -> None:
        self._codec_finder = CodecFinder()
        self._audio_extractor = AudioExtractor()
        self._bitrate_calculator = BitrateCalculator()
        self._compressor = Compressor()

    def convert(self, file: str, fmt: str) -> str:
        codec = self._codec_finder.find(fmt)
        audio = self._audio_extractor.extract(file)
        bitrate = self._bitrate_calculator.calculate(file)
        return self._compressor.compress(file, codec, audio, bitrate)


def demo() -> str:
    facade = VideoConverterFacade()
    return facade.convert("movie.mov", "mp4")
```

```typescript
class CodecFinder {
  find(format: string): string {
    return `codec-for-${format}`;
  }
}
class AudioExtractor {
  extract(file: string): string {
    return `audio-from-${file}`;
  }
}
class BitrateCalculator {
  calculate(file: string): number {
    return 128;
  }
}
class Compressor {
  compress(file: string, codec: string, audio: string, bitrate: number): string {
    return `${file}.compressed[${codec},${audio},${bitrate}kbps]`;
  }
}

class VideoConverterFacade {
  private codecFinder = new CodecFinder();
  private audioExtractor = new AudioExtractor();
  private bitrateCalculator = new BitrateCalculator();
  private compressor = new Compressor();

  convert(file: string, format: string): string {
    const codec = this.codecFinder.find(format);
    const audio = this.audioExtractor.extract(file);
    const bitrate = this.bitrateCalculator.calculate(file);
    return this.compressor.compress(file, codec, audio, bitrate);
  }
}

function demo(): string {
  const facade = new VideoConverterFacade();
  return facade.convert("movie.mov", "mp4");
}
```

```cpp
#include <string>

class CodecFinder {
public:
    std::string find(const std::string& format) { return "codec-for-" + format; }
};
class AudioExtractor {
public:
    std::string extract(const std::string& file) { return "audio-from-" + file; }
};
class BitrateCalculator {
public:
    int calculate(const std::string& file) { return 128; }
};
class Compressor {
public:
    std::string compress(const std::string& file, const std::string& codec,
                          const std::string& audio, int bitrate) {
        return file + ".compressed[" + codec + "," + audio + "," + std::to_string(bitrate) + "kbps]";
    }
};

class VideoConverterFacade {
    CodecFinder codecFinder;
    AudioExtractor audioExtractor;
    BitrateCalculator bitrateCalculator;
    Compressor compressor;

public:
    std::string convert(const std::string& file, const std::string& format) {
        std::string codec = codecFinder.find(format);
        std::string audio = audioExtractor.extract(file);
        int bitrate = bitrateCalculator.calculate(file);
        return compressor.compress(file, codec, audio, bitrate);
    }
};

std::string demo() {
    VideoConverterFacade facade;
    return facade.convert("movie.mov", "mp4");
}
```

```rust
struct CodecFinder;
impl CodecFinder {
    fn find(&self, format: &str) -> String {
        format!("codec-for-{format}")
    }
}
struct AudioExtractor;
impl AudioExtractor {
    fn extract(&self, file: &str) -> String {
        format!("audio-from-{file}")
    }
}
struct BitrateCalculator;
impl BitrateCalculator {
    fn calculate(&self, _file: &str) -> u32 {
        128
    }
}
struct Compressor;
impl Compressor {
    fn compress(&self, file: &str, codec: &str, audio: &str, bitrate: u32) -> String {
        format!("{file}.compressed[{codec},{audio},{bitrate}kbps]")
    }
}

struct VideoConverterFacade {
    codec_finder: CodecFinder,
    audio_extractor: AudioExtractor,
    bitrate_calculator: BitrateCalculator,
    compressor: Compressor,
}

impl VideoConverterFacade {
    fn new() -> Self {
        Self {
            codec_finder: CodecFinder,
            audio_extractor: AudioExtractor,
            bitrate_calculator: BitrateCalculator,
            compressor: Compressor,
        }
    }

    fn convert(&self, file: &str, format: &str) -> String {
        let codec = self.codec_finder.find(format);
        let audio = self.audio_extractor.extract(file);
        let bitrate = self.bitrate_calculator.calculate(file);
        self.compressor.compress(file, &codec, &audio, bitrate)
    }
}

fn demo() -> String {
    let facade = VideoConverterFacade::new();
    facade.convert("movie.mov", "mp4")
}
```

```csharp
class CodecFinder { public string Find(string format) => $"codec-for-{format}"; }
class AudioExtractor { public string Extract(string file) => $"audio-from-{file}"; }
class BitrateCalculator { public int Calculate(string file) => 128; }
class Compressor
{
    public string Compress(string file, string codec, string audio, int bitrate) =>
        $"{file}.compressed[{codec},{audio},{bitrate}kbps]";
}

class VideoConverterFacade
{
    private readonly CodecFinder codecFinder = new();
    private readonly AudioExtractor audioExtractor = new();
    private readonly BitrateCalculator bitrateCalculator = new();
    private readonly Compressor compressor = new();

    public string Convert(string file, string format)
    {
        var codec = codecFinder.Find(format);
        var audio = audioExtractor.Extract(file);
        var bitrate = bitrateCalculator.Calculate(file);
        return compressor.Compress(file, codec, audio, bitrate);
    }
}

static class FacadeDemo
{
    public static string Demo()
    {
        var facade = new VideoConverterFacade();
        return facade.Convert("movie.mov", "mp4");
    }
}
```
