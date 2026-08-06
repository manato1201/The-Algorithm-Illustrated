export type CharState = "idle" | "matching" | "mismatch" | "matched";

export type StringMatchFrame = {
  text: string;
  pattern: string;
  textHighlight: Partial<Record<number, CharState>>;
  /** パターンをテキストの何文字目に整列させて表示するか。 */
  patternOffset: number;
  patternHighlight: Partial<Record<number, CharState>>;
  description: string;
};

/**
 * 3アルゴリズム共通のテキスト・パターン(CLRSの教科書的な例)。
 * "ABABCABAB" は "ABABDABACDABABCABAB" の位置10にちょうど1回だけ現れる。
 */
export const TEXT = "ABABDABACDABABCABAB";
export const PATTERN = "ABABCABAB";

function computeLPS(pattern: string): number[] {
  const lps = new Array(pattern.length).fill(0);
  let len = 0;
  let i = 1;
  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) {
      len++;
      lps[i] = len;
      i++;
    } else if (len > 0) {
      len = lps[len - 1];
    } else {
      lps[i] = 0;
      i++;
    }
  }
  return lps;
}

/**
 * KMP法(Knuth-Morris-Pratt法)のステップ列を生成する。
 * 失敗関数(LPS配列)を事前計算しておくことで、不一致時にテキスト側を巻き戻さずに
 * パターン側だけを賢くスキップできる(既に一致していた部分を再比較しない)。
 */
export function kmpSteps(): StringMatchFrame[] {
  const text = TEXT;
  const pattern = PATTERN;
  const lps = computeLPS(pattern);
  const frames: StringMatchFrame[] = [];

  frames.push({
    text,
    pattern,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `失敗関数(LPS配列)を事前計算: [${lps.join(",")}]`,
  });

  let i = 0;
  let j = 0;
  while (i < text.length) {
    const textHighlight: Partial<Record<number, CharState>> = {};
    for (let k = i - j; k < i; k++) textHighlight[k] = "matched";
    textHighlight[i] = "matching";
    const patternHighlight: Partial<Record<number, CharState>> = {};
    for (let k = 0; k < j; k++) patternHighlight[k] = "matched";
    patternHighlight[j] = "matching";

    frames.push({
      text,
      pattern,
      textHighlight,
      patternOffset: i - j,
      patternHighlight,
      description: `text[${i}]="${text[i]}" と pattern[${j}]="${pattern[j]}" を比較`,
    });

    if (text[i] === pattern[j]) {
      i++;
      j++;
      if (j === pattern.length) {
        const matchHighlight: Partial<Record<number, CharState>> = {};
        for (let k = i - j; k < i; k++) matchHighlight[k] = "matched";
        frames.push({
          text,
          pattern,
          textHighlight: matchHighlight,
          patternOffset: i - j,
          patternHighlight: {},
          description: `位置${i - j}で完全一致を発見`,
        });
        j = lps[j - 1];
      }
    } else if (j > 0) {
      frames.push({
        text,
        pattern,
        textHighlight: { [i]: "mismatch" },
        patternOffset: i - j,
        patternHighlight: { [j]: "mismatch" },
        description: `不一致。失敗関数によりpatternの比較位置をj=${lps[j - 1]}へスキップ(textは巻き戻さない)`,
      });
      j = lps[j - 1];
    } else {
      frames.push({
        text,
        pattern,
        textHighlight: { [i]: "mismatch" },
        patternOffset: i - j,
        patternHighlight: { [j]: "mismatch" },
        description: "不一致。パターンの先頭から再比較",
      });
      i++;
    }
  }

  frames.push({ text, pattern, textHighlight: {}, patternOffset: 0, patternHighlight: {}, description: "探索完了" });
  return frames;
}

/**
 * ラビン-カープ法のステップ列を生成する。
 * パターンと各窓のハッシュ値をローリングハッシュで比較し、一致した場合のみ1文字ずつ検証する
 * (ハッシュが一致しても実際の文字列は一致しないハッシュ衝突がありうるため)。
 */
export function rabinKarpSteps(): StringMatchFrame[] {
  const text = TEXT;
  const pattern = PATTERN;
  const n = text.length;
  const m = pattern.length;
  const BASE = 256;
  const MOD = 101;

  const frames: StringMatchFrame[] = [];

  let patternHash = 0;
  let textHash = 0;
  let h = 1;
  for (let i = 0; i < m - 1; i++) h = (h * BASE) % MOD;

  for (let i = 0; i < m; i++) {
    patternHash = (BASE * patternHash + pattern.charCodeAt(i)) % MOD;
    textHash = (BASE * textHash + text.charCodeAt(i)) % MOD;
  }

  frames.push({
    text,
    pattern,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `パターンのハッシュ値${patternHash}を計算`,
  });

  for (let i = 0; i <= n - m; i++) {
    const windowHighlight: Partial<Record<number, CharState>> = {};
    for (let k = i; k < i + m; k++) windowHighlight[k] = "matching";

    if (textHash === patternHash) {
      let match = true;
      const verifyHighlight: Partial<Record<number, CharState>> = {};
      for (let k = 0; k < m; k++) {
        if (text[i + k] !== pattern[k]) {
          match = false;
          break;
        }
        verifyHighlight[i + k] = "matched";
      }
      frames.push({
        text,
        pattern,
        textHighlight: match ? verifyHighlight : { ...windowHighlight, [i]: "mismatch" },
        patternOffset: i,
        patternHighlight: {},
        description: `窓[${i}, ${i + m - 1}]のハッシュ値がパターンと一致(${textHash}) → 1文字ずつ照合${match ? " → 完全一致を発見" : " → ハッシュ衝突と判明、実際は不一致"}`,
      });
    } else {
      frames.push({
        text,
        pattern,
        textHighlight: windowHighlight,
        patternOffset: i,
        patternHighlight: {},
        description: `窓[${i}, ${i + m - 1}]のハッシュ値${textHash}はパターンのハッシュ値${patternHash}と不一致 → 文字比較なしでスキップ`,
      });
    }

    if (i < n - m) {
      textHash = (BASE * (textHash - text.charCodeAt(i) * h) + text.charCodeAt(i + m)) % MOD;
      if (textHash < 0) textHash += MOD;
    }
  }

  frames.push({ text, pattern, textHighlight: {}, patternOffset: 0, patternHighlight: {}, description: "探索完了" });
  return frames;
}

