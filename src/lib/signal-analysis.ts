import { amplitudeSpectrum, dft, hannWindow, makeRng, panel, revealed, round, signalFrame, type SignalFrame } from "./signal-math.ts";

/**
 * 音響・信号処理: 分析系(ピッチ検出・STFT・LPC・ケプストラム・MFCC)。
 * どれも「入力波形 → 中間表現 → 取り出した特徴量」の流れを、実際の計算結果で1段ずつ見せる。
 */

// ---------------------------------------------------------------------------
// 自己相関法によるピッチ検出
// ---------------------------------------------------------------------------

export const AUTOCORR_FS = 8000;
export const AUTOCORR_PERIOD = 24;
export const AUTOCORR_N = 96;
export const AUTOCORR_MIN_LAG = 10;
export const AUTOCORR_MAX_LAG = 60;

/** 基本周期24サンプル(8kHzで約333Hz)の2倍音入り波形に、小さな雑音を足した入力。 */
export function autocorrInput(): number[] {
  const rand = makeRng(11);
  return Array.from(
    { length: AUTOCORR_N },
    (_, n) =>
      0.7 * Math.sin((2 * Math.PI * n) / AUTOCORR_PERIOD) +
      0.3 * Math.sin((4 * Math.PI * n) / AUTOCORR_PERIOD + 0.8) +
      0.06 * (rand() * 2 - 1),
  );
}

/** 自己相関 r[lag] = Σ x[n]·x[n+lag] を r[0] で割って [-1,1] に正規化したもの(lag=0..maxLag)。 */
export function autocorrNormalized(x: readonly number[], maxLag: number): number[] {
  const r: number[] = [];
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    for (let n = 0; n + lag < x.length; n++) sum += x[n] * x[n + lag];
    r.push(sum);
  }
  return r.map((v) => v / r[0]);
}

export function pitchAutocorrelationSteps(): SignalFrame[] {
  const x = autocorrInput();
  const n = x.length;
  const r = autocorrNormalized(x, AUTOCORR_MAX_LAG);
  const frames: SignalFrame[] = [];
  const signalPanel = (lag: number | null) =>
    panel("signal", "入力波形 x[n](薄い線は lag だけずらした自分自身)", x, {
      range: [-1.2, 1.2],
      reference: lag === null ? undefined : x.map((_, i) => (i + lag < n ? x[i + lag] : Number.NaN)),
      markers: lag === null || lag === 0 ? undefined : [{ index: n - 1 - lag, label: "重なりの終端" }],
      xLabel: "サンプル番号 n",
    });
  const acfPanel = (count: number, highlight: Partial<Record<number, "comparing" | "pivot" | "settled">>) =>
    panel("acf", "自己相関 r[lag](r[0]=1 で正規化)", revealed(r, count), {
      style: "stem",
      range: [-1, 1],
      highlight,
      xLabel: "ラグ lag(サンプル)",
    });

  frames.push(
    signalFrame(
      `初期状態: 周期的な波形の「繰り返しの周期」を探す(サンプリング周波数 ${AUTOCORR_FS}Hz)。自分自身を少しずらして重ねたとき、どれだけ似ているかを測る`,
      signalPanel(null),
      acfPanel(0, {}),
    ),
  );
  for (let lag = 0; lag <= AUTOCORR_MAX_LAG; lag++) {
    frames.push(
      signalFrame(
        lag === 0
          ? `lag=0: ずらさず重ねる。自分自身との積の総和が最大で、基準 r[0]=1 になる`
          : `lag=${lag}: ${lag}サンプルずらして重ね、積の総和を取る → r=${round(r[lag])}`,
        signalPanel(lag),
        acfPanel(lag + 1, { [lag]: "comparing" }),
      ),
    );
  }

  const peaks: number[] = [];
  for (let lag = AUTOCORR_MIN_LAG; lag < AUTOCORR_MAX_LAG; lag++) {
    if (r[lag] > r[lag - 1] && r[lag] >= r[lag + 1] && r[lag] > 0) peaks.push(lag);
  }
  const best = bestAutocorrLag(r);
  frames.push(
    signalFrame(
      `ラグ${AUTOCORR_MIN_LAG}〜${AUTOCORR_MAX_LAG}にある山(正の局所ピーク)を拾う: ${peaks.join(", ")}。周期の整数倍にも山ができる`,
      signalPanel(null),
      acfPanel(AUTOCORR_MAX_LAG + 1, Object.fromEntries(peaks.map((lag) => [lag, "pivot" as const]))),
    ),
  );
  frames.push(
    signalFrame(
      `最も高い山はlag=${best}(r=${round(r[best])})。基本周波数 = ${AUTOCORR_FS} / ${best} ≒ ${round(AUTOCORR_FS / best, 1)}Hz`,
      signalPanel(best),
      acfPanel(AUTOCORR_MAX_LAG + 1, { [best]: "settled" }),
    ),
  );
  return frames;
}

