---
name: ダイナミックレンジコンプレッサー
category: 音響・信号処理
subcategory: 音響効果・DSP
complexity: O(n)(nはサンプル数)
summary: 信号の音量がしきい値を超えた分だけ比率的に圧縮し、さらにエンベロープ追従で滑らかにゲインを変化させることで、音量差(ダイナミックレンジ)を制御しラウドネスを均一化する音響エフェクト。
---

## 概要

録音された音声・楽曲は、静かな部分と大きな部分の音量差(ダイナミックレンジ)が大きいことが多く、そのままでは小さい音が聞き取りにくかったり、大きい音が耳障りになったりする。ダイナミックレンジコンプレッサーは、信号の振幅が設定した**しきい値(スレッショルド)を超えた分だけ、指定した比率(レシオ)で圧縮**することで、音量差を縮め、全体としてより均一で聞き取りやすい音量に整える。単なる振幅の切り詰め(クリッピング)とは異なり、しきい値を超えた分を滑らかに圧縮するため歪みが少なく、放送・音楽制作・ゲームオーディオのミキシングで最も基本的なダイナミクス処理として使われている。

## 仕組み

1. 入力信号のレベル(振幅の大きさ)を継続的に計測する。瞬間的な値をそのまま使うと変化が急すぎるため、通常は**エンベロープ検出**(レベルの変化を滑らかに追従させるローパスフィルタ的な処理)を通す
2. **アタック/リリース時間**を使い、レベルが急上昇するときは`attack`時間で素早く、レベルが下がるときは`release`時間でゆっくりと追従するようにエンベロープを更新する。これにより急な音の立ち上がりを検出しつつ、余韻が不自然に途切れるのを防ぐ
3. 検出したレベルがしきい値`threshold`を超えているかを判定する
4. 超えている場合、超過分(dB単位)を圧縮比`ratio`で割ることで、適用すべきゲイン減衰量を計算する:`gain_reduction_db = (level_db - threshold_db) × (1 - 1/ratio)`(しきい値以下の部分はゲイン減衰なし)
5. dB単位のゲイン減衰量を線形の倍率に変換し、元の信号に掛け合わせて出力する。これを全サンプルについて繰り返す

## 特性・トレードオフ

- **音量差の圧縮とラウドネスの底上げ**: 大きい音のピークを抑えることで、後段で全体の音量を上げても歪みにくくなり(メイクアップゲインの適用)、結果として楽曲・音声全体の知覚的な音量(ラウドネス)を上げられる。放送業界のラウドネス基準への準拠にも使われる
- **アタック/リリース設定が音の質感を大きく左右する**: アタックを速くすると音の立ち上がり(トランジェント)まで潰れて音がこもった印象になり、遅くするとアタック部分は圧縮されずに突き抜けて聞こえる。リリースが速すぎると「ポンピング」と呼ばれる不自然な音量の脈動が聞こえることがある。この2つのパラメータの調整が、コンプレッサーを使いこなす上での実務上の核心
- **比率(レシオ)による効果の強さの違い**: レシオが低い(2:1程度)場合は自然な音量調整に近く、高い(10:1以上)場合はリミッター(しきい値をほぼ超えさせない)に近い強い制御になる。極端なレシオ(∞:1)はブリックウォールリミッターと呼ばれる
- **使いどころ**: 音楽制作・マスタリングの標準的なダイナミクス処理、放送・配信のラウドネス管理、ボイスチャット・配信の音声レベル均一化、ゲームオーディオでの効果音の音量差の整理

## 実装例

```python
import math

def db_to_linear(db: float) -> float:
    return 10 ** (db / 20)

def linear_to_db(linear: float) -> float:
    return 20 * math.log10(max(linear, 1e-9))

def compressor(
    x: list[float], sample_rate: int, threshold_db: float = -20.0, ratio: float = 4.0,
    attack_ms: float = 5.0, release_ms: float = 50.0,
) -> list[float]:
    attack_coef = math.exp(-1 / (attack_ms / 1000 * sample_rate))
    release_coef = math.exp(-1 / (release_ms / 1000 * sample_rate))

    envelope = 0.0
    output = []
    for xn in x:
        level = abs(xn)
        coef = attack_coef if level > envelope else release_coef
        envelope = coef * envelope + (1 - coef) * level

        level_db = linear_to_db(envelope)
        if level_db > threshold_db:
            gain_reduction_db = (level_db - threshold_db) * (1 - 1 / ratio)
        else:
            gain_reduction_db = 0.0

        gain = db_to_linear(-gain_reduction_db)
        output.append(xn * gain)
    return output
```