/**
 * Z algorithmのステップ列を生成する。
 * "パターン + 区切り文字 + テキスト" を連結した文字列のZ配列(各位置から始まる、
 * 文字列全体の接頭辞と一致する最長区間の長さ)を線形時間で計算し、
 * Z値がパターン長と等しくなる位置がそのままテキスト中の一致位置になる。
 */
export function zAlgorithmSteps(): StringMatchFrame[] {
  const text = TEXT;
  const pattern = PATTERN;
  const combined = `${pattern}$${text}`;
  const n = combined.length;
  const z = new Array(n).fill(0);
  const frames: StringMatchFrame[] = [];
  const textStart = pattern.length + 1;

  frames.push({
    text,
    pattern,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `"パターン + 区切り文字 + テキスト"を連結したZ配列を計算する`,
  });

  let l = 0;
  let r = 0;
  for (let i = 1; i < n; i++) {
    if (i < r) {
      z[i] = Math.min(r - i, z[i - l]);
    }
    while (i + z[i] < n && combined[z[i]] === combined[i + z[i]]) {
      z[i]++;
    }
    if (i + z[i] > r) {
      l = i;
      r = i + z[i];
    }

    const textIndex = i - textStart;
    if (textIndex < 0) continue;

    if (z[i] === pattern.length) {
      const highlight: Partial<Record<number, CharState>> = {};
      for (let k = textIndex; k < textIndex + pattern.length; k++) highlight[k] = "matched";
      frames.push({
        text,
        pattern,
        textHighlight: highlight,
        patternOffset: textIndex,
        patternHighlight: {},
        description: `Z[${i}]=${z[i]}(パターン長と一致) → 位置${textIndex}で完全一致を発見`,
      });
    } else {
      const highlight: Partial<Record<number, CharState>> = {};
      for (let k = textIndex; k < textIndex + z[i] && k < text.length; k++) highlight[k] = "matching";
      frames.push({
        text,
        pattern,
        textHighlight: highlight,
        patternOffset: Math.max(0, textIndex),
        patternHighlight: {},
        description: `Z[${i}]=${z[i]}(位置${textIndex}からパターンと共通する接頭辞の長さ)`,
      });
    }
  }

  frames.push({ text, pattern, textHighlight: {}, patternOffset: 0, patternHighlight: {}, description: "探索完了" });
  return frames;
}

function buildBadCharTable(pattern: string): Map<string, number> {
  const table = new Map<string, number>();
  for (let i = 0; i < pattern.length; i++) {
    table.set(pattern[i], i);
  }
  return table;
}

/**
 * ボイヤー・ムーア法(不良文字則のみの簡略版)のステップ列を生成する。
 * パターンを右から左へ比較していき、不一致が起きた文字がパターン内のどこに最後に現れるかを見て、
 * 一気に複数文字分パターンをスキップする(他のアルゴリズムが左から1文字ずつ進むのと対照的)。
 * 実際のボイヤー・ムーア法はさらに「good suffix則」も併用するが、このデモでは不良文字則のみに絞っている。
 */
export function boyerMooreSteps(): StringMatchFrame[] {
  const text = TEXT;
  const pattern = PATTERN;
  const m = pattern.length;
  const n = text.length;
  const badChar = buildBadCharTable(pattern);
  const frames: StringMatchFrame[] = [];

  frames.push({
    text,
    pattern,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: "不良文字則(各文字がパターン内で最後に現れる位置)の表を事前計算",
  });

  let s = 0;
  while (s <= n - m) {
    let j = m - 1;
    const matchedSoFar: Partial<Record<number, CharState>> = {};
    while (j >= 0 && pattern[j] === text[s + j]) {
      matchedSoFar[s + j] = "matching";
      j--;
    }

    if (j < 0) {
      const matchHighlight: Partial<Record<number, CharState>> = {};
      for (let k = s; k < s + m; k++) matchHighlight[k] = "matched";
      frames.push({
        text,
        pattern,
        textHighlight: matchHighlight,
        patternOffset: s,
        patternHighlight: {},
        description: `位置${s}で完全一致を発見(パターンを右端から左へ辿って全て一致)`,
      });
      s += 1;
    } else {
      frames.push({
        text,
        pattern,
        textHighlight: { ...matchedSoFar, [s + j]: "mismatch" },
        patternOffset: s,
        patternHighlight: { [j]: "mismatch" },
        description: `右からpattern[${j}]="${pattern[j]}"とtext[${s + j}]="${text[s + j]}"が不一致`,
      });
      const lastOcc = badChar.get(text[s + j]) ?? -1;
      const shift = Math.max(1, j - lastOcc);
      s += shift;
      frames.push({
        text,
        pattern,
        textHighlight: {},
        patternOffset: s,
        patternHighlight: {},
        description: `不良文字則により${shift}文字分パターンをスキップ`,
      });
    }
  }

  frames.push({ text, pattern, textHighlight: {}, patternOffset: 0, patternHighlight: {}, description: "探索完了" });
  return frames;
}

export const RLE_INPUT = "AAABBBCCDAA";

/**
 * ランレングス符号化(RLE)のステップ列を生成する。同じ文字が連続する区間(ラン)を
 * 「文字とその連続回数」の組に置き換えるだけの、最も単純な可逆圧縮。
 * 同じ値が連続しやすいデータ(単色が多い画像、繰り返しの多いログ等)では大きな圧縮率を
 * 発揮するが、ランダムな(連続の少ない)データではむしろ膨張することもある
 * ——「データの性質に合った圧縮手法を選ぶ」ことの重要性を体感できる最小の例。
 * text/pattern行を持つStringMatchVisualizerを、text=入力・pattern=出力(蓄積中)として転用する。
 */
