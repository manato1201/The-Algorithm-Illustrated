---
name: 心理音響マスキングによる知覚符号化(MP3/AAC等)
category: 音響・信号処理
subcategory: オーディオ圧縮・符号化
complexity: O(n log n)(nはフレーム長。FFTによるマスキング閾値計算に依存)
summary: 大きな音の近くの周波数・時間にある小さな音は人間の耳に聞こえないという心理音響マスキング効果を利用し、聞こえない成分にビットを割かないことで知覚的にほぼ無損失な非可逆圧縮を実現する手法。
---

## 概要

[FLAC](/algorithms/flac-lossless-coding)のような完全可逆圧縮は、元の波形を1ビットも失わずに復元できることを保証するが、その分だけ圧縮率には限界がある。一方MP3やAACのような非可逆(ロッシー)コーデックは、「人間の耳には物理的に存在していても聞こえない音」を積極的に切り捨てることで、可逆圧縮では届かない圧縮率を実現する。この判断の根拠となるのが**心理音響マスキング**——大きな音の近くの周波数、あるいは大きな音の直前・直後の短い時間にある小さな音は、人間の聴覚では知覚されにくくなるという聴覚特性である。心理音響マスキングモデルを使って「聞こえない」と判定された周波数成分にはビットをほとんど割り当てず、逆に聞こえやすい成分には多くのビットを割り当てることで、データ量を削減しながら知覚的な音質の劣化を最小限に抑える。この考え方はMP3(MPEG-1 Audio Layer III)やAAC、Opusなど現代の主要な音声コーデックの中核をなす。

## 仕組み

1. **周波数分析**: 入力信号をフレーム単位に区切り、FFTなどで周波数スペクトルを求める。同時にエンコード用の変換([修正離散コサイン変換(MDCT)](/algorithms/mdct-audio-coding)など)にもかける
2. **マスカーの検出**: スペクトル中で音量が大きく際立った成分(トーン性マスカー)や、広帯域にエネルギーを持つノイズ的な成分(ノイズ性マスカー)を検出する。これらが周囲の音を「マスクする」音源となる
3. **マスキング閾値の計算**: 各マスカーについて、心理音響実験に基づくモデル(バーク尺度で表した臨界帯域ごとの拡散関数など)を使い、その周波数の周辺でどこまでの音量なら聞こえなくなるかという**マスキング閾値**を計算する。複数のマスカーによる閾値を合成し、フレーム全体の最終的なマスキング閾値カーブを得る。時間方向にも、大きな音の直後は一時的に聴覚が鈍る**時間マスキング(ポストマスキング、逆に直前の音が短時間先の音をマスクするプリマスキングもある)**を考慮する実装もある
4. **ビット配分**: 各周波数帯(または各変換係数)について、信号の実際のエネルギーとマスキング閾値を比較する。信号がマスキング閾値を下回っている帯域は「どうせ聞こえない」ためビットをほとんど割り当てず、逆にマスキング閾値を上回っている(聞こえてしまう)帯域には量子化ノイズがマスキング閾値以下に収まるよう十分なビットを割り当てる
5. **量子化とビットストリーム化**: 決定したビット配分に従って各周波数成分を量子化し、エントロピー符号化(ハフマン符号など)も併用してさらに圧縮した上でビットストリームとして出力する。復号時は量子化された値を逆変換して波形へ戻すが、切り捨てられた情報はもう存在しないため元の波形とは完全には一致しない(非可逆)

量子化ノイズを「消す」のではなく「マスキング閾値の下に隠す」という発想が心理音響符号化の核心であり、理論上は量子化誤差がマスキング閾値を超えない限り、聴感上は元の音との違いが分からない(可聴域では)ことになる。

## 特性・トレードオフ

- **[FLAC](/algorithms/flac-lossless-coding)との違い(可逆性を犠牲にしたビット配分)**: FLACは波形を完全に復元可能な形で線形予測とエントロピー符号化のみを使って圧縮するため、どれだけ圧縮しても元の波形を1ビットも失わない。心理音響マスキング符号化は聴覚モデルに基づいて「聞こえない」と判断した情報を明示的に捨てるため、復号結果は元の波形と一致しないが、その分FLACよりもはるかに高い圧縮率(同程度の主観的な音質を保ちながら)を達成できる
- **[サブバンド符号化](/algorithms/subband-coding)との違い(聴覚モデルの精緻さ)**: サブバンド符号化も聴覚特性に基づく非一様なビット割り当てという発想を共有するが、心理音響マスキング符号化(特にMP3以降)はより精緻なマスキングモデル(トーン性・ノイズ性マスカーの区別、時間マスキングなど)と、[MDCT](/algorithms/mdct-audio-coding)による高い周波数分解能を組み合わせることで、より高精度なビット配分を行う。実際MP3はサブバンドのフィルタバンクとMDCTを組み合わせたハイブリッド方式である
- **ビットレートと音質のトレードオフ**: 低ビットレートではマスキング閾値以下に量子化ノイズを収めきれず、「シャリシャリした」耳障りなアーティファクト(プリエコーなど)が聞こえることがある。特にアタックの鋭い打楽器音などは時間マスキングモデルが対応しきれないと量子化ノイズが目立ちやすい
- **心理音響モデルの限界と個人差**: マスキング閾値はあくまで統計的な聴覚モデルに基づく近似であり、実際の知覚には個人差やヘッドフォン/スピーカーなどの再生環境差がある。このため「知覚的に無損失」とされるビットレートでも、訓練された耳や高品質な再生環境では違いが聞き取れる場合がある
- **使いどころ**: 音楽配信・ストリーミングサービス(Spotify、YouTube等)、ポータブルオーディオ機器のストレージ節約、動画コーデックに組み込まれる音声トラック(AAC)、ボイスチャット・通話品質を保ちながら帯域を節約する用途(Opus)