/** 探索範囲[MIN_LAG, MAX_LAG]で r が最大のラグ(同値なら小さいラグ)。 */
export function bestAutocorrLag(r: readonly number[]): number {
  let best = AUTOCORR_MIN_LAG;
  for (let lag = AUTOCORR_MIN_LAG; lag <= AUTOCORR_MAX_LAG; lag++) if (r[lag] > r[best]) best = lag;
  return best;
}

// ---------------------------------------------------------------------------
// 短時間フーリエ変換(STFT)
// ---------------------------------------------------------------------------

export const STFT_FS = 8000;
export const STFT_N = 256;
export const STFT_WIN = 64;
export const STFT_HOP = 16;
export const STFT_SWITCH = 128;

/** 前半は500Hz、後半は1500Hzの正弦波(途中で音程が変わる信号)。 */
export function stftInput(): number[] {
  return Array.from({ length: STFT_N }, (_, i) =>
    0.8 * Math.sin(2 * Math.PI * (i < STFT_SWITCH ? 500 : 1500) * (i / STFT_FS)),
  );
}

/** 窓の先頭位置sで切り出してハン窓をかけ、振幅スペクトル(0..WIN/2)を返す。ハン窓の利得0.5を補正して2倍する。 */
export function stftSpectrumAt(x: readonly number[], start: number): number[] {
  const hann = hannWindow(STFT_WIN);
  const seg = Array.from({ length: STFT_WIN }, (_, i) => x[start + i] * hann[i]);
  return amplitudeSpectrum(seg).map((v) => v * 2);
}

export function stftPeakBin(spectrum: readonly number[]): number {
  let best = 1;
  for (let k = 1; k < spectrum.length; k++) if (spectrum[k] > spectrum[best]) best = k;
  return best;
}