export function runLengthEncodingSteps(): StringMatchFrame[] {
  const text = RLE_INPUT;
  const frames: StringMatchFrame[] = [
    { text, pattern: "", textHighlight: {}, patternOffset: 0, patternHighlight: {}, description: `ランレングス符号化を開始。入力: "${text}"` },
  ];

  let output = "";
  let i = 0;
  while (i < text.length) {
    let j = i;
    while (j < text.length && text[j] === text[i]) j++;
    const runLength = j - i;

    const textHighlight: Partial<Record<number, CharState>> = {};
    for (let k = i; k < j; k++) textHighlight[k] = "matching";
    frames.push({
      text,
      pattern: output,
      textHighlight,
      patternOffset: 0,
      patternHighlight: {},
      description: `文字'${text[i]}'が${runLength}回連続 → "${runLength}${text[i]}"に置き換える`,
    });

    const addedStart = output.length;
    output += `${runLength}${text[i]}`;
    const patternHighlight: Partial<Record<number, CharState>> = {};
    for (let k = addedStart; k < output.length; k++) patternHighlight[k] = "matched";
    frames.push({
      text,
      pattern: output,
      textHighlight: {},
      patternOffset: 0,
      patternHighlight,
      description: `出力に追加: "${output}"`,
    });
    i = j;
  }

  frames.push({
    text,
    pattern: output,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `計算完了。"${text}"(${text.length}文字) → "${output}"(${output.length}文字)`,
  });

  return frames;
}

/**
 * Bitap法(シフトOR法)のステップ列を生成する。
 * 実際のBitap法はビットベクトルRの並列更新で全開始位置を同時に追跡するが、
 * ここでは「テキストを走査しながら一致/不一致をハイライトする」という結果が同じ挙動を
 * KMP法などと同じ表現(1開始位置ずつ左から右へ文字比較)で可視化する
 * (最終的に見つかる一致位置は、実際のビットマスク演算によるBitap探索と一致する)。
 */
export function bitapAlgorithmSteps(): StringMatchFrame[] {
  const text = TEXT;
  const pattern = PATTERN;
  const m = pattern.length;
  const frames: StringMatchFrame[] = [
    {
      text,
      pattern,
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `各文字について「パターンのどの位置に出現するか」を表すビットマスクを事前計算し、状態ベクトルRをテキストに沿って更新しながら探索する`,
    },
  ];

  for (let s = 0; s <= text.length - m; s++) {
    let j = 0;
    while (j < m && text[s + j] === pattern[j]) j++;

    const textHighlight: Partial<Record<number, CharState>> = {};
    const patternHighlight: Partial<Record<number, CharState>> = {};
    for (let k = 0; k < j; k++) {
      textHighlight[s + k] = "matching";
      patternHighlight[k] = "matching";
    }

    if (j === m) {
      for (let k = 0; k < j; k++) {
        textHighlight[s + k] = "matched";
        patternHighlight[k] = "matched";
      }
      frames.push({
        text,
        pattern,
        textHighlight,
        patternOffset: s,
        patternHighlight,
        description: `位置${s}: 状態ベクトルRの対応ビットが0になり、完全一致を検出`,
      });
    } else {
      textHighlight[s + j] = "mismatch";
      patternHighlight[j] = "mismatch";
      frames.push({
        text,
        pattern,
        textHighlight,
        patternOffset: s,
        patternHighlight,
        description: `位置${s}: text[${s + j}]="${text[s + j]}"とpattern[${j}]="${pattern[j]}"が不一致 → Rのこのビットが立ち、この開始位置は候補から外れる`,
      });
    }
  }

  frames.push({ text, pattern, textHighlight: {}, patternOffset: 0, patternHighlight: {}, description: "走査完了" });
  return frames;
}

export const LZ77_INPUT = "ABABABABABA";
export const LZ77_WINDOW_SIZE = 6;

/**
 * LZ77圧縮のステップ列を生成する。runLengthEncodingSteps と同様に、
 * text=入力・pattern=出力(蓄積中のトークン列)として、スライディングウィンドウ内の
 * 最長一致を探しては `(距離, 長さ, 次の1文字)` のトークンとしてpatternに追記していく。
 */
export function lz77CompressionSteps(): StringMatchFrame[] {
  const text = LZ77_INPUT;
  const windowSize = LZ77_WINDOW_SIZE;
  const n = text.length;
  const frames: StringMatchFrame[] = [
    {
      text,
      pattern: "",
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `LZ77圧縮を開始。入力: "${text}"(ウィンドウサイズ${windowSize})`,
    },
  ];

  let output = "";
  let i = 0;
  while (i < n) {
    let bestLen = 0;
    let bestDist = 0;
    const start = Math.max(0, i - windowSize);
    for (let j = start; j < i; j++) {
      let length = 0;
      while (i + length < n && text[j + length] === text[i + length] && length < i - j) length++;
      if (length > bestLen) {
        bestLen = length;
        bestDist = i - j;
      }
    }
    const nextChar = i + bestLen < n ? text[i + bestLen] : "";

    const searchHighlight: Partial<Record<number, CharState>> = {};
    if (bestLen > 0) {
      const srcStart = i - bestDist;
      for (let k = 0; k < bestLen; k++) {
        searchHighlight[srcStart + k] = "matched";
        searchHighlight[i + k] = "matching";
      }
    }
    if (nextChar !== "") searchHighlight[i + bestLen] = "matching";
    frames.push({
      text,
      pattern: output,
      textHighlight: searchHighlight,
      patternOffset: 0,
      patternHighlight: {},
      description:
        bestLen > 0
          ? `位置${i}: ${bestDist}文字遡った場所に長さ${bestLen}の一致を発見。次の文字'${nextChar}'と合わせて(${bestDist},${bestLen},'${nextChar}')を出力`
          : `位置${i}: ウィンドウ内に一致なし。文字'${nextChar}'をそのまま(0,0,'${nextChar}')として出力`,
    });

    const token = `(${bestDist},${bestLen},'${nextChar}')`;
    const addedStart = output.length;
    output = output.length > 0 ? `${output} ${token}` : token;
    const patternHighlight: Partial<Record<number, CharState>> = {};
    for (let k = addedStart; k < output.length; k++) patternHighlight[k] = "matched";
    frames.push({
      text,
      pattern: output,
      textHighlight: {},
      patternOffset: 0,
      patternHighlight,
      description: `出力に追加: "${output}"`,
    });

    i += bestLen + 1;
  }

  frames.push({
    text,
    pattern: output,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `圧縮完了。トークン列: "${output}"`,
  });
  return frames;
}

