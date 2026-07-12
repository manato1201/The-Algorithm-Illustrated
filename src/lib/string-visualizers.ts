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

export const STRING_VISUALIZERS: Record<string, () => StringMatchFrame[]> = {
  kmp: kmpSteps,
  "rabin-karp": rabinKarpSteps,
  "z-algorithm": zAlgorithmSteps,
  "boyer-moore": boyerMooreSteps,
};