export function shortTimeFourierTransformSteps(): SignalFrame[] {
  const x = stftInput();
  const hann = hannWindow(STFT_WIN);
  const starts: number[] = [];
  for (let s = 0; s + STFT_WIN <= STFT_N; s += STFT_HOP) starts.push(s);
  const bins = STFT_WIN / 2 + 1;
  const track: number[] = starts.map((s) => stftPeakBin(stftSpectrumAt(x, s)));
  const frames: SignalFrame[] = [];
  const signalPanel = (start: number | null) =>
    panel("signal", `入力波形(前半 500Hz → 後半 1500Hz、窓の長さ${STFT_WIN}・ずらし幅${STFT_HOP})`, x, {
      range: [-1, 1],
      markers:
        start === null
          ? [{ index: STFT_SWITCH, label: "音程が変わる" }]
          : [
              { index: start, label: "窓の始点" },
              { index: start + STFT_WIN - 1, label: "終点" },
            ],
      xLabel: "サンプル番号 n",
    });
  const windowedPanel = (start: number | null) =>
    panel(
      "windowed",
      "窓をかけた区間(ハン窓で両端を0に絞る)",
      start === null ? new Array<number>(STFT_WIN).fill(Number.NaN) : hann.map((w, i) => x[start + i] * w),
      { range: [-1, 1], xLabel: "窓内の位置" },
    );
  const spectrumPanel = (start: number | null) => {
    const spectrum = start === null ? new Array<number>(bins).fill(Number.NaN) : stftSpectrumAt(x, start);
    return panel("spectrum", "この窓のスペクトル(振幅)", spectrum, {
      style: "stem",
      range: [0, 1],
      highlight: start === null ? {} : { [stftPeakBin(spectrum)]: "pivot" },
      xLabel: `周波数ビン(1ビン=${STFT_FS / STFT_WIN}Hz)`,
    });
  };
  const trackPanel = (count: number, settledIndex: number | null) =>
    panel("track", "窓ごとのピーク周波数ビンの軌跡(スペクトログラムの稜線)", revealed(track, count), {
      style: "stem",
      range: [0, STFT_WIN / 2],
      highlight: settledIndex === null ? {} : { [settledIndex]: "settled" },
      xLabel: "窓の番号(時間)",
    });

  frames.push(
    signalFrame(
      `初期状態: 全体を1回でフーリエ変換すると「いつ・どの音か」が分からない。短い窓を少しずつずらして、窓ごとにスペクトルを求める`,
      signalPanel(null),
      windowedPanel(null),
      spectrumPanel(null),
      trackPanel(0, null),
    ),
  );
  starts.forEach((start, w) => {
    frames.push(
      signalFrame(
        `窓${w + 1}/${starts.length}: n=${start}〜${start + STFT_WIN - 1} を切り出し、ハン窓をかける(端の不連続によるスペクトルの漏れを抑える)`,
        signalPanel(start),
        windowedPanel(start),
        spectrumPanel(null),
        trackPanel(w, null),
      ),
    );
    const bin = track[w];
    frames.push(
      signalFrame(
        `窓${w + 1}/${starts.length}: DFTでスペクトルにすると、ピークはビン${bin} = ${bin * (STFT_FS / STFT_WIN)}Hz`,
        signalPanel(start),
        windowedPanel(start),
        spectrumPanel(start),
        trackPanel(w + 1, w),
      ),
    );
  });
  return frames;
}

// ---------------------------------------------------------------------------
// 線形予測符号化(LPC)
// ---------------------------------------------------------------------------

export const LPC_N = 64;
export const LPC_ORDER = 4;

/** 2極の共振(声道のモデル)を、16サンプルごとのパルス列(声帯)で駆動した波形。 */
export function lpcInput(): number[] {
  const rand = makeRng(5);
  const x: number[] = [];
  for (let n = 0; n < LPC_N; n++) {
    const excitation = (n % 16 === 0 ? 1 : 0) + 0.01 * (rand() * 2 - 1);
    x.push(excitation + 1.6 * (x[n - 1] ?? 0) - 0.9 * (x[n - 2] ?? 0));
  }
  return x;
}

export function lpcAutocorrelation(x: readonly number[], order: number): number[] {
  const r: number[] = [];
  for (let lag = 0; lag <= order; lag++) {
    let sum = 0;
    for (let n = 0; n + lag < x.length; n++) sum += x[n] * x[n + lag];
    r.push(sum);
  }
  return r;
}

/** Levinson-Durbin。予測係数 c[1..m]( x̂[n] = Σ c_i·x[n-i] )と予測誤差エネルギーを次数1から順に返す。 */
export function levinsonDurbin(r: readonly number[], order: number): { coefs: number[]; error: number; k: number }[] {
  const steps: { coefs: number[]; error: number; k: number }[] = [];
  let c: number[] = [];
  let error = r[0];
  for (let m = 1; m <= order; m++) {
    let acc = r[m];
    for (let i = 1; i < m; i++) acc -= c[i - 1] * r[m - i];
    const k = acc / error;
    const next = new Array<number>(m).fill(0);
    for (let i = 1; i < m; i++) next[i - 1] = c[i - 1] - k * c[m - i - 1];
    next[m - 1] = k;
    c = next;
    error *= 1 - k * k;
    steps.push({ coefs: [...c], error, k });
  }
  return steps;
}