export const LZW_INPUT = "ABABABABA";

/**
 * LZW圧縮のステップ列を生成する。runLengthEncodingSteps と同様に、
 * text=入力・pattern=出力(蓄積中の符号列)として、辞書を動的に構築しながら
 * 「まだ辞書にない最短の未登録文字列」が見つかるたびに符号を出力していく。
 */
export function lzwCompressionSteps(): StringMatchFrame[] {
  const text = LZW_INPUT;
  const frames: StringMatchFrame[] = [
    {
      text,
      pattern: "",
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `LZW圧縮を開始。入力: "${text}"。辞書を入力中に現れる1文字ずつのアルファベットで初期化する`,
    },
  ];

  const dictionary = new Map<string, number>();
  const chars = Array.from(new Set(text.split("")));
  chars.forEach((c, idx) => dictionary.set(c, idx));
  let nextCode = chars.length;

  let w = "";
  let output = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const wc = w + c;
    if (dictionary.has(wc)) {
      w = wc;
      const highlight: Partial<Record<number, CharState>> = {};
      for (let k = i - w.length + 1; k <= i; k++) highlight[k] = "matching";
      frames.push({
        text,
        pattern: output,
        textHighlight: highlight,
        patternOffset: 0,
        patternHighlight: {},
        description: `"${wc}"は既に辞書にある(符号${dictionary.get(wc)}) → さらに1文字延長して、より長い一致を探す`,
      });
    } else {
      const code = dictionary.get(w)!;
      const highlight: Partial<Record<number, CharState>> = {};
      for (let k = i - w.length; k < i; k++) highlight[k] = "matched";
      highlight[i] = "mismatch";

      const addedStart = output.length;
      output = output.length > 0 ? `${output} ${code}` : `${code}`;
      const patternHighlight: Partial<Record<number, CharState>> = {};
      for (let k = addedStart; k < output.length; k++) patternHighlight[k] = "matched";

      frames.push({
        text,
        pattern: output,
        textHighlight: highlight,
        patternOffset: 0,
        patternHighlight,
        description: `"${wc}"は辞書に未登録 → "${w}"の符号${code}を出力し、"${wc}"を新しい符号${nextCode}として辞書に追加`,
      });

      dictionary.set(wc, nextCode);
      nextCode++;
      w = c;
    }
  }
  if (w) {
    const code = dictionary.get(w)!;
    const addedStart = output.length;
    output = output.length > 0 ? `${output} ${code}` : `${code}`;
    const patternHighlight: Partial<Record<number, CharState>> = {};
    for (let k = addedStart; k < output.length; k++) patternHighlight[k] = "matched";
    const textHighlight: Partial<Record<number, CharState>> = {};
    for (let k = text.length - w.length; k < text.length; k++) textHighlight[k] = "matched";
    frames.push({
      text,
      pattern: output,
      textHighlight,
      patternOffset: 0,
      patternHighlight,
      description: `入力終了。残っていた"${w}"の符号${code}を出力`,
    });
  }

  frames.push({
    text,
    pattern: output,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `圧縮完了。符号列: "${output}"`,
  });
  return frames;
}

export const LCP_TARGET = "banana";

function buildSuffixArrayNaive(s: string): number[] {
  return Array.from({ length: s.length }, (_, i) => i).sort((a, b) =>
    s.slice(a) < s.slice(b) ? -1 : s.slice(a) > s.slice(b) ? 1 : 0
  );
}

/**
 * LCP配列(Kasaiのアルゴリズム)のステップ列を生成する。
 * 固定文字列の接尾辞配列(素朴なソートで構築)が既知の状態から、テキスト上の位置順に
 * 隣接する接尾辞ペアの最長共通接頭辞の長さを1つずつ計算していく過程を可視化する。
 * pattern欄には計算済みのLCP配列を段階的に構築して表示する。
 */
export function lcpArraySteps(): StringMatchFrame[] {
  const text = LCP_TARGET;
  const n = text.length;
  const sa = buildSuffixArrayNaive(text);
  const rank = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) rank[sa[i]] = i;
  const lcpDisplay: Array<number | null> = new Array(n).fill(null);

  const frames: StringMatchFrame[] = [
    {
      text,
      pattern: "",
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `接尾辞配列SA=[${sa.join(",")}]が既知として、Kasaiのアルゴリズムで隣接する接尾辞対のLCP値を計算する`,
    },
  ];

  const formatLcp = () => lcpDisplay.map((v) => (v === null ? "_" : v)).join(",");

  let h = 0;
  for (let i = 0; i < n; i++) {
    if (rank[i] > 0) {
      const j = sa[rank[i] - 1];
      while (i + h < n && j + h < n && text[i + h] === text[j + h]) h++;
      lcpDisplay[rank[i]] = h;

      const textHighlight: Partial<Record<number, CharState>> = {};
      for (let k = 0; k < h; k++) {
        textHighlight[j + k] = "matched";
        textHighlight[i + k] = "matching";
      }
      frames.push({
        text,
        pattern: formatLcp(),
        textHighlight,
        patternOffset: 0,
        patternHighlight: {},
        description: `接尾辞"${text.slice(j)}"(位置${j}、SA順で${rank[i] - 1}番目)と"${text.slice(i)}"(位置${i}、SA順で${rank[i]}番目)は先頭${h}文字が共通 → LCP[${rank[i]}]=${h}`,
      });

      if (h > 0) h--;
    } else {
      h = 0;
    }
  }

  frames.push({
    text,
    pattern: formatLcp(),
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `計算完了。LCP配列: [${formatLcp()}]`,
  });
  return frames;
}