## 実装例

簡略化した心理音響モデル(トーン性マスカーの検出とバーク尺度風の拡散のみ)によるマスキング閾値計算と、それに基づくビット配分の例。

```python
import math

def freq_to_bark(freq: float) -> float:
    """周波数(Hz)をバーク尺度に変換する近似式。"""
    return 13 * math.atan(0.00076 * freq) + 3.5 * math.atan((freq / 7500) ** 2)

def find_maskers(spectrum: list[float], sample_rate: int, threshold_db: float = -20.0) -> list[tuple[int, float]]:
    """スペクトル中でしきい値を超える局所ピークをマスカーとして検出する。"""
    n = len(spectrum)
    maskers = []
    for i in range(1, n - 1):
        mag_db = 20 * math.log10(max(spectrum[i], 1e-9))
        if mag_db > threshold_db and spectrum[i] > spectrum[i - 1] and spectrum[i] >= spectrum[i + 1]:
            maskers.append((i, mag_db))
    return maskers

def masking_threshold(spectrum: list[float], sample_rate: int) -> list[float]:
    """各マスカーからバーク距離に応じて減衰する拡散関数を重ね合わせ、閾値カーブを作る。"""
    n = len(spectrum)
    maskers = find_maskers(spectrum, sample_rate)
    threshold_db = [-100.0] * n

    for i, mag_db in maskers:
        freq_i = i * sample_rate / (2 * n)
        bark_i = freq_to_bark(freq_i)
        for j in range(n):
            freq_j = j * sample_rate / (2 * n)
            bark_j = freq_to_bark(freq_j)
            # バーク距離が離れるほどマスキング効果が弱まる単純な三角拡散関数
            spread_db = mag_db - 27 * abs(bark_i - bark_j) - 6  # -6dBはマスカー自身の余裕
            threshold_db[j] = max(threshold_db[j], spread_db)
    return threshold_db

def allocate_bits_perceptual(spectrum: list[float], sample_rate: int, total_bits: int) -> list[int]:
    """信号レベルがマスキング閾値をどれだけ超えているかに応じてビットを配分する。"""
    threshold_db = masking_threshold(spectrum, sample_rate)
    excess = []
    for s, t in zip(spectrum, threshold_db):
        signal_db = 20 * math.log10(max(s, 1e-9))
        excess.append(max(0.0, signal_db - t))  # 閾値以下なら0(ビットを割かない)

    total_excess = sum(excess) or 1.0
    return [round(total_bits * e / total_excess) for e in excess]
```

```typescript
function freqToBark(freq: number): number {
  // 周波数(Hz)をバーク尺度に変換する近似式
  return 13 * Math.atan(0.00076 * freq) + 3.5 * Math.atan((freq / 7500) ** 2);
}

function findMaskers(spectrum: number[], thresholdDb = -20.0): [number, number][] {
  const n = spectrum.length;
  const maskers: [number, number][] = [];
  for (let i = 1; i < n - 1; i++) {
    const magDb = 20 * Math.log10(Math.max(spectrum[i], 1e-9));
    if (magDb > thresholdDb && spectrum[i] > spectrum[i - 1] && spectrum[i] >= spectrum[i + 1]) {
      maskers.push([i, magDb]);
    }
  }
  return maskers;
}

function maskingThreshold(spectrum: number[], sampleRate: number): number[] {
  const n = spectrum.length;
  const maskers = findMaskers(spectrum);
  const thresholdDb = new Array(n).fill(-100.0);

  for (const [i, magDb] of maskers) {
    const freqI = (i * sampleRate) / (2 * n);
    const barkI = freqToBark(freqI);
    for (let j = 0; j < n; j++) {
      const freqJ = (j * sampleRate) / (2 * n);
      const barkJ = freqToBark(freqJ);
      // バーク距離が離れるほどマスキング効果が弱まる単純な三角拡散関数
      const spreadDb = magDb - 27 * Math.abs(barkI - barkJ) - 6; // -6dBはマスカー自身の余裕
      thresholdDb[j] = Math.max(thresholdDb[j], spreadDb);
    }
  }
  return thresholdDb;
}

function allocateBitsPerceptual(spectrum: number[], sampleRate: number, totalBits: number): number[] {
  const thresholdDb = maskingThreshold(spectrum, sampleRate);
  const excess = spectrum.map((s, idx) => {
    const signalDb = 20 * Math.log10(Math.max(s, 1e-9));
    return Math.max(0, signalDb - thresholdDb[idx]); // 閾値以下なら0(ビットを割かない)
  });

  const totalExcess = excess.reduce((a, b) => a + b, 0) || 1;
  return excess.map((e) => Math.round((totalBits * e) / totalExcess));
}
```
