import type { SignalFrame, SignalMeta } from "./signal-math.ts";
import {
  cepstralPitchDetectionSteps,
  linearPredictiveCodingSteps,
  mfccAnalysisSteps,
  pitchAutocorrelationSteps,
  shortTimeFourierTransformSteps,
} from "./signal-analysis.ts";
import {
  adpcmSteps,
  flacLosslessCodingSteps,
  mdctAudioCodingSteps,
  muLawCompandingSteps,
} from "./signal-codecs.ts";
import {
  biquadFilterSteps,
  chorusFlangerEffectSteps,
  convolutionReverbSteps,
  dynamicRangeCompressionSteps,
  granularSynthesisSteps,
  karplusStrongStringSynthesisSteps,
  noiseGateSteps,
  waveshapingDistortionSteps,
  wavetableSynthesisSteps,
} from "./signal-effects.ts";

export type { SignalFrame, SignalPanel, SignalMeta } from "./signal-math.ts";

/**
 * 「音響・信号処理」カテゴリの可視化レジストリ(kind = "signal")。
 * 波形・スペクトル・係数を縦に並べたパネル列として1フレームを表す(型は signal-math.ts)。
 * 計算は分析系 signal-analysis.ts・符号化系 signal-codecs.ts・エフェクト/合成系 signal-effects.ts に分けてある。
 */
export const SIGNAL_VISUALIZERS: Record<string, () => SignalFrame[]> = {
  "pitch-detection-autocorrelation": pitchAutocorrelationSteps,
  "short-time-fourier-transform": shortTimeFourierTransformSteps,
  "linear-predictive-coding": linearPredictiveCodingSteps,
  "cepstral-pitch-detection": cepstralPitchDetectionSteps,
  "mfcc-analysis": mfccAnalysisSteps,
  "mu-law-a-law-companding": muLawCompandingSteps,
  adpcm: adpcmSteps,
  "flac-lossless-coding": flacLosslessCodingSteps,
  "mdct-audio-coding": mdctAudioCodingSteps,
  "biquad-filter": biquadFilterSteps,
  "noise-gate": noiseGateSteps,
  "dynamic-range-compression": dynamicRangeCompressionSteps,
  "karplus-strong-string-synthesis": karplusStrongStringSynthesisSteps,
  "waveshaping-distortion": waveshapingDistortionSteps,
  "wavetable-synthesis": wavetableSynthesisSteps,
  "chorus-flanger-effect": chorusFlangerEffectSteps,
  "convolution-reverb": convolutionReverbSteps,
  "granular-synthesis": granularSynthesisSteps,
};

/** 画面上部のチップ(入力の条件)。 */
export const SIGNAL_META: Record<string, SignalMeta> = {
  "pitch-detection-autocorrelation": { chips: ["8kHz", "96サンプル", "基本周期24(333Hz)", "雑音あり"] },
  "short-time-fourier-transform": { chips: ["8kHz", "256サンプル", "窓64(ハン窓)", "ずらし幅16", "500Hz→1500Hz"] },
  "linear-predictive-coding": { chips: ["64サンプル", "予測次数4", "自己相関法+Levinson-Durbin"] },
  "cepstral-pitch-detection": { chips: ["8kHz", "128サンプル", "基本周期32(250Hz)", "倍音8本"] },
  "mfcc-analysis": { chips: ["8kHz", "128サンプル", "メルフィルタ10個", "MFCC 8係数"] },
  "mu-law-a-law-companding": { chips: ["μ=255", "5ビット量子化", "小さな音→大きな音"] },
  adpcm: { chips: ["IMA ADPCM", "16ビット→4ビット", "48サンプル"] },
  "flac-lossless-coding": { chips: ["固定予測0〜4次", "Rice符号", "48サンプル(16ビット)"] },
  "mdct-audio-coding": { chips: ["ブロック16", "正弦窓・半分重ね", "量子化幅0.6"] },
  "biquad-filter": { chips: ["8kHz", "ピーキングEQ", "500Hz・Q=2・+12dB"] },
  "noise-gate": { chips: ["開く>0.2", "閉じる<0.12", "ヒステリシスあり"] },
  "dynamic-range-compression": { chips: ["しきい値0.4", "比率 4:1", "アタック速・リリース遅"] },
  "karplus-strong-string-synthesis": { chips: ["遅延線32", "8kHz → 250Hz", "減衰0.998"] },
  "waveshaping-distortion": { chips: ["tanh(4x)", "奇数倍音", "64サンプル"] },
  "wavetable-synthesis": { chips: ["テーブル32点", "進み幅3.2", "線形補間"] },
  "chorus-flanger-effect": { chips: ["遅延 6±4 サンプル", "LFO周期64", "原音と1:1で混合"] },
  "convolution-reverb": { chips: ["音32サンプル", "応答24サンプル", "出力55サンプル"] },
  "granular-synthesis": { chips: ["粒24サンプル", "ずらし幅12", "8粒", "ハン窓"] },
};