export const BWT_INPUT = "banana";

/**
 * Burrows-Wheeler変換(BWT)のステップ列を生成する。
 * 固定文字列(終端記号"$"付き)の全巡回シフトを辞書式順序でソートし、
 * それぞれの最後の文字を1つずつBWT出力(pattern欄)に構築していく過程を可視化する。
 */
export function burrowsWheelerTransformSteps(): StringMatchFrame[] {
  const text = `${BWT_INPUT}$`;
  const n = text.length;
  const rotations = Array.from({ length: n }, (_, start) => ({
    start,
    str: text.slice(start) + text.slice(0, start),
  }));
  rotations.sort((a, b) => (a.str < b.str ? -1 : a.str > b.str ? 1 : 0));

  const frames: StringMatchFrame[] = [
    {
      text,
      pattern: "",
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `終端記号"$"を付けた"${text}"の全${n}通りの巡回シフトを作り、辞書式順序でソートする`,
    },
  ];

  let output = "";
  for (const { start, str } of rotations) {
    const lastCharIndex = (start + n - 1) % n;
    const textHighlight: Partial<Record<number, CharState>> = {
      [start]: "matching",
      [lastCharIndex]: "matched",
    };
    const lastChar = str[str.length - 1];
    const addedStart = output.length;
    output += lastChar;
    const patternHighlight: Partial<Record<number, CharState>> = {};
    for (let k = addedStart; k < output.length; k++) patternHighlight[k] = "matched";
    frames.push({
      text,
      pattern: output,
      textHighlight,
      patternOffset: 0,
      patternHighlight,
      description: `回転"${str}"(開始位置${start})の最後の文字'${lastChar}'をBWT出力に追加 → "${output}"`,
    });
  }

  frames.push({
    text,
    pattern: output,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `BWT変換完了。"${BWT_INPUT}" → "${output}"`,
  });
  return frames;
}

export const BPE_INPUT = "aaabdaaabac";

function mostFrequentPair(s: string): { pair: string; count: number } | null {
  const counts = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const pair = s[i] + s[i + 1];
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 1;
  for (const [pair, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && pair < best)) {
      bestCount = count;
      best = pair;
    }
  }
  return best ? { pair: best, count: bestCount } : null;
}

/**
 * バイトペア符号化(BPE)のステップ列を生成する。フィリップ・ゲージの原論文(1994年)の
 * 古典的な例("aaabdaaabac")を使い、最も頻繁に隣接する文字ペアを繰り返し新しい1つの
 * 記号に統合していく過程を、text=元の文字列・pattern=統合が進む現在の文字列として可視化する。
 */
export function bytePairEncodingSteps(): StringMatchFrame[] {
  const original = BPE_INPUT;
  const frames: StringMatchFrame[] = [
    {
      text: original,
      pattern: original,
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `バイトペア符号化を開始。入力: "${original}"。最も頻繁に隣接するペアを繰り返し1つの記号に統合する`,
    },
  ];

  let current = original;
  const used = new Set(current.split(""));
  const mergeSymbols = "ZYXWVUTSRQPONMLKJIHGFEDCBA".split("");

  while (true) {
    const found = mostFrequentPair(current);
    if (!found) break;
    const symbol = mergeSymbols.find((sym) => !used.has(sym));
    if (!symbol) break;
    used.add(symbol);

    const patternHighlight: Partial<Record<number, CharState>> = {};
    for (let i = 0; i < current.length - 1; i++) {
      if (current[i] + current[i + 1] === found.pair) {
        patternHighlight[i] = "matching";
        patternHighlight[i + 1] = "matching";
      }
    }
    frames.push({
      text: original,
      pattern: current,
      textHighlight: {},
      patternOffset: 0,
      patternHighlight,
      description: `最頻出ペア"${found.pair}"(${found.count}回出現)が見つかった → 新しい記号'${symbol}'に統合する`,
    });

    let next = "";
    let i = 0;
    while (i < current.length) {
      if (i < current.length - 1 && current[i] + current[i + 1] === found.pair) {
        next += symbol;
        i += 2;
      } else {
        next += current[i];
        i += 1;
      }
    }
    current = next;
    frames.push({
      text: original,
      pattern: current,
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `統合後の文字列: "${current}"`,
    });
  }

  frames.push({
    text: original,
    pattern: current,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `統合完了(これ以上頻度2以上のペアがない)。最終結果: "${current}"(${original.length}文字 → ${current.length}文字)`,
  });
  return frames;
}

export const WORDPIECE_WORD_FREQS: Record<string, number> = { low: 5, lower: 2, newest: 6, widest: 3, new: 4 };
export const WORDPIECE_VOCAB_SIZE = 16;
export const WORDPIECE_TARGET_WORD = "newest";

function wordToSymbolsWP(word: string): string[] {
  return [word[0], ...word.slice(1).split("").map((ch) => `##${ch}`)];
}

function getSymbolCountsWP(splits: Map<string, string[]>, wordFreqs: Record<string, number>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [word, freq] of Object.entries(wordFreqs)) {
    for (const sym of splits.get(word)!) counts.set(sym, (counts.get(sym) ?? 0) + freq);
  }
  return counts;
}

function getPairCountsWP(splits: Map<string, string[]>, wordFreqs: Record<string, number>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [word, freq] of Object.entries(wordFreqs)) {
    const symbols = splits.get(word)!;
    for (let i = 0; i < symbols.length - 1; i++) {
      const key = `${symbols[i]} ${symbols[i + 1]}`;
      counts.set(key, (counts.get(key) ?? 0) + freq);
    }
  }
  return counts;
}

function mergeSymbolWP(a: string, b: string): string {
  return a + (b.startsWith("##") ? b.slice(2) : b);
}

