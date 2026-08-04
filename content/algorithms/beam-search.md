---
name: ビームサーチ(Beam Search)
category: 最適化・確率的手法
subcategory: 局所探索
complexity: O(bnd)(bはビーム幅、nは各段階での候補生成数、dは探索の深さ)
summary: 幅優先探索が「全ての候補」を保持し続けるのに対し、各段階でスコア上位k個(ビーム幅)の候補だけに絞り込んで探索を続けることで、メモリと計算量を抑えながら実用上十分に良い解を探す近似探索アルゴリズム。
---

## 概要

幅優先探索は各段階で見つかった全ての候補を次の段階へ引き継ぐため、候補数が段階を経るごとに指数的に爆発してしまう(機械翻訳や文章生成のように、各ステップで数万通りの単語候補があるような問題では現実的に扱えない)。一方[貪欲法](/algorithms/hill-climbing)のように各段階で最良の1候補だけを残すと、局所的には良く見えても後になって行き詰まる選択をしてしまいがちになる。ビームサーチはこの両極端の中間を取る——各段階でスコアの高い上位`k`個(この`k`をビーム幅と呼ぶ)の候補だけを保持し、それ以外は切り捨てて次の段階へ進む。幅優先探索の「全候補保持」を`k`個に制限しただけのシンプルな発想でありながら、機械翻訳・音声認識・[自然言語処理](/algorithms/n-gram-language-model)の文章生成など、現代のAIシステムのデコーディング処理で極めて広く使われている実用的な近似探索アルゴリズムである。

## 仕組み

1. 探索の初期状態(空の出力列など)を1つのビームとして開始する
2. 各段階で、現在保持している`k`個のビーム(部分解)それぞれに対して、可能な次の一手(次の単語、次の記号など)を全て列挙し、拡張後の候補を生成する
3. 生成された全候補(元のビーム数×各ビームからの拡張数)に対してスコア(累積確率の対数、コストなど)を計算する
4. スコアの高い順に上位`k`個だけを残し、それ以外の候補は破棄する——これが「ビーム幅で絞り込む」という操作の核心である
5. 終端条件(文章の終わりを表す記号が出た、探索の深さの上限に達した等)を満たすまで、この「拡張→スコアリング→絞り込み」を繰り返す
6. 最終的に残ったビームの中で最もスコアが高いものを出力とする

## 特性・トレードオフ

- **計算量**: 各段階で`O(bn)`個の候補を生成・評価し(`b`はビーム幅、`n`は各ビームからの拡張数)、それを`d`段階繰り返すので全体で`O(bnd)`程度。ビーム幅`b`を大きくするほど幅優先探索(全候補保持)に近づき、精度は上がるが計算・メモリコストも増える
- **貪欲法・幅優先探索との位置づけ**: ビーム幅`k=1`にすると各段階で最良の1候補しか残さない[貪欲法](/algorithms/hill-climbing)そのものになり、`k=∞`(制限なし)にすると通常の幅優先探索(コスト最小化ならダイクストラ法的な全候補保持)に一致する——ビームサーチはこの2つの極端な戦略を1つのパラメータで滑らかに繋ぐ枠組みになっている
- **最適解を保証しない近似性**: 各段階で切り捨てられた候補の中に、実は最終的に最良の解へつながる経路が含まれていた可能性は排除されない——ビームサーチは効率と解の質のトレードオフを`k`で調整する近似アルゴリズムであり、厳密な最適解を保証する探索アルゴリズムではない点に注意が必要
- **使いどころ**: 機械翻訳・文章要約・音声認識における出力文のデコーディング(各ステップで語彙全体から次の単語を選ぶ探索空間を実用的なサイズに抑える)、大規模言語モデルのテキスト生成、音声合成における音素列の探索

## 実装例

```python
from typing import Callable, TypeVar

T = TypeVar("T")


def beam_search(
    vocab: list[T],
    transition_score: Callable[[T | None, T], float],
    length: int,
    beam_width: int,
) -> tuple[list[T], float]:
    beams: list[tuple[float, list[T]]] = [(0.0, [])]
    for _ in range(length):
        candidates: list[tuple[float, list[T]]] = []
        for score, seq in beams:
            last = seq[-1] if seq else None
            for sym in vocab:
                candidates.append((score + transition_score(last, sym), seq + [sym]))
        candidates.sort(key=lambda c: c[0], reverse=True)
        beams = candidates[:beam_width]
    best_score, best_seq = max(beams, key=lambda c: c[0])
    return best_seq, best_score
```

