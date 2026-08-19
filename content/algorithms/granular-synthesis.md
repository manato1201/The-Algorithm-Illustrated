---
name: グラニュラー音響合成(Granular Synthesis)
category: 音響・信号処理
subcategory: 音声合成・分析
complexity: O(n・g)(nは出力サンプル数、gは同時に鳴っているグレイン数)
summary: 音声を数ミリ秒〜数十ミリ秒の微小な粒(グレイン)に分割し、各粒の再生タイミング・ピッチ・音量を独立に操作して重ね合わせることで、時間伸縮やテクスチャ的な音響効果を作る合成技法。
---

## 概要

音を数ミリ秒〜数十ミリ秒という極めて短い断片(**グレイン**、粒)の集まりとして捉え、その粒それぞれの再生位置・再生速度(ピッチ)・音量・出現タイミングを独立に制御しながら大量に重ね合わせることで新しい音を作り出すのがグラニュラー音響合成である。1粒だけでは意味のある音として聞こえないほど短いが、数百〜数千のグレインを密に重ねると、元の音声とは全く異なる質感(雲のような、あるいは霧のようなテクスチャ)を持つ音や、ピッチはそのままに時間だけを伸縮させた音を作れる。理論的な起源はDennis Gaborの量子音響理論(1940年代)に遡り、1970年代以降Iannis XenakisやCurtis Roadsらによって音楽的な合成技法として発展した。時間伸縮・ピッチシフト・音響テクスチャ生成のいずれにも使える汎用性の高さから、現代のDAWのタイムストレッチ機能やアンビエント/実験音楽のサウンドデザインで広く使われている。

## 仕組み

1. **グレインの切り出し**: 元の音声データから、開始位置`position`・長さ`grain_size`(典型的には10〜100ms)の短い断片を切り出す
2. **窓関数の適用**: 切り出したグレインの両端をそのまま繋ぐと不連続点でクリックノイズが発生するため、グレインの振幅にハン窓のような**窓関数**を掛けて、始まりと終わりをなめらかにフェードイン・フェードアウトさせる:`w(t) = 0.5・(1 - cos(2π・t / grain_size))`
3. **グレインのパラメータ制御**: 各グレインごとに次のようなパラメータを(固定値または確率的なランダム性を持たせて)決める
   - **再生ピッチ**: グレイン内部を読み出す速度を変えることで、元の音声よりも高い/低いピッチで再生する
   - **出現タイミング(密度)**: 次のグレインを何ミリ秒後に出すか。密度を高くするほど連続的な音になり、疎にするとリズミックな粒の感触が残る
   - **読み出し位置のジッタ**: 元音声内のどこからグレインを切り出すかにランダムな揺らぎを加えることで、単調な繰り返し感を避ける
4. **重ね合わせ(オーバーラップ&アド)**: 生成した複数のグレインを、それぞれの出現タイミングに合わせて出力バッファに加算していく。窓関数によって滑らかに重なるため、グレイン同士の境界が聞こえにくい連続的な音になる
5. **時間伸縮の実現**: 元の音声を読み出す位置の進む速度と、グレインが出力される速度を独立に制御できるのがグラニュラー合成の核心である。例えば元音声内の読み出し位置をゆっくり進めながらグレインを高い密度で出力し続ければ、ピッチはほぼそのままに再生時間だけを引き伸ばせる(逆に読み出し位置を速く進めれば時間短縮になる)

## 特性・トレードオフ