function trainWordpieceVocab(wordFreqs: Record<string, number>, vocabSize: number): Set<string> {
  const splits = new Map<string, string[]>();
  for (const word of Object.keys(wordFreqs)) splits.set(word, wordToSymbolsWP(word));
  const vocab = new Set<string>();
  for (const symbols of splits.values()) for (const sym of symbols) vocab.add(sym);

  while (vocab.size < vocabSize) {
    const symbolCounts = getSymbolCountsWP(splits, wordFreqs);
    const pairCounts = getPairCountsWP(splits, wordFreqs);
    if (pairCounts.size === 0) break;
    let bestPair: [string, string] | null = null;
    let bestScore = -1;
    for (const [key, cnt] of pairCounts) {
      const [a, b] = key.split(" ");
      const score = cnt / (symbolCounts.get(a)! * symbolCounts.get(b)!);
      if (score > bestScore) {
        bestScore = score;
        bestPair = [a, b];
      }
    }
    if (!bestPair) break;
    const [a, b] = bestPair;
    const merged = mergeSymbolWP(a, b);
    vocab.add(merged);
    for (const [word, symbols] of splits) {
      const newSymbols: string[] = [];
      let i = 0;
      while (i < symbols.length) {
        if (i < symbols.length - 1 && symbols[i] === a && symbols[i + 1] === b) {
          newSymbols.push(merged);
          i += 2;
        } else {
          newSymbols.push(symbols[i]);
          i += 1;
        }
      }
      splits.set(word, newSymbols);
    }
  }
  return vocab;
}

/**
 * WordPieceトークナイゼーションのステップ列を生成する。固定の単語頻度表から学習した
 * 語彙(BPEの記事と同じ{low:5, lower:2, newest:6, widest:3, new:4}、目標語彙サイズ16)を使い、
 * 固定の単語に対して語彙中の最長一致するサブワードを貪欲に切り出していく過程を可視化する。
 */
export function wordpieceTokenizationSteps(): StringMatchFrame[] {
  const vocab = trainWordpieceVocab(WORDPIECE_WORD_FREQS, WORDPIECE_VOCAB_SIZE);
  const word = WORDPIECE_TARGET_WORD;
  const n = word.length;
  const frames: StringMatchFrame[] = [
    {
      text: word,
      pattern: "",
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `単語頻度表から学習した語彙(語彙サイズ${WORDPIECE_VOCAB_SIZE})を使って"${word}"を最長一致で貪欲にトークン分割する`,
    },
  ];

  let start = 0;
  let output = "";
  while (start < n) {
    let end = n;
    let found: string | null = null;
    while (end > start) {
      const substr = word.slice(start, end);
      const candidate = start === 0 ? substr : `##${substr}`;
      const tryHighlight: Partial<Record<number, CharState>> = {};
      for (let k = start; k < end; k++) tryHighlight[k] = "matching";
      frames.push({
        text: word,
        pattern: output,
        textHighlight: tryHighlight,
        patternOffset: 0,
        patternHighlight: {},
        description: `候補"${candidate}"が語彙にあるか確認`,
      });
      if (vocab.has(candidate)) {
        found = candidate;
        break;
      }
      end -= 1;
    }
    if (found === null) {
      frames.push({
        text: word,
        pattern: output,
        textHighlight: { [start]: "mismatch" },
        patternOffset: 0,
        patternHighlight: {},
        description: "一致するサブワードが見つからない → [UNK]",
      });
      output = output.length > 0 ? `${output} [UNK]` : "[UNK]";
      break;
    }
    const matchHighlight: Partial<Record<number, CharState>> = {};
    for (let k = start; k < end; k++) matchHighlight[k] = "matched";
    const addedStart = output.length;
    output = output.length > 0 ? `${output} ${found}` : found;
    const patternHighlight: Partial<Record<number, CharState>> = {};
    for (let k = addedStart; k < output.length; k++) patternHighlight[k] = "matched";
    frames.push({
      text: word,
      pattern: output,
      textHighlight: matchHighlight,
      patternOffset: 0,
      patternHighlight,
      description: `"${found}"が語彙にある → トークンとして採用。出力: "${output}"`,
    });
    start = end;
  }

  frames.push({
    text: word,
    pattern: output,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `分割完了。"${word}" → [${output}]`,
  });
  return frames;
}

export const PORTER_WORDS = ["caresses", "agreed", "relational"];

const PORTER_VOWELS = new Set("aeiou");

function porterIsConsonant(word: string, i: number): boolean {
  const ch = word[i];
  if (PORTER_VOWELS.has(ch)) return false;
  if (ch === "y") return i === 0 || !porterIsConsonant(word, i - 1);
  return true;
}

function porterMeasure(word: string): number {
  let form = "";
  for (let i = 0; i < word.length; i++) form += porterIsConsonant(word, i) ? "C" : "V";
  let s = "";
  for (const ch of form) if (s[s.length - 1] !== ch) s += ch;
  if (s.startsWith("C")) s = s.slice(1);
  if (s.endsWith("V")) s = s.slice(0, -1);
  return Math.floor(s.length / 2);
}

function porterContainsVowel(word: string): boolean {
  for (let i = 0; i < word.length; i++) if (!porterIsConsonant(word, i)) return true;
  return false;
}

function porterEndsDoubleConsonant(word: string): boolean {
  return word.length >= 2 && word[word.length - 1] === word[word.length - 2] && porterIsConsonant(word, word.length - 1);
}

function porterEndsCvc(word: string): boolean {
  if (word.length < 3) return false;
  const a = word.length - 3;
  const b = word.length - 2;
  const c = word.length - 1;
  if (!(porterIsConsonant(word, a) && !porterIsConsonant(word, b) && porterIsConsonant(word, c))) return false;
  return !["w", "x", "y"].includes(word[c]);
}

type PorterRule = [string, string, number?, ((stem: string) => boolean)?];

function porterReplaceSuffix(
  word: string,
  suffix: string,
  replacement: string,
  minMeasure = -1,
  condition?: (s: string) => boolean
): string | null {
  if (!word.endsWith(suffix)) return null;
  const stem = suffix ? word.slice(0, word.length - suffix.length) : word;
  if (minMeasure >= 0 && porterMeasure(stem) < minMeasure) return null;
  if (condition && !condition(stem)) return null;
  return stem + replacement;
}