```typescript
function dbToLinear(db: number): number {
  return 10 ** (db / 20);
}

function linearToDb(linear: number): number {
  return 20 * Math.log10(Math.max(linear, 1e-9));
}

function compressor(
  x: number[],
  sampleRate: number,
  thresholdDb = -20.0,
  ratio = 4.0,
  attackMs = 5.0,
  releaseMs = 50.0,
): number[] {
  const attackCoef = Math.exp(-1 / ((attackMs / 1000) * sampleRate));
  const releaseCoef = Math.exp(-1 / ((releaseMs / 1000) * sampleRate));

  let envelope = 0;
  const output: number[] = [];
  for (const xn of x) {
    const level = Math.abs(xn);
    const coef = level > envelope ? attackCoef : releaseCoef;
    envelope = coef * envelope + (1 - coef) * level;

    const levelDb = linearToDb(envelope);
    const gainReductionDb =
      levelDb > thresholdDb ? (levelDb - thresholdDb) * (1 - 1 / ratio) : 0;

    const gain = dbToLinear(-gainReductionDb);
    output.push(xn * gain);
  }
  return output;
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>

double dbToLinear(double db) { return std::pow(10.0, db / 20.0); }
double linearToDb(double linear) { return 20.0 * std::log10(std::max(linear, 1e-9)); }

std::vector<double> compressor(
    const std::vector<double>& x, int sampleRate, double thresholdDb = -20.0, double ratio = 4.0,
    double attackMs = 5.0, double releaseMs = 50.0) {
    double attackCoef = std::exp(-1.0 / (attackMs / 1000 * sampleRate));
    double releaseCoef = std::exp(-1.0 / (releaseMs / 1000 * sampleRate));

    double envelope = 0.0;
    std::vector<double> output;
    output.reserve(x.size());
    for (double xn : x) {
        double level = std::abs(xn);
        double coef = level > envelope ? attackCoef : releaseCoef;
        envelope = coef * envelope + (1 - coef) * level;

        double levelDb = linearToDb(envelope);
        double gainReductionDb = levelDb > thresholdDb ? (levelDb - thresholdDb) * (1 - 1 / ratio) : 0.0;

        double gain = dbToLinear(-gainReductionDb);
        output.push_back(xn * gain);
    }
    return output;
}
```

```rust
fn db_to_linear(db: f64) -> f64 {
    10f64.powf(db / 20.0)
}

fn linear_to_db(linear: f64) -> f64 {
    20.0 * linear.max(1e-9).log10()
}

fn compressor(x: &[f64], sample_rate: usize, threshold_db: f64, ratio: f64, attack_ms: f64, release_ms: f64) -> Vec<f64> {
    let attack_coef = (-1.0 / (attack_ms / 1000.0 * sample_rate as f64)).exp();
    let release_coef = (-1.0 / (release_ms / 1000.0 * sample_rate as f64)).exp();

    let mut envelope = 0.0;
    let mut output = Vec::with_capacity(x.len());
    for &xn in x {
        let level = xn.abs();
        let coef = if level > envelope { attack_coef } else { release_coef };
        envelope = coef * envelope + (1.0 - coef) * level;

        let level_db = linear_to_db(envelope);
        let gain_reduction_db = if level_db > threshold_db {
            (level_db - threshold_db) * (1.0 - 1.0 / ratio)
        } else {
            0.0
        };

        let gain = db_to_linear(-gain_reduction_db);
        output.push(xn * gain);
    }
    output
}
```

```csharp
static double DbToLinear(double db) => Math.Pow(10.0, db / 20.0);
static double LinearToDb(double linear) => 20.0 * Math.Log10(Math.Max(linear, 1e-9));

static double[] Compressor(double[] x, int sampleRate, double thresholdDb = -20.0, double ratio = 4.0, double attackMs = 5.0, double releaseMs = 50.0)
{
    double attackCoef = Math.Exp(-1.0 / (attackMs / 1000 * sampleRate));
    double releaseCoef = Math.Exp(-1.0 / (releaseMs / 1000 * sampleRate));

    double envelope = 0;
    var output = new double[x.Length];
    for (int i = 0; i < x.Length; i++)
    {
        double level = Math.Abs(x[i]);
        double coef = level > envelope ? attackCoef : releaseCoef;
        envelope = coef * envelope + (1 - coef) * level;

        double levelDb = LinearToDb(envelope);
        double gainReductionDb = levelDb > thresholdDb ? (levelDb - thresholdDb) * (1 - 1 / ratio) : 0.0;

        double gain = DbToLinear(-gainReductionDb);
        output[i] = x[i] * gain;
    }
    return output;
}
```
