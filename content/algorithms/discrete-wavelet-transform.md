---
name: 離散ウェーブレット変換(DWT)
category: 数値計算
subcategory: 信号処理
complexity: O(n)(1回の分解、nはサンプル数)
summary: 信号をローパス(近似)とハイパス(詳細)の2つのフィルタバンクに通してから半分に間引く操作を再帰的に繰り返し、周波数成分だけでなく「いつその周波数が現れたか」という時間情報も同時に保持する多重解像度分解。
---

## 概要

[離散フーリエ変換(FFT)](/algorithms/fft)は信号をサイン波の重ね合わせとして周波数領域に変換するが、変換後は「どの周波数がどれだけ含まれるか」は分かっても「その周波数がいつ現れたか」という時間的な情報が失われてしまう。離散ウェーブレット変換(DWT)は、[修正離散コサイン変換(MDCT)](/algorithms/mdct-audio-coding)のようなブロック単位の変換ともFFTとも異なるアプローチで、**時間と周波数の両方の情報を同時に、しかも解像度を変えながら**保持する。信号を「ローパスフィルタ(緩やかな変化=近似成分)」と「ハイパスフィルタ(急な変化=詳細成分)」の2つに通して半分の長さに間引き、得られた近似成分に対してさらに同じ分解を繰り返すことで、低周波数成分は粗い時間解像度・高い周波数解像度で、高周波数成分は細かい時間解像度・粗い周波数解像度で表現するという、信号の性質に自然に適応した多重解像度分解を実現する。

## 仕組み

1. 入力信号`x[n]`に対して、**ローパスフィルタ`h`(スケーリング関数に対応)** と**ハイパスフィルタ`g`(ウェーブレット関数に対応)** をそれぞれ畳み込む
2. ローパスフィルタの出力を2つおきに間引く(ダウンサンプリング)ことで、元の半分の長さの**近似係数(Approximation Coefficients)**`cA`を得る。これは信号の緩やかな全体的な傾向を表す
3. 同様にハイパスフィルタの出力も2つおきに間引き、**詳細係数(Detail Coefficients)**`cD`を得る。これは信号の急激な変化・高周波成分を表す
4. `cA`(近似係数)に対して、再び1〜3の分解を適用する(信号長が半分になった`cA`から、さらに半分の長さの`cA'`と`cD'`を得る)。これを望むレベル数だけ繰り返す
5. 最終的に得られる、各レベルの詳細係数`cD, cD', cD'', ...`と最後のレベルの近似係数をまとめたものが、元の信号のウェーブレット分解となる。逆変換(合成)は、各レベルの係数をアップサンプリングしてフィルタに通し、足し合わせることで元の信号を復元する

## 特性・トレードオフ

- **時間-周波数の両方を同時に扱える多重解像度性**: FFTが「窓の中の全周波数情報を得るが、窓の中のどこで起きたかは分からない」のに対し、DWTは低周波数の緩やかな変化は粗い時間解像度で、高周波数の急な変化(エッジ、クリック音)は細かい時間解像度で捉えるという、信号の性質に自然に適応した表現ができる
- **画像・音声圧縮での実用性**: JPEG2000やFBI指紋データベースの圧縮方式はDWTを採用しており、画像の滑らかな領域(近似係数)とエッジ・テクスチャ(詳細係数)を分離して、それぞれに適した圧縮率を適用できる。[修正離散コサイン変換(MDCT)](/algorithms/mdct-audio-coding)ベースの圧縮がブロック境界のアーティファクトに悩まされうるのに対し、DWTは多重解像度性によりこの問題を避けやすい
- **ウェーブレット基底の選択という設計自由度**: ローパス・ハイパスフィルタの係数(Haarウェーブレット、Daubechiesウェーブレットなど)の選び方によって、時間局在性・周波数分解能・計算コストのバランスが変わる。単純なHaarウェーブレットは実装が容易だが周波数分解能が粗く、Daubechiesウェーブレットはより滑らかな信号表現ができる代わりに計算がやや複雑になる
- **使いどころ**: JPEG2000・指紋画像圧縮などの画像符号化、地震波・脳波(EEG)のような非定常信号の解析、ノイズ除去(ウェーブレット閾値処理)、信号の特異点(エッジ、不連続点)検出

## 実装例

Haarウェーブレット(最も単純な、隣接2サンプルの和・差を使うウェーブレット)による1レベルの分解と逆変換を示す。

```python
def haar_dwt_1level(signal: list[float]) -> tuple[list[float], list[float]]:
    """信号を近似係数(cA)と詳細係数(cD)に1レベル分解する。"""
    n = len(signal) // 2
    ca = [(signal[2 * i] + signal[2 * i + 1]) / 2 ** 0.5 for i in range(n)]
    cd = [(signal[2 * i] - signal[2 * i + 1]) / 2 ** 0.5 for i in range(n)]
    return ca, cd

def haar_idwt_1level(ca: list[float], cd: list[float]) -> list[float]:
    """近似係数と詳細係数から元の信号を復元する。"""
    n = len(ca)
    signal = [0.0] * (2 * n)
    for i in range(n):
        signal[2 * i] = (ca[i] + cd[i]) / 2 ** 0.5
        signal[2 * i + 1] = (ca[i] - cd[i]) / 2 ** 0.5
    return signal

def haar_dwt_multilevel(signal: list[float], levels: int) -> list[list[float]]:
    """複数レベルの分解を行い、[cD_level1, cD_level2, ..., cA_final]の形で返す。"""
    coeffs = []
    current = signal
    for _ in range(levels):
        ca, cd = haar_dwt_1level(current)
        coeffs.append(cd)
        current = ca
    coeffs.append(current)
    return coeffs
```