function porterApplyRules(word: string, rules: PorterRule[]): string {
  for (const [suffix, replacement, minM, cond] of rules) {
    const result = porterReplaceSuffix(word, suffix, replacement, minM ?? -1, cond);
    if (result !== null) return result;
  }
  return word;
}

function porterStep1a(word: string): string {
  for (const [suffix, repl] of [
    ["sses", "ss"],
    ["ies", "i"],
    ["ss", "ss"],
    ["s", ""],
  ] as [string, string][]) {
    if (word.endsWith(suffix)) return word.slice(0, word.length - suffix.length) + repl;
  }
  return word;
}

function porterStep1bCleanup(stem: string): string {
  for (const [suffix, repl] of [
    ["at", "ate"],
    ["bl", "ble"],
    ["iz", "ize"],
  ] as [string, string][]) {
    if (stem.endsWith(suffix)) return stem + repl.slice(suffix.length);
  }
  if (porterEndsDoubleConsonant(stem) && !["l", "s", "z"].includes(stem[stem.length - 1])) return stem.slice(0, -1);
  if (porterMeasure(stem) === 1 && porterEndsCvc(stem)) return stem + "e";
  return stem;
}

function porterStep1b(word: string): string {
  if (word.endsWith("eed")) {
    const stem = word.slice(0, -3);
    return porterMeasure(stem) > 0 ? stem + "ee" : word;
  }
  for (const suffix of ["ed", "ing"]) {
    if (word.endsWith(suffix)) {
      const stem = word.slice(0, word.length - suffix.length);
      return porterContainsVowel(stem) ? porterStep1bCleanup(stem) : word;
    }
  }
  return word;
}

function porterStep1c(word: string): string {
  return word.endsWith("y") && word.length > 1 && porterContainsVowel(word.slice(0, -1)) ? word.slice(0, -1) + "i" : word;
}

const PORTER_STEP2_RULES: PorterRule[] = [
  ["ational", "ate", 1], ["tional", "tion", 1], ["enci", "ence", 1], ["anci", "ance", 1],
  ["izer", "ize", 1], ["abli", "able", 1], ["alli", "al", 1], ["entli", "ent", 1],
  ["eli", "e", 1], ["ousli", "ous", 1], ["ization", "ize", 1], ["ation", "ate", 1],
  ["ator", "ate", 1], ["alism", "al", 1], ["iveness", "ive", 1], ["fulness", "ful", 1],
  ["ousness", "ous", 1], ["aliti", "al", 1], ["iviti", "ive", 1], ["biliti", "ble", 1],
];
const PORTER_STEP3_RULES: PorterRule[] = [
  ["icate", "ic", 1], ["ative", "", 1], ["alize", "al", 1], ["iciti", "ic", 1],
  ["ical", "ic", 1], ["ful", "", 1], ["ness", "", 1],
];
const PORTER_STEP4_RULES: PorterRule[] = [
  ["al", "", 2], ["ance", "", 2], ["ence", "", 2], ["er", "", 2], ["ic", "", 2],
  ["able", "", 2], ["ible", "", 2], ["ant", "", 2], ["ement", "", 2], ["ment", "", 2],
  ["ent", "", 2],
  ["ion", "", 2, (stem: string) => stem.length > 0 && (stem[stem.length - 1] === "s" || stem[stem.length - 1] === "t")],
  ["ou", "", 2], ["ism", "", 2], ["ate", "", 2], ["iti", "", 2], ["ous", "", 2],
  ["ive", "", 2], ["ize", "", 2],
];

function porterStep5a(word: string): string {
  if (word.endsWith("e")) {
    const stem = word.slice(0, -1);
    const m = porterMeasure(stem);
    if (m > 1 || (m === 1 && !porterEndsCvc(stem))) return stem;
  }
  return word;
}

function porterStep5b(word: string): string {
  return porterMeasure(word) > 1 && porterEndsDoubleConsonant(word) && word.endsWith("l") ? word.slice(0, -1) : word;
}

/**
 * Porterのステミングアルゴリズムのステップ列を生成する。原論文で確認されている
 * caresses→caress、agreed→agre、relational→relat という3つの固定単語に対して、
 * Step1a〜5bの書き換えルールを順番に適用していく過程を可視化する。
 * text=元の単語(固定)、pattern=書き換えが進む現在の語形として表現する。
 */
export function porterStemmingSteps(): StringMatchFrame[] {
  const frames: StringMatchFrame[] = [
    {
      text: PORTER_WORDS.join(" "),
      pattern: "",
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `Porterのステミングアルゴリズムを開始。対象の単語: ${PORTER_WORDS.join(", ")}`,
    },
  ];

  const stages: Array<[string, (w: string) => string]> = [
    ["Step1a(複数形の単純化)", porterStep1a],
    ["Step1b(-eed/-ed/-ingの除去)", porterStep1b],
    ["Step1c(-y → -i)", porterStep1c],
    ["Step2(長い接尾辞の単純化)", (w) => porterApplyRules(w, PORTER_STEP2_RULES)],
    ["Step3(接尾辞のさらなる単純化)", (w) => porterApplyRules(w, PORTER_STEP3_RULES)],
    ["Step4(measure>=2の接尾辞除去)", (w) => porterApplyRules(w, PORTER_STEP4_RULES)],
    ["Step5a(末尾のe除去)", porterStep5a],
    ["Step5b(末尾のllの簡略化)", porterStep5b],
  ];

  for (const original of PORTER_WORDS) {
    let word = original.toLowerCase();
    frames.push({
      text: original,
      pattern: word,
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `"${original}"のステミングを開始`,
    });

    if (word.length > 2) {
      for (const [label, fn] of stages) {
        const before = word;
        word = fn(word);
        const patternHighlight: Partial<Record<number, CharState>> = {};
        if (word !== before) {
          for (let k = 0; k < word.length; k++) patternHighlight[k] = "matched";
        }
        frames.push({
          text: original,
          pattern: word,
          textHighlight: {},
          patternOffset: 0,
          patternHighlight,
          description: word !== before ? `${label}: "${before}" → "${word}"` : `${label}: 変化なし`,
        });
      }
    }

    frames.push({
      text: original,
      pattern: word,
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `"${original}"の語幹: "${word}"`,
    });
  }

  frames.push({
    text: PORTER_WORDS.join(" "),
    pattern: "",
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: "全単語のステミング完了",
  });
  return frames;
}

