---
name: サブバンド符号化(Subband Coding)
category: 音響・信号処理
subcategory: オーディオ圧縮・符号化
complexity: O(n log n)(nはフレーム長、フィルタバンクに依存)
summary: 音声信号を複数の周波数帯域(サブバンド)に分割し、各帯域を人間の聴覚特性に応じて異なるビット数で量子化することで、知覚品質を保ったまま情報量を削減する初期のオーディオ圧縮の枠組み。
---

## 概要

[修正離散コサイン変換(MDCT)](/algorithms/mdct-audio-coding)がブロック単位で周波数領域に変換して圧縮するのに対し、サブバンド符号化はより直接的に「信号を複数の周波数帯域(サブバンド)に分割してから、それぞれの帯域を別々に符号化する」という発想に立つ。人間の聴覚は全ての周波数帯域を均等な精度で知覚しているわけではなく、ある周波数の音が鳴っていると、近い周波数の小さな音は聞こえにくくなる(マスキング効果)。サブバンド符号化は、この聴覚心理モデルを使って**各サブバンドに割り当てるビット数を動的に調整**し、聞こえにくい帯域には少ないビットを、聞こえやすい帯域には多くのビットを割り当てることで、知覚的な音質をなるべく保ちながらデータ量を削減する。MPEG Layer 1/2(MP2)やDolby ACなど、MDCTベースのコーデックが登場する以前の音声圧縮方式で中心的に使われた技術である。

## 仕組み

1. 入力信号を**フィルタバンク**(複数のバンドパスフィルタの集合、または[MDCT](/algorithms/mdct-audio-coding)のような直交変換で代用することもある)に通し、信号を複数の周波数帯域(例えば32バンド)に分割する
2. 各サブバンドの信号をダウンサンプリングする(帯域が狭くなった分、元の全帯域信号と同じサンプリングレートで表現する必要がなくなるため、サンプル数を減らせる——このダウンサンプリングと再構成が正しく行われるための条件を「完全再構成フィルタバンク」の理論が保証する)
3. 各フレームについて、聴覚心理モデル(マスキング効果を考慮したモデル)を使い、各サブバンドの「聞こえやすさ」に応じたビット割り当てを計算する
4. 各サブバンドの信号を、割り当てられたビット数で量子化する。マスキングされて聞こえにくいと判断された帯域は粗く(少ないビット数で)量子化し、目立つ帯域は精細に量子化する
5. 量子化した各サブバンドのデータと、ビット割り当て情報をまとめてビットストリームとして出力する。復号時は逆の手順(逆量子化→各サブバンドのアップサンプリング→フィルタバンクの合成)で波形を復元する

## 特性・トレードオフ

- **人間の聴覚特性を直接利用した圧縮**: 単純にサンプルあたりのビット数を均一に減らすのではなく、「聞こえにくい部分から優先的に削る」という聴覚心理モデルに基づいた非一様な圧縮により、同じビットレートでもより高い知覚品質を実現できる
- **フィルタバンクの設計が音質を左右する**: 各サブバンドに完全に分離しきれない周波数成分が漏れ込む(帯域間のクロストーク)と、量子化ノイズがマスキングされずに聞こえてしまうことがある。完全再構成フィルタバンクの設計は、この漏れを理論的に抑える工夫である
- **MDCTベースの手法への移行**: サブバンド符号化(フィルタバンク方式)は、より周波数分解能の高い[MDCT](/algorithms/mdct-audio-coding)ベースの手法(MP3のように、粗いサブバンド分割の後にさらにMDCTをかけるハイブリッド方式や、AAC/Vorbis/OpusのようなMDCT単体の方式)に多くが置き換わっていったが、その基本思想(聴覚心理モデルに基づく非一様なビット割り当て)は現代の音声コーデックにも受け継がれている
- **使いどころ**: MPEG Layer 1/2(MP2、デジタル放送や一部の配信で今も使われる)、MP3のハイブリッドフィルタバンク部分、ADPCMより高品質な音声圧縮が必要な組み込み機器、音声圧縮アルゴリズムの教育的な導入(フィルタバンクと聴覚心理モデルという2つの柱を学ぶ題材として)

## 実装例

簡略化した4バンドのフィルタバンク(移動平均による帯域分割)と、聴覚心理モデルの代わりにエネルギー比に基づく単純なビット割り当てを示す。