```typescript
function haarDwt1Level(signal: number[]): { ca: number[]; cd: number[] } {
  const n = Math.floor(signal.length / 2);
  const sqrt2 = Math.sqrt(2);
  const ca = Array.from({ length: n }, (_, i) => (signal[2 * i] + signal[2 * i + 1]) / sqrt2);
  const cd = Array.from({ length: n }, (_, i) => (signal[2 * i] - signal[2 * i + 1]) / sqrt2);
  return { ca, cd };
}

function haarIdwt1Level(ca: number[], cd: number[]): number[] {
  const n = ca.length;
  const sqrt2 = Math.sqrt(2);
  const signal = new Array(2 * n).fill(0);
  for (let i = 0; i < n; i++) {
    signal[2 * i] = (ca[i] + cd[i]) / sqrt2;
    signal[2 * i + 1] = (ca[i] - cd[i]) / sqrt2;
  }
  return signal;
}

function haarDwtMultilevel(signal: number[], levels: number): number[][] {
  const coeffs: number[][] = [];
  let current = signal;
  for (let l = 0; l < levels; l++) {
    const { ca, cd } = haarDwt1Level(current);
    coeffs.push(cd);
    current = ca;
  }
  coeffs.push(current);
  return coeffs;
}
```

```cpp
#include <vector>
#include <cmath>

std::pair<std::vector<double>, std::vector<double>> haarDwt1Level(const std::vector<double>& signal) {
    int n = static_cast<int>(signal.size()) / 2;
    double sqrt2 = std::sqrt(2.0);
    std::vector<double> ca(n), cd(n);
    for (int i = 0; i < n; i++) {
        ca[i] = (signal[2 * i] + signal[2 * i + 1]) / sqrt2;
        cd[i] = (signal[2 * i] - signal[2 * i + 1]) / sqrt2;
    }
    return {ca, cd};
}

std::vector<double> haarIdwt1Level(const std::vector<double>& ca, const std::vector<double>& cd) {
    int n = static_cast<int>(ca.size());
    double sqrt2 = std::sqrt(2.0);
    std::vector<double> signal(2 * n);
    for (int i = 0; i < n; i++) {
        signal[2 * i] = (ca[i] + cd[i]) / sqrt2;
        signal[2 * i + 1] = (ca[i] - cd[i]) / sqrt2;
    }
    return signal;
}

std::vector<std::vector<double>> haarDwtMultilevel(std::vector<double> signal, int levels) {
    std::vector<std::vector<double>> coeffs;
    for (int l = 0; l < levels; l++) {
        auto [ca, cd] = haarDwt1Level(signal);
        coeffs.push_back(cd);
        signal = ca;
    }
    coeffs.push_back(signal);
    return coeffs;
}
```

```rust
fn haar_dwt_1level(signal: &[f64]) -> (Vec<f64>, Vec<f64>) {
    let n = signal.len() / 2;
    let sqrt2 = 2f64.sqrt();
    let ca: Vec<f64> = (0..n).map(|i| (signal[2 * i] + signal[2 * i + 1]) / sqrt2).collect();
    let cd: Vec<f64> = (0..n).map(|i| (signal[2 * i] - signal[2 * i + 1]) / sqrt2).collect();
    (ca, cd)
}

fn haar_idwt_1level(ca: &[f64], cd: &[f64]) -> Vec<f64> {
    let n = ca.len();
    let sqrt2 = 2f64.sqrt();
    let mut signal = vec![0.0; 2 * n];
    for i in 0..n {
        signal[2 * i] = (ca[i] + cd[i]) / sqrt2;
        signal[2 * i + 1] = (ca[i] - cd[i]) / sqrt2;
    }
    signal
}

fn haar_dwt_multilevel(signal: Vec<f64>, levels: usize) -> Vec<Vec<f64>> {
    let mut coeffs = Vec::new();
    let mut current = signal;
    for _ in 0..levels {
        let (ca, cd) = haar_dwt_1level(&current);
        coeffs.push(cd);
        current = ca;
    }
    coeffs.push(current);
    coeffs
}
```

```csharp
static (double[] ca, double[] cd) HaarDwt1Level(double[] signal)
{
    int n = signal.Length / 2;
    double sqrt2 = Math.Sqrt(2.0);
    var ca = new double[n];
    var cd = new double[n];
    for (int i = 0; i < n; i++)
    {
        ca[i] = (signal[2 * i] + signal[2 * i + 1]) / sqrt2;
        cd[i] = (signal[2 * i] - signal[2 * i + 1]) / sqrt2;
    }
    return (ca, cd);
}

static double[] HaarIdwt1Level(double[] ca, double[] cd)
{
    int n = ca.Length;
    double sqrt2 = Math.Sqrt(2.0);
    var signal = new double[2 * n];
    for (int i = 0; i < n; i++)
    {
        signal[2 * i] = (ca[i] + cd[i]) / sqrt2;
        signal[2 * i + 1] = (ca[i] - cd[i]) / sqrt2;
    }
    return signal;
}

static List<double[]> HaarDwtMultilevel(double[] signal, int levels)
{
    var coeffs = new List<double[]>();
    var current = signal;
    for (int l = 0; l < levels; l++)
    {
        var (ca, cd) = HaarDwt1Level(current);
        coeffs.Add(cd);
        current = ca;
    }
    coeffs.Add(current);
    return coeffs;
}
```