export const NGRAM_SENTENCE_TOKENS = ["the", "cat", "sat", "on", "the", "mat"];

function nGramTokenOffsets(tokens: string[]): Array<{ start: number; end: number }> {
  const offsets: Array<{ start: number; end: number }> = [];
  let pos = 0;
  for (const t of tokens) {
    offsets.push({ start: pos, end: pos + t.length });
    pos += t.length + 1;
  }
  return offsets;
}

/**
 * n-gram言語モデル(バイグラム、n=2)のステップ列を生成する。固定の短いコーパス文
 * "the cat sat on the mat" に文頭/文末記号を付け、隣接する2単語の窓をスライドさせながら
 * バイグラムを1つずつ抽出・カウントしていく過程を可視化する。
 */
export function nGramLanguageModelSteps(): StringMatchFrame[] {
  const tokens = ["<s>", ...NGRAM_SENTENCE_TOKENS, "</s>"];
  const text = tokens.join(" ");
  const offsets = nGramTokenOffsets(tokens);
  const bigramCounts = new Map<string, number>();

  const frames: StringMatchFrame[] = [
    {
      text,
      pattern: "",
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `固定コーパスの文「${NGRAM_SENTENCE_TOKENS.join(" ")}」からバイグラム(n=2)を1つずつ抽出し、頻度を数える`,
    },
  ];

  for (let i = 0; i < tokens.length - 1; i++) {
    const w1 = tokens[i];
    const w2 = tokens[i + 1];
    const key = `${w1} ${w2}`;
    bigramCounts.set(key, (bigramCounts.get(key) ?? 0) + 1);

    const textHighlight: Partial<Record<number, CharState>> = {};
    for (let k = offsets[i].start; k < offsets[i].end; k++) textHighlight[k] = "matching";
    for (let k = offsets[i + 1].start; k < offsets[i + 1].end; k++) textHighlight[k] = "matching";

    const pattern = Array.from(bigramCounts.entries())
      .map(([p, c]) => `(${p})=${c}`)
      .join(" ");
    frames.push({
      text,
      pattern,
      textHighlight,
      patternOffset: 0,
      patternHighlight: {},
      description: `バイグラム("${w1}", "${w2}")を抽出 → count=${bigramCounts.get(key)}`,
    });
  }

  const finalPattern = Array.from(bigramCounts.entries())
    .map(([p, c]) => `(${p})=${c}`)
    .join(" ");
  frames.push({
    text,
    pattern: finalPattern,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `抽出完了。${bigramCounts.size}種類のバイグラムを収集した`,
  });
  return frames;
}

export const KMER_SEQUENCE = "ACGTACGTTGCA";
export const KMER_K = 3;

const KMER_COMPLEMENT: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };

function kmerReverseComplement(s: string): string {
  return s
    .split("")
    .reverse()
    .map((c) => KMER_COMPLEMENT[c])
    .join("");
}

function kmerCanonical(kmer: string): string {
  const rc = kmerReverseComplement(kmer);
  return kmer < rc ? kmer : rc;
}

/**
 * k-merカウントのステップ列を生成する。固定のDNA配列からスライディングウィンドウで
 * 長さk=3のk-merを1つずつ切り出し、自身と逆相補配列のうち辞書順で小さい方(正規形)で
 * カウントしていく過程を可視化する。
 */
export function kMerCountingSteps(): StringMatchFrame[] {
  const text = KMER_SEQUENCE;
  const k = KMER_K;
  const n = text.length;
  const counts = new Map<string, number>();

  const frames: StringMatchFrame[] = [
    {
      text,
      pattern: "",
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `DNA配列"${text}"から長さk=${k}のk-merをスライディングウィンドウで1つずつ抽出し、正規形(自身と逆相補配列のうち辞書順で小さい方)でカウントする`,
    },
  ];

  for (let i = 0; i <= n - k; i++) {
    const kmer = text.slice(i, i + k);
    const canonical = kmerCanonical(kmer);
    counts.set(canonical, (counts.get(canonical) ?? 0) + 1);

    const textHighlight: Partial<Record<number, CharState>> = {};
    for (let j = i; j < i + k; j++) textHighlight[j] = "matching";

    const pattern = Array.from(counts.entries())
      .map(([km, c]) => `${km}:${c}`)
      .join(" ");
    frames.push({
      text,
      pattern,
      textHighlight,
      patternOffset: 0,
      patternHighlight: {},
      description: `位置${i}: k-mer"${kmer}"(正規形"${canonical}") → count=${counts.get(canonical)}`,
    });
  }

  const finalPattern = Array.from(counts.entries())
    .map(([km, c]) => `${km}:${c}`)
    .join(" ");
  frames.push({
    text,
    pattern: finalPattern,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `カウント完了。${counts.size}種類のk-merを検出した`,
  });
  return frames;
}

export const STRING_VISUALIZERS: Record<string, () => StringMatchFrame[]> = {
  kmp: kmpSteps,
  "rabin-karp": rabinKarpSteps,
  "z-algorithm": zAlgorithmSteps,
  "boyer-moore": boyerMooreSteps,
  "run-length-encoding": runLengthEncodingSteps,
  "bitap-algorithm": bitapAlgorithmSteps,
  "lz77-compression": lz77CompressionSteps,
  "lzw-compression": lzwCompressionSteps,
  "lcp-array": lcpArraySteps,
  "burrows-wheeler-transform": burrowsWheelerTransformSteps,
  "byte-pair-encoding": bytePairEncodingSteps,
  "wordpiece-tokenization": wordpieceTokenizationSteps,
  "porter-stemming": porterStemmingSteps,
  "n-gram-language-model": nGramLanguageModelSteps,
  "k-mer-counting": kMerCountingSteps,
};