```typescript
function beamSearch<T>(
  vocab: T[],
  transitionScore: (prev: T | null, sym: T) => number,
  length: number,
  beamWidth: number
): { seq: T[]; score: number } {
  let beams: { score: number; seq: T[] }[] = [{ score: 0, seq: [] }];
  for (let step = 0; step < length; step++) {
    const candidates: { score: number; seq: T[] }[] = [];
    for (const { score, seq } of beams) {
      const last = seq.length > 0 ? seq[seq.length - 1] : null;
      for (const sym of vocab) {
        candidates.push({ score: score + transitionScore(last, sym), seq: [...seq, sym] });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    beams = candidates.slice(0, beamWidth);
  }
  const best = beams.reduce((a, b) => (b.score > a.score ? b : a));
  return { seq: best.seq, score: best.score };
}
```

```cpp
#include <algorithm>
#include <functional>
#include <optional>
#include <vector>

template <typename T>
struct BeamCandidate {
    double score;
    std::vector<T> seq;
};

template <typename T>
BeamCandidate<T> beamSearch(const std::vector<T>& vocab,
                             const std::function<double(const std::optional<T>&, const T&)>& transitionScore,
                             int length, int beamWidth) {
    std::vector<BeamCandidate<T>> beams = {{0.0, {}}};
    for (int step = 0; step < length; step++) {
        std::vector<BeamCandidate<T>> candidates;
        for (const auto& beam : beams) {
            std::optional<T> last = beam.seq.empty() ? std::nullopt : std::optional<T>(beam.seq.back());
            for (const auto& sym : vocab) {
                auto newSeq = beam.seq;
                newSeq.push_back(sym);
                candidates.push_back({beam.score + transitionScore(last, sym), newSeq});
            }
        }
        std::sort(candidates.begin(), candidates.end(),
                  [](const auto& a, const auto& b) { return a.score > b.score; });
        if (static_cast<int>(candidates.size()) > beamWidth) candidates.resize(beamWidth);
        beams = candidates;
    }
    return *std::max_element(beams.begin(), beams.end(),
                              [](const auto& a, const auto& b) { return a.score < b.score; });
}
```

```rust
fn beam_search<T: Clone>(
    vocab: &[T],
    transition_score: impl Fn(Option<&T>, &T) -> f64,
    length: usize,
    beam_width: usize,
) -> (Vec<T>, f64) {
    let mut beams: Vec<(f64, Vec<T>)> = vec![(0.0, Vec::new())];
    for _ in 0..length {
        let mut candidates: Vec<(f64, Vec<T>)> = Vec::new();
        for (score, seq) in &beams {
            let last = seq.last();
            for sym in vocab {
                let mut new_seq = seq.clone();
                new_seq.push(sym.clone());
                candidates.push((score + transition_score(last, sym), new_seq));
            }
        }
        candidates.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
        candidates.truncate(beam_width);
        beams = candidates;
    }
    beams
        .into_iter()
        .max_by(|a, b| a.0.partial_cmp(&b.0).unwrap())
        .map(|(score, seq)| (seq, score))
        .unwrap()
}
```

```csharp
static class BeamSearch
{
    public static (List<T> seq, double score) Run<T>(List<T> vocab, Func<T?, T, double> transitionScore,
        int length, int beamWidth) where T : notnull
    {
        var beams = new List<(double score, List<T> seq)> { (0.0, new List<T>()) };
        for (int step = 0; step < length; step++)
        {
            var candidates = new List<(double score, List<T> seq)>();
            foreach (var (score, seq) in beams)
            {
                T? last = seq.Count > 0 ? seq[^1] : default;
                foreach (var sym in vocab)
                {
                    var newSeq = new List<T>(seq) { sym };
                    candidates.Add((score + transitionScore(last, sym), newSeq));
                }
            }
            beams = candidates.OrderByDescending(c => c.score).Take(beamWidth).ToList();
        }
        var best = beams.OrderByDescending(c => c.score).First();
        return (best.seq, best.score);
    }
}
```