```python
def split_subbands(x: list[float], n_bands: int = 4) -> list[list[float]]:
    """簡略化: nバンドに単純なダウンサンプリングで分割する(実運用は直交フィルタバンクを使う)。"""
    return [x[i::n_bands] for i in range(n_bands)]

def band_energy(band: list[float]) -> float:
    return sum(s * s for s in band) / max(len(band), 1)

def allocate_bits(bands: list[list[float]], total_bits: int) -> list[int]:
    """各サブバンドのエネルギー比に応じてビットを配分する(エネルギーが大きい帯域ほど多くのビット)。"""
    energies = [band_energy(b) for b in bands]
    total_energy = sum(energies) or 1.0
    return [max(1, round(total_bits * e / total_energy)) for e in energies]

def quantize_band(band: list[float], bits: int) -> list[int]:
    levels = 2 ** bits
    max_val = max((abs(s) for s in band), default=1.0) or 1.0
    step = (2 * max_val) / levels
    return [round((s + max_val) / step) for s in band]
```

```typescript
function splitSubbands(x: number[], nBands = 4): number[][] {
  return Array.from({ length: nBands }, (_, i) => x.filter((_, idx) => idx % nBands === i));
}

function bandEnergy(band: number[]): number {
  return band.reduce((sum, s) => sum + s * s, 0) / Math.max(band.length, 1);
}

function allocateBits(bands: number[][], totalBits: number): number[] {
  const energies = bands.map(bandEnergy);
  const totalEnergy = energies.reduce((a, b) => a + b, 0) || 1;
  return energies.map((e) => Math.max(1, Math.round((totalBits * e) / totalEnergy)));
}

function quantizeBand(band: number[], bits: number): number[] {
  const levels = 2 ** bits;
  const maxVal = Math.max(...band.map(Math.abs), 1e-9);
  const step = (2 * maxVal) / levels;
  return band.map((s) => Math.round((s + maxVal) / step));
}
```

```cpp
#include <vector>
#include <cmath>
#include <numeric>
#include <algorithm>

std::vector<std::vector<double>> splitSubbands(const std::vector<double>& x, int nBands = 4) {
    std::vector<std::vector<double>> bands(nBands);
    for (size_t i = 0; i < x.size(); i++) bands[i % nBands].push_back(x[i]);
    return bands;
}

double bandEnergy(const std::vector<double>& band) {
    double sum = 0.0;
    for (double s : band) sum += s * s;
    return band.empty() ? 0.0 : sum / band.size();
}

std::vector<int> allocateBits(const std::vector<std::vector<double>>& bands, int totalBits) {
    std::vector<double> energies;
    for (auto& b : bands) energies.push_back(bandEnergy(b));
    double totalEnergy = std::accumulate(energies.begin(), energies.end(), 0.0);
    if (totalEnergy == 0.0) totalEnergy = 1.0;

    std::vector<int> bits;
    for (double e : energies) bits.push_back(std::max(1, static_cast<int>(std::round(totalBits * e / totalEnergy))));
    return bits;
}
```

```rust
fn split_subbands(x: &[f64], n_bands: usize) -> Vec<Vec<f64>> {
    let mut bands = vec![Vec::new(); n_bands];
    for (i, &s) in x.iter().enumerate() {
        bands[i % n_bands].push(s);
    }
    bands
}

fn band_energy(band: &[f64]) -> f64 {
    if band.is_empty() {
        return 0.0;
    }
    band.iter().map(|s| s * s).sum::<f64>() / band.len() as f64
}

fn allocate_bits(bands: &[Vec<f64>], total_bits: i32) -> Vec<i32> {
    let energies: Vec<f64> = bands.iter().map(|b| band_energy(b)).collect();
    let total_energy: f64 = energies.iter().sum::<f64>().max(1e-9);
    energies
        .iter()
        .map(|&e| ((total_bits as f64 * e / total_energy).round() as i32).max(1))
        .collect()
}
```

```csharp
static List<List<double>> SplitSubbands(double[] x, int nBands = 4)
{
    var bands = new List<List<double>>();
    for (int i = 0; i < nBands; i++) bands.Add(new List<double>());
    for (int i = 0; i < x.Length; i++) bands[i % nBands].Add(x[i]);
    return bands;
}

static double BandEnergy(List<double> band)
{
    if (band.Count == 0) return 0;
    double sum = band.Sum(s => s * s);
    return sum / band.Count;
}

static int[] AllocateBits(List<List<double>> bands, int totalBits)
{
    var energies = bands.Select(BandEnergy).ToArray();
    double totalEnergy = energies.Sum();
    if (totalEnergy == 0) totalEnergy = 1.0;

    return energies.Select(e => Math.Max(1, (int)Math.Round(totalBits * e / totalEnergy))).ToArray();
}
```