export function lpcPredict(x: readonly number[], coefs: readonly number[]): number[] {
  const p = coefs.length;
  return x.map((_, n) => {
    if (n < p) return Number.NaN;
    let sum = 0;
    for (let i = 1; i <= p; i++) sum += coefs[i - 1] * x[n - i];
    return sum;
  });
}

export function linearPredictiveCodingSteps(): SignalFrame[] {
  const x = lpcInput();
  const r = lpcAutocorrelation(x, LPC_ORDER);
  const steps = levinsonDurbin(r, LPC_ORDER);
  const finalCoefs = steps[steps.length - 1].coefs;
  const pred = lpcPredict(x, finalCoefs);
  const residual = x.map((v, n) => (Number.isFinite(pred[n]) ? v - pred[n] : Number.NaN));
  const peak = Math.max(...x.map((v) => Math.abs(v)));
  const frames: SignalFrame[] = [];
  const sig = (reference?: number[]) =>
    panel("signal", "声のフレーム x[n](薄い線は予測 x̂[n])", x, { range: [-peak, peak], reference, xLabel: "サンプル番号 n" });
  const acf = (count: number, highlight: Partial<Record<number, "comparing" | "settled">>) =>
    panel("acf", "自己相関 r[0..p](予測係数を決める材料)", revealed(r.map((v) => v / r[0]), count), {
      style: "stem",
      range: [-1, 1],
      highlight,
      xLabel: "ラグ",
    });
  const coef = (values: readonly number[], highlight: Partial<Record<number, "pivot" | "settled">>) =>
    panel("coefs", "予測係数 c_i(過去の何倍を足すか)", values, {
      style: "stem",
      range: [-2, 2],
      highlight,
      xLabel: "係数の番号 i(1..p)",
    });
  const blank = new Array<number>(LPC_ORDER).fill(Number.NaN);

  frames.push(
    signalFrame(
      `初期状態: 声は「過去の数サンプルの重み付き和」でかなり予測できる。その重み(予測係数)を ${LPC_ORDER} 個だけ送れば、波形の形を表せる`,
      sig(),
      acf(0, {}),
      coef(blank, {}),
    ),
  );
  for (let lag = 0; lag <= LPC_ORDER; lag++) {
    frames.push(
      signalFrame(
        `自己相関 r[${lag}] = Σ x[n]·x[n+${lag}] = ${round(r[lag], 1)}`,
        sig(),
        acf(lag + 1, { [lag]: "comparing" }),
        coef(blank, {}),
      ),
    );
  }
  steps.forEach((step, index) => {
    const m = index + 1;
    frames.push(
      signalFrame(
        `Levinson-Durbin 次数${m}: 反射係数 k=${round(step.k, 3)} で係数を更新。予測誤差エネルギーは前の次数の ${round(1 - step.k * step.k, 3)} 倍 → ${round(step.error, 1)}`,
        sig(),
        acf(LPC_ORDER + 1, {}),
        coef(
          Array.from({ length: LPC_ORDER }, (_, i) => (i < m ? step.coefs[i] : Number.NaN)),
          { [m - 1]: "pivot" },
        ),
      ),
    );
  });
  const predictionGain = (x.slice(LPC_ORDER).reduce((s, v) => s + v * v, 0)) /
    residual.slice(LPC_ORDER).reduce((s, v) => s + v * v, 0);
  frames.push(
    signalFrame(
      `係数 [${finalCoefs.map((c) => round(c, 2)).join(", ")}] で予測した波形(薄い線)は元の波形にほぼ重なる。残差のエネルギーは元の 1/${round(predictionGain, 1)}`,
      sig(pred),
      panel("residual", "残差 e[n] = x[n] − x̂[n](これと係数だけを送る)", residual, {
        range: [-peak, peak],
        highlight: {},
        xLabel: "サンプル番号 n",
      }),
      coef(finalCoefs, Object.fromEntries(finalCoefs.map((_, i) => [i, "settled" as const]))),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// ケプストラム分析によるピッチ検出
// ---------------------------------------------------------------------------

export const CEPSTRUM_FS = 8000;
export const CEPSTRUM_N = 128;
export const CEPSTRUM_PERIOD = 32;
export const CEPSTRUM_MIN_Q = 8;
export const CEPSTRUM_MAX_Q = 64;
const CEPSTRUM_EPS = 1e-3;

/** 基本周期32サンプル(250Hz)で、倍音が 1/h で減衰する声のような波形。小さな雑音つき。 */
export function cepstrumInput(): number[] {
  const rand = makeRng(21);
  return Array.from({ length: CEPSTRUM_N }, (_, n) => {
    let v = 0;
    for (let h = 1; h <= 8; h++) v += Math.sin((2 * Math.PI * h * n) / CEPSTRUM_PERIOD) / h;
    return 0.4 * v + 0.01 * (rand() * 2 - 1);
  });
}

/** 対数振幅スペクトル(0..N/2)とケプストラム c[q] = IDFT(log|X|)(q=0..N/2)。 */
export function cepstrumOf(windowed: readonly number[]): { logSpectrum: number[]; cepstrum: number[] } {
  const n = windowed.length;
  const { re, im } = dft(windowed);
  const half = n / 2;
  const logFull = Array.from({ length: n }, (_, k) => Math.log(Math.hypot(re[k], im[k]) + CEPSTRUM_EPS));
  const cepstrum = Array.from({ length: half + 1 }, (_, q) => {
    let sum = 0;
    for (let k = 0; k < n; k++) sum += logFull[k] * Math.cos((2 * Math.PI * k * q) / n);
    return sum / n;
  });
  return { logSpectrum: logFull.slice(0, half + 1), cepstrum };
}

export function bestQuefrency(cepstrum: readonly number[]): number {
  let best = CEPSTRUM_MIN_Q;
  for (let q = CEPSTRUM_MIN_Q; q <= CEPSTRUM_MAX_Q; q++) if (cepstrum[q] > cepstrum[best]) best = q;
  return best;
}

export function cepstralPitchDetectionSteps(): SignalFrame[] {
  const x = cepstrumInput();
  const hann = hannWindow(CEPSTRUM_N);
  const windowed = x.map((v, i) => v * hann[i]);
  const { logSpectrum, cepstrum } = cepstrumOf(windowed);
  const best = bestQuefrency(cepstrum);
  const half = CEPSTRUM_N / 2;
  const logMin = Math.floor(Math.min(...logSpectrum));
  const logMax = Math.ceil(Math.max(...logSpectrum));
  /** q=0 は対数スペクトル全体の平均(音の大きさ)で、他と桁が違うため描かない。 */
  const shown = cepstrum.map((v, q) => (q === 0 ? Number.NaN : v));
  const cMax = Math.max(...cepstrum.slice(1).map(Math.abs)) * 1.1;
  const frames: SignalFrame[] = [];
  const sig = (values: readonly number[], title: string) =>
    panel("signal", title, values, { range: [-1.5, 1.5], xLabel: "サンプル番号 n" });
  const logPanel = (reveal: boolean) =>
    panel("logspec", "対数振幅スペクトル log|X[k]|(倍音が櫛のように並ぶ)", reveal ? logSpectrum : logSpectrum.map(() => Number.NaN), {
      style: "stem",
      range: [logMin, logMax],
      xLabel: "周波数ビン k",
    });
  const cepPanel = (count: number, highlight: Partial<Record<number, "comparing" | "pivot" | "settled">>) =>
    panel("cepstrum", "ケプストラム c[q](櫛の間隔 = 周期。q=0は全体の大きさなので除く)", revealed(shown, count), {
      style: "stem",
      range: [-cMax, cMax],
      highlight,
      xLabel: "ケフレンシー q(サンプル=時間の次元)",
    });

  frames.push(
    signalFrame(
      `初期状態: 声のスペクトルは「倍音の櫛」の形をしている。その櫛の間隔こそがピッチ。スペクトルをもう一度フーリエ変換すると、間隔が1本のピークになる`,
      sig(x, "入力波形(基本周期32サンプル)"),
      logPanel(false),
      cepPanel(0, {}),
    ),
  );
  frames.push(
    signalFrame(
      `ハン窓をかけて両端を絞る(スペクトルの漏れを抑える)`,
      sig(windowed, "ハン窓をかけた波形"),
      logPanel(false),
      cepPanel(0, {}),
    ),
  );
  frames.push(
    signalFrame(
      `DFTして振幅の対数を取る。掛け算(声帯の倍音 × 声道の包絡)が足し算に変わり、倍音の櫛が見えやすくなる`,
      sig(windowed, "ハン窓をかけた波形"),
      logPanel(true),
      cepPanel(0, {}),
    ),
  );
  const chunk = 4;
  for (let upto = chunk; upto <= half + chunk; upto += chunk) {
    const count = Math.min(upto, half + 1);
    frames.push(
      signalFrame(
        `対数スペクトルを逆変換してケプストラムを作る: q=0〜${count - 1} まで計算済み`,
        sig(windowed, "ハン窓をかけた波形"),
        logPanel(true),
        cepPanel(count, { [count - 1]: "comparing" }),
      ),
    );
  }
  frames.push(
    signalFrame(
      `q=${CEPSTRUM_MIN_Q}〜${CEPSTRUM_MAX_Q}で最大のピークはq=${best}。基本周波数 = ${CEPSTRUM_FS} / ${best} = ${round(CEPSTRUM_FS / best, 1)}Hz(小さいqは声道の包絡なので除外)`,
      sig(windowed, "ハン窓をかけた波形"),
      logPanel(true),
      cepPanel(half + 1, { [best]: "settled" }),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// MFCC(メル周波数ケプストラム係数)
// ---------------------------------------------------------------------------

export const MFCC_FS = 8000;
export const MFCC_N = 128;
export const MFCC_FILTERS = 10;
export const MFCC_COEFS = 8;

export function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}
export function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

/** 125Hzごとの倍音を、300Hzと2200Hz付近に山を持つ包絡(母音のフォルマント)で重み付けした入力。 */
export function mfccInput(): number[] {
  return Array.from({ length: MFCC_N }, (_, n) => {
    let v = 0;
    for (let h = 1; h <= 30; h++) {
      const f = h * 125;
      const envelope = Math.exp(-Math.pow((f - 300) / 250, 2)) + 0.6 * Math.exp(-Math.pow((f - 2200) / 500, 2));
      v += envelope * Math.sin((2 * Math.PI * f * n) / MFCC_FS);
    }
    return v * 0.25;
  });
}

/** 三角形のメルフィルタバンク。filters[m][k] = ビンk(周波数 k·fs/N)でのフィルタmの重み。 */
export function melFilterbank(bins: number, fftSize: number, fs: number, count: number): number[][] {
  const melMax = hzToMel(fs / 2);
  const points = Array.from({ length: count + 2 }, (_, i) => melToHz((melMax * i) / (count + 1)));
  return Array.from({ length: count }, (_, m) =>
    Array.from({ length: bins }, (_, k) => {
      const f = (k * fs) / fftSize;
      const [lo, mid, hi] = [points[m], points[m + 1], points[m + 2]];
      if (f <= lo || f >= hi) return 0;
      return f <= mid ? (f - lo) / (mid - lo) : (hi - f) / (hi - mid);
    }),
  );
}

export function mfccOf(x: readonly number[]): {
  power: number[];
  energies: number[];
  logEnergies: number[];
  mfcc: number[];
  filters: number[][];
} {
  const n = x.length;
  const hann = hannWindow(n);
  const { re, im } = dft(x.map((v, i) => v * hann[i]));
  const bins = n / 2 + 1;
  const power = Array.from({ length: bins }, (_, k) => (re[k] * re[k] + im[k] * im[k]) / n);
  const filters = melFilterbank(bins, n, MFCC_FS, MFCC_FILTERS);
  const energies = filters.map((f) => f.reduce((s, w, k) => s + w * power[k], 0));
  const logEnergies = energies.map((e) => Math.log(e + 1e-9));
  const mfcc = Array.from({ length: MFCC_COEFS }, (_, c) =>
    logEnergies.reduce((s, v, m) => s + v * Math.cos((Math.PI * c * (m + 0.5)) / MFCC_FILTERS), 0),
  );
  return { power, energies, logEnergies, mfcc, filters };
}

export function mfccAnalysisSteps(): SignalFrame[] {
  const x = mfccInput();
  const { power, logEnergies, mfcc, filters } = mfccOf(x);
  const powerMax = Math.max(...power);
  const normPower = power.map((v) => v / powerMax);
  const logMin = Math.floor(Math.min(...logEnergies));
  const logMax = Math.ceil(Math.max(...logEnergies));
  const mfccMax = Math.ceil(Math.max(...mfcc.map(Math.abs)));
  const frames: SignalFrame[] = [];
  const spec = (filterIndex: number | null) =>
    panel("power", "パワースペクトル(最大で正規化)と、いま使うメルフィルタ(薄い線)", normPower, {
      style: "stem",
      range: [0, 1],
      reference: filterIndex === null ? undefined : filters[filterIndex],
      xLabel: `周波数ビン(1ビン=${MFCC_FS / MFCC_N}Hz)`,
    });
  const bank = (count: number, current: number | null) =>
    panel("logmel", "メルフィルタ出力の対数 log E_m(低域ほど細かく見る)", revealed(logEnergies, count), {
      style: "stem",
      range: [logMin, logMax],
      highlight: current === null ? {} : { [current]: "comparing" },
      xLabel: "フィルタの番号 m(低域→高域)",
    });
  const coefPanel = (count: number, current: number | null, done: boolean) =>
    panel("mfcc", "MFCC c_k(対数メル出力をDCTして、声道の形だけを残す)", revealed(mfcc, count), {
      style: "stem",
      range: [-mfccMax, mfccMax],
      highlight: current === null ? {} : { [current]: done ? "settled" : "comparing" },
      xLabel: "係数の番号 k",
    });

  frames.push(
    signalFrame(
      `初期状態: 人の耳は低い音の違いに敏感で、高い音の違いには鈍い。周波数をメル尺度で粗く束ね、声の特徴を数個の数値に圧縮する`,
      panel("signal", "音声フレーム(母音のような倍音列)", x, { range: [-Math.ceil(Math.max(...x.map(Math.abs))), Math.ceil(Math.max(...x.map(Math.abs)))], xLabel: "サンプル番号 n" }),
      spec(null),
      bank(0, null),
      coefPanel(0, null, false),
    ),
  );
  const signalPanel = panel("signal", "音声フレーム(母音のような倍音列)", x, {
    range: [-Math.ceil(Math.max(...x.map(Math.abs))), Math.ceil(Math.max(...x.map(Math.abs)))],
    xLabel: "サンプル番号 n",
  });
  frames.push(
    signalFrame(`ハン窓をかけてDFTし、パワースペクトル |X[k]|²/N を求める`, signalPanel, spec(null), bank(0, null), coefPanel(0, null, false)),
  );
  for (let m = 0; m < MFCC_FILTERS; m++) {
    frames.push(
      signalFrame(
        `メルフィルタ${m + 1}/${MFCC_FILTERS}: スペクトルに三角形の重みを掛けて足し、対数を取る → ${round(logEnergies[m])}`,
        signalPanel,
        spec(m),
        bank(m + 1, m),
        coefPanel(0, null, false),
      ),
    );
  }
  for (let c = 0; c < MFCC_COEFS; c++) {
    frames.push(
      signalFrame(
        c === 0
          ? `DCT: c_0 は全体の音量(対数エネルギーの和) = ${round(mfcc[0])}`
          : `DCT: c_${c} は対数メル出力の${c}周期分のうねり成分 = ${round(mfcc[c])}。低次ほど声道の大まかな形を表す`,
        signalPanel,
        spec(null),
        bank(MFCC_FILTERS, null),
        coefPanel(c + 1, c, c === MFCC_COEFS - 1),
      ),
    );
  }
  return frames;
}