- **時間とピッチの独立制御**: [PSOLAによるピッチシフト](/algorithms/pitch-shifting-psola)がピッチ周期を基準に波形を伸縮するのに対し、グラニュラー合成はグレイン単位で読み出し位置とピッチを別々に操作できるため、周期性のない音(打楽器・環境音・ノイズ的な音)にも適用できる汎用性がある
- **グレインサイズが音質を左右する**: グレインを短くしすぎると各グレインの周波数成分がぼやけ(短い窓ほど周波数分解能が落ちる)、ノイズ的・粒立った質感が強くなる。長くしすぎると元の音の時間的な特徴(アタックなど)がグレインの中に紛れ込み、ぼやけた印象になる。目的の音色に応じてグレインサイズ・密度・ジッタのバランスを調整する必要がある
- **計算コストはグレイン密度に比例**: 同時に鳴っているグレインの数だけ、切り出し・窓関数適用・加算の処理が必要になるため、高密度なグラニュラー処理はリアルタイム性とのトレードオフになる。ただし1グレインあたりの処理自体は単純な配列操作なので、[短時間フーリエ変換](/algorithms/short-time-fourier-transform)ベースの手法に比べて実装は軽量に済むことが多い
- **テクスチャ生成としての側面**: 元音声の断片をランダムな順序・ピッチで大量に重ねることで、原音の面影を残しつつ全く異なる質感の音響テクスチャ(パッド、アンビエントドローン、グリッチ的な効果音)を作れる。これは時間伸縮のような「元の音を保った変形」とは異なる、グラニュラー合成ならではの創作的な使い方である
- **使いどころ**: DAWのタイムストレッチ/ピッチシフト機能、アンビエント・実験音楽のサウンドテクスチャ生成、ゲームオーディオでの環境音の有機的なバリエーション生成、音声のグリッチ/スタッター効果

## 実装例

```python
import math
import random

def hann_window(n: int) -> list[float]:
    return [0.5 * (1 - math.cos(2 * math.pi * i / (n - 1))) for i in range(n)]

def extract_grain(source: list[float], position: int, grain_size: int, window: list[float]) -> list[float]:
    grain = []
    for i in range(grain_size):
        idx = position + i
        sample = source[idx] if 0 <= idx < len(source) else 0.0
        grain.append(sample * window[i])
    return grain

def granular_synthesize(
    source: list[float],
    output_len: int,
    grain_size: int = 1024,
    grain_spacing: int = 256,   # 出力側でグレインを重ねる間隔(小さいほど密度が高い)
    read_speed: float = 1.0,    # 元音声内の読み出し位置が進む速度(<1で時間伸長、>1で時間短縮)
    jitter: int = 0,            # 読み出し位置のランダムな揺らぎ(サンプル数)
) -> list[float]:
    window = hann_window(grain_size)
    output = [0.0] * (output_len + grain_size)

    read_pos = 0.0
    out_pos = 0
    while out_pos < output_len:
        jittered_pos = int(read_pos) + random.randint(-jitter, jitter) if jitter else int(read_pos)
        grain = extract_grain(source, jittered_pos, grain_size, window)
        for i, s in enumerate(grain):
            output[out_pos + i] += s
        out_pos += grain_spacing
        read_pos += grain_spacing * read_speed

    return output[:output_len]
```

```typescript
function hannWindow(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++)
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  return w;
}

function extractGrain(
  source: Float64Array,
  position: number,
  grainSize: number,
  window: Float64Array,
): Float64Array {
  const grain = new Float64Array(grainSize);
  for (let i = 0; i < grainSize; i++) {
    const idx = position + i;
    const sample = idx >= 0 && idx < source.length ? source[idx] : 0;
    grain[i] = sample * window[i];
  }
  return grain;
}

function granularSynthesize(
  source: Float64Array,
  outputLen: number,
  grainSize = 1024,
  grainSpacing = 256, // 出力側でグレインを重ねる間隔(小さいほど密度が高い)
  readSpeed = 1.0, // 元音声内の読み出し位置が進む速度(<1で時間伸長、>1で時間短縮)
  jitter = 0, // 読み出し位置のランダムな揺らぎ(サンプル数)
): Float64Array {
  const window = hannWindow(grainSize);
  const output = new Float64Array(outputLen + grainSize);

  let readPos = 0;
  let outPos = 0;
  while (outPos < outputLen) {
    const offset = jitter ? Math.floor((Math.random() * 2 - 1) * jitter) : 0;
    const jitteredPos = Math.floor(readPos) + offset;
    const grain = extractGrain(source, jitteredPos, grainSize, window);
    for (let i = 0; i < grain.length; i++) output[outPos + i] += grain[i];
    outPos += grainSpacing;
    readPos += grainSpacing * readSpeed;
  }

  return output.slice(0, outputLen);
}
```
