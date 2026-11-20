import type { StateColorKey } from "./design-tokens";
import type { SearchFrame } from "./search-visualizers";

/**
 * データ構造・整列ネットワーク・ビットDP・ふるいなど「配列(表)の中身を書き換えていく」アルゴリズムの可視化
 * (配列の棒グラフ+状態色の kind。SearchVisualizer が描画する)。
 * 棒は「並べ替え中の配列」「ヒープの配列」「ハッシュ表のスロット」「DPの表」など、アルゴリズムごとに意味が違う(説明文に書く)。
 * 色の意味: comparing=読んでいる・比べている要素 / pivot=いま注目・書き込む要素 / swapping=入れ替える・書き換える・除外する要素 / settled=確定
 */

type Highlight = Partial<Record<number, StateColorKey>>;

function frame(array: number[], highlight: Highlight, description: string): SearchFrame {
  return { array: [...array], highlight, description };
}

// ===========================================================================
// バイトニックソート: 入力に依らず比較する組が決まっている(8要素)
// ===========================================================================

export const BITONIC_INPUT = [6, 2, 7, 3, 8, 1, 5, 4];

/** 比較交換の段数。ブロック長 2,4,...,n の各段で、距離 k/2,...,1 の比較交換を行う。 */
export function bitonicStageCount(n: number): number {
  const log = Math.round(Math.log2(n));
  return (log * (log + 1)) / 2;
}

export function bitonicSortSteps(): SearchFrame[] {
  const a = [...BITONIC_INPUT];
  const n = a.length;
  const frames = [
    frame(
      a,
      {},
      `${n}要素のバイトニックソート。「どの2つを比べるか」は値に関係なく最初から決まっていて、同じ距離の比較交換は全部同時に実行できる(${bitonicStageCount(n)}段)`,
    ),
  ];
  let stage = 0;
  let compares = 0;
  for (let k = 2; k <= n; k *= 2) {
    for (let j = k / 2; j >= 1; j = Math.floor(j / 2)) {
      stage++;
      for (let i = 0; i < n; i++) {
        const l = i ^ j;
        if (l <= i) continue;
        const ascending = (i & k) === 0;
        const swap = ascending ? a[i] > a[l] : a[i] < a[l];
        compares++;
        if (swap) [a[i], a[l]] = [a[l], a[i]];
        frames.push(
          frame(
            a,
            { [i]: swap ? "swapping" : "comparing", [l]: swap ? "swapping" : "comparing" },
            `第${stage}段(ブロック長${k}・距離${j}): 位置${i}と${l}を${ascending ? "昇順" : "降順"}に比較交換 → ${swap ? "入れ替えた" : "そのまま"}`,
          ),
        );
      }
    }
  }
  const all: Highlight = {};
  a.forEach((_, i) => (all[i] = "settled"));
  frames.push(
    frame(
      a,
      all,
      `完了: ${stage}段・${compares}回の比較交換で整列。比較の組は入力に依らず固定なので、各段の${n / 2}組は並列に実行できる`,
    ),
  );
  return frames;
}

// ===========================================================================
// 二分ヒープ: 追加(上へ調整)→ 最小値の取り出し(下へ調整)。取り出した値は空いた末尾に並べる
// ===========================================================================

export const HEAP_INPUT = [5, 3, 8, 1, 9, 2, 7];

export type HeapTrace = {
  frames: SearchFrame[];
  /** フレームごとの、ヒープとして使っている先頭からの要素数(それ以降は取り出し済みの値または空き)。 */
  sizes: number[];
  /** そのフレームで「先頭 size 個が最小ヒープの条件を満たしている」はずか(調整の途中では false)。 */
  stable: boolean[];
};

export function binaryHeapTrace(): HeapTrace {
  const n = HEAP_INPUT.length;
  const a = Array<number>(n).fill(0);
  let size = 0;
  const frames: SearchFrame[] = [];
  const sizes: number[] = [];
  const stable: boolean[] = [];
  const settledTail = (): Highlight => {
    const h: Highlight = {};
    for (let i = size; i < n; i++) if (a[i] !== 0) h[i] = "settled";
    return h;
  };
  const push = (highlight: Highlight, description: string, isStable: boolean) => {
    frames.push(frame(a, { ...settledTail(), ...highlight }, description));
    sizes.push(size);
    stable.push(isStable);
  };

  push({}, `空のヒープ(${n}マス)に ${HEAP_INPUT.join("・")} を1つずつ追加する。「親は子以下」という順序だけを保つ。棒の i 番目は配列の i 番目(親は (i−1)/2、子は 2i+1・2i+2)`, true);
  for (const x of HEAP_INPUT) {
    a[size] = x;
    let i = size;
    size++;
    push({ [i]: "pivot" }, `${x} を末尾(位置${i})に追加。ここから親と比べて上へ上げる`, false);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p] > a[i]) {
        [a[p], a[i]] = [a[i], a[p]];
        push({ [p]: "swapping", [i]: "swapping" }, `親(位置${p})より小さいので入れ替え`, false);
        i = p;
      } else {
        push({ [p]: "comparing", [i]: "pivot" }, `親(位置${p}、値${a[p]})以下なので、ここで止まる`, true);
        break;
      }
    }
    if (i === 0) push({ [0]: "pivot" }, `根に到達。ヒープの条件を満たした`, true);
  }

  push({}, `追加完了。根(位置0)が最小値${a[0]}。ここから最小値を1つずつ取り出し、取り出した値は空いた末尾に並べていく`, true);
  while (size > 0) {
    const min = a[0];
    const last = size - 1;
    [a[0], a[last]] = [a[last], a[0]];
    size--;
    push(
      { [0]: "swapping", [last]: "settled" },
      `最小値${min}を取り出し、末尾の要素を根に移す(取り出した${min}は位置${last}に確定)`,
      size <= 1,
    );
    let i = 0;
    while (size > 1) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let small = i;
      if (l < size && a[l] < a[small]) small = l;
      if (r < size && a[r] < a[small]) small = r;
      const compared: Highlight = { [i]: "pivot" };
      if (l < size) compared[l] = "comparing";
      if (r < size) compared[r] = "comparing";
      if (small === i) {
        push(compared, l < size ? `子と比べる: どちらも位置${i}の値以上なので、ここで止まる` : `子がないので、ここで止まる`, true);
        break;
      }
      push(compared, `子と比べる: 小さい方は位置${small}(値${a[small]})`, false);
      [a[i], a[small]] = [a[small], a[i]];
      push({ [i]: "swapping", [small]: "swapping" }, `小さい子と入れ替えて下へ下げる`, false);
      i = small;
    }
  }
  const all: Highlight = {};
  a.forEach((_, i) => (all[i] = "settled"));
  frames.push(frame(a, all, `完了: 取り出した順は昇順(${[...HEAP_INPUT].sort((x, y) => x - y).join("・")})。末尾から並べたので配列としては降順に見える。1回の追加・取り出しが O(log n)`));
  sizes.push(0);
  stable.push(true);
  return { frames, sizes, stable };
}

export function binaryHeapSteps(): SearchFrame[] {
  return binaryHeapTrace().frames;
}

// ===========================================================================
// ロビンフッドハッシュ: 棒=スロットの「本来の位置からの距離+1」(空きは0)
// ===========================================================================

export const ROBIN_HOOD_SIZE = 11;
export const ROBIN_HOOD_KEYS = [3, 14, 25, 6, 17, 4, 9, 20, 31];
export const ROBIN_HOOD_MISSING_KEY = 15;

export type RobinHoodSlot = { key: number; dib: number } | null;

export const robinHoodHome = (key: number): number => key % ROBIN_HOOD_SIZE;

export function robinHoodSteps(): SearchFrame[] {
  const size = ROBIN_HOOD_SIZE;
  const slots: RobinHoodSlot[] = Array(size).fill(null);
  const bars = () => slots.map((s) => (s === null ? 0 : s.dib + 1));
  const frames = [
    frame(
      bars(),
      {},
      `${size}スロットのハッシュ表(ハッシュ = 鍵 mod ${size})。棒の高さは「本来の位置からの距離+1」(空きは0)。衝突したら、本来の位置から遠くに追いやられている方を優先して場所を譲らせる`,
    ),
  ];
  for (const key of ROBIN_HOOD_KEYS) {
    let i = robinHoodHome(key);
    let item = { key, dib: 0 };
    frames.push(frame(bars(), { [i]: "pivot" }, `鍵${key}を挿入。本来の位置はスロット${i}`));
    for (;;) {
      const cur = slots[i];
      if (cur === null) {
        slots[i] = item;
        frames.push(frame(bars(), { [i]: "pivot" }, `スロット${i}は空き。鍵${item.key}を距離${item.dib}で置く`));
        break;
      }
      if (cur.dib < item.dib) {
        slots[i] = item;
        frames.push(
          frame(
            bars(),
            { [i]: "swapping" },
            `スロット${i}の鍵${cur.key}は距離${cur.dib}で、こちら(鍵${item.key}、距離${item.dib})より恵まれている → 場所を奪い、鍵${cur.key}を次のスロットへ押し出す`,
          ),
        );
        item = cur;
      } else {
        frames.push(
          frame(
            bars(),
            { [i]: "comparing" },
            `スロット${i}の鍵${cur.key}(距離${cur.dib})は、鍵${item.key}(距離${item.dib})以上に遠い → 次のスロットへ`,
          ),
        );
      }
      i = (i + 1) % size;
      item = { key: item.key, dib: item.dib + 1 };
    }
  }

  // 検索: 存在しない鍵は、距離が追い越された時点で打ち切れる
  {
    const key = ROBIN_HOOD_MISSING_KEY;
    let i = robinHoodHome(key);
    frames.push(frame(bars(), { [i]: "pivot" }, `検索: 鍵${key}(存在しない)。本来の位置はスロット${i}から探す`));
    for (let dib = 0; ; dib++) {
      const cur = slots[i];
      if (cur === null) {
        frames.push(frame(bars(), { [i]: "swapping" }, `空きスロットに到達 → 見つからない`));
        break;
      }
      if (cur.dib < dib) {
        frames.push(
          frame(
            bars(),
            { [i]: "swapping" },
            `スロット${i}の鍵${cur.key}は距離${cur.dib}で、いまの距離${dib}より近い。鍵${key}がここまでの道のりにあるなら、この鍵に場所を奪われていたはず → 見つからないと判定して打ち切り`,
          ),
        );
        break;
      }
      frames.push(frame(bars(), { [i]: "comparing" }, `スロット${i}の鍵${cur.key}(距離${cur.dib})は ${key} ではない。次へ`));
      i = (i + 1) % size;
    }
  }

  const done: Highlight = {};
  slots.forEach((s, i) => {
    if (s !== null) done[i] = "settled";
  });
  const max = Math.max(...slots.map((s) => s?.dib ?? 0));
  frames.push(
    frame(bars(), done, `完了: ${ROBIN_HOOD_KEYS.length}個を格納。最も遠い鍵でも本来の位置から${max}。距離のばらつきが小さいので、失敗する検索も早く打ち切れる`),
  );
  return frames;
}

/** ステップ生成と同じ手順で作った最終のスロット表(検証用)。 */
export function robinHoodTable(keys: readonly number[] = ROBIN_HOOD_KEYS): RobinHoodSlot[] {
  const slots: RobinHoodSlot[] = Array(ROBIN_HOOD_SIZE).fill(null);
  for (const key of keys) {
    let i = robinHoodHome(key);
    let item = { key, dib: 0 };
    for (;;) {
      const cur = slots[i];
      if (cur === null) {
        slots[i] = item;
        break;
      }
      if (cur.dib < item.dib) {
        slots[i] = item;
        item = cur;
      }
      i = (i + 1) % ROBIN_HOOD_SIZE;
      item = { key: item.key, dib: item.dib + 1 };
    }
  }
  return slots;
}

// ===========================================================================
// SOS DP: 棒=f[マスク](そのマスクの部分集合すべての合計)。ビットを1本ずつ処理する
// ===========================================================================

export const SOS_BITS = 4;
export const SOS_INPUT = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3];

export function sosDpSteps(): SearchFrame[] {
  const n = SOS_BITS;
  const size = 1 << n;
  const f = [...SOS_INPUT];
  const bin = (m: number) => m.toString(2).padStart(n, "0");
  const frames = [
    frame(
      f,
      {},
      `${n}要素の集合(マスク 0〜${size - 1})。f[S] を「S の部分集合 T すべてにわたる a[T] の合計」にしたい。部分集合を全部列挙(3^${n}=${3 ** n}回)する代わりに、ビットを1本ずつ処理する`,
    ),
  ];
  for (let i = 0; i < n; i++) {
    frames.push(
      frame(
        f,
        {},
        `ビット${i}の処理(下から${i + 1}番目)。このビットが1のマスク S に、ビットを0にしたマスクの値を足す`,
      ),
    );
    for (let mask = 0; mask < size; mask++) {
      if (!(mask & (1 << i))) continue;
      const from = mask ^ (1 << i);
      const before = f[mask];
      f[mask] += f[from];
      frames.push(
        frame(
          f,
          { [mask]: "pivot", [from]: "comparing" },
          `f[${bin(mask)}] += f[${bin(from)}](${before} + ${f[from]} = ${f[mask]})`,
        ),
      );
    }
  }
  const all: Highlight = {};
  f.forEach((_, m) => (all[m] = "settled"));
  frames.push(
    frame(
      f,
      all,
      `完了: すべての f[S] が部分集合の総和。例えば f[${bin(size - 1)}] = ${f[size - 1]} は全要素の合計。計算は ${n}ビット × ${size / 2}回 = ${(n * size) / 2}回の加算`,
    ),
  );
  return frames;
}

// ===========================================================================
// 区間ふるい: 棒=区間 [30, 70) の整数そのもの。√70 以下の素数の倍数を消す
// ===========================================================================

export const SEGMENT_LO = 30;
export const SEGMENT_HI = 70;

export function segmentedSieveSteps(): SearchFrame[] {
  const lo = SEGMENT_LO;
  const hi = SEGMENT_HI;
  const values = Array.from({ length: hi - lo }, (_, i) => lo + i);
  const limit = Math.floor(Math.sqrt(hi - 1));
  const small: number[] = [];
  for (let n = 2; n <= limit; n++) if (small.every((p) => n % p !== 0)) small.push(n);
  const crossed: Highlight = {};
  const frames = [
    frame(
      values,
      {},
      `区間 [${lo}, ${hi}) の素数だけを求める。合成数は √${hi - 1} ≒ ${Math.sqrt(hi - 1).toFixed(1)} 以下の素因数を必ず持つので、まず ${limit} 以下の素数(${small.join("・")})を小さな篩で用意し、その倍数だけを消す`,
    ),
  ];
  for (const p of small) {
    const start = Math.max(p * p, Math.ceil(lo / p) * p);
    frames.push(
      frame(
        values,
        { ...crossed, [start - lo]: "pivot" },
        `素数${p}: 区間内の最初の倍数は max(${p}²=${p * p}, ${Math.ceil(lo / p)}×${p}=${Math.ceil(lo / p) * p}) = ${start}。${p}自身が区間内にあっても消さないよう、${p}² から始める`,
      ),
    );
    const multiples: number[] = [];
    for (let m = start; m < hi; m += p) {
      crossed[m - lo] = "swapping";
      multiples.push(m);
    }
    frames.push(
      frame(
        values,
        { ...crossed },
        `${p}の倍数 ${multiples.join("・")} を合成数として消す(${multiples.length}個)`,
      ),
    );
  }
  const done: Highlight = { ...crossed };
  const primes: number[] = [];
  values.forEach((v, i) => {
    if (crossed[i] === undefined) {
      done[i] = "settled";
      primes.push(v);
    }
  });
  frames.push(
    frame(values, done, `完了: 消されなかった ${primes.length} 個が素数(${primes.join("・")})。メモリは区間の幅と √${hi - 1} 以下の素数表だけで済む`),
  );
  return frames;
}

// ===========================================================================
// カッコウフィルタ: 棒=スロットの指紋(1〜15。空きは0)。8バケット×2スロット
// ===========================================================================

export const CUCKOO_BUCKETS = 8;
export const CUCKOO_BUCKET_SIZE = 2;
export const CUCKOO_MAX_KICKS = 50;
export const CUCKOO_ITEMS = ["apple", "banana", "cherry", "date", "elder", "fig", "grape", "honey", "iris", "jade", "kiwi", "lemon"];

/** FNV-1a(32bit)。記事の実装例と同じ。 */
export function cuckooHash(data: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) h = Math.imul(h ^ data.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
export const cuckooFingerprint = (item: string): number => (cuckooHash("fp:" + item) % 15) + 1;
export const cuckooBucket1 = (item: string): number => cuckooHash(item) % CUCKOO_BUCKETS;
/** もう一方の候補バケット。XOR なので、往復すると元に戻る。 */
export const cuckooAlt = (index: number, fp: number): number => (index ^ cuckooHash(String(fp))) % CUCKOO_BUCKETS;

export type CuckooRun = { frames: SearchFrame[]; table: number[][]; inserted: string[]; failed: string[] };

export function cuckooFilterRun(): CuckooRun {
  const m = CUCKOO_BUCKETS;
  const b = CUCKOO_BUCKET_SIZE;
  const table: number[][] = Array.from({ length: m }, () => []);
  let state = 12345;
  const rand = () => {
    state = (Math.imul(1103515245, state) + 12345) & 0x7fffffff;
    return state >> 16;
  };
  const bars = () => Array.from({ length: m * b }, (_, k) => table[Math.floor(k / b)][k % b] ?? 0);
  const slotOf = (bucket: number, pos: number) => bucket * b + pos;
  const frames = [
    frame(
      bars(),
      {},
      `${m}バケット×${b}スロットの表(棒=指紋、空きは0)。要素そのものは入れず、数ビットの指紋だけを、2つの候補バケットのどちらかに置く。もう一方の候補は「バケット番号 XOR hash(指紋)」で、指紋だけから求められる`,
    ),
  ];
  const inserted: string[] = [];
  const failed: string[] = [];
  for (const item of CUCKOO_ITEMS) {
    let fp = cuckooFingerprint(item);
    const i1 = cuckooBucket1(item);
    const i2 = cuckooAlt(i1, fp);
    const candidates: Highlight = {};
    for (const bucket of new Set([i1, i2])) for (let p = 0; p < b; p++) candidates[slotOf(bucket, p)] = "comparing";
    frames.push(frame(bars(), candidates, `「${item}」を挿入: 指紋${fp}、候補バケットは ${i1} と ${i2}`));
    let placed = false;
    for (const i of [i1, i2]) {
      if (table[i].length < b) {
        table[i].push(fp);
        frames.push(frame(bars(), { [slotOf(i, table[i].length - 1)]: "pivot" }, `バケット${i}に空きがある → 指紋${fp}を置く`));
        placed = true;
        break;
      }
    }
    if (!placed) {
      let i = [i1, i2][rand() & 1];
      frames.push(frame(bars(), candidates, `どちらのバケットも満杯 → どちらかの指紋を追い出して場所を空ける(バケット${i}から)`));
      for (let kick = 0; kick < CUCKOO_MAX_KICKS && !placed; kick++) {
        const slot = rand() % b;
        const evicted = table[i][slot];
        table[i][slot] = fp;
        const next = cuckooAlt(i, evicted);
        frames.push(
          frame(
            bars(),
            { [slotOf(i, slot)]: "swapping" },
            `バケット${i}のスロット${slot}の指紋${evicted}を追い出し、指紋${fp}を置く。追い出した${evicted}は、もう一方の候補バケット${next}へ`,
          ),
        );
        fp = evicted;
        i = next;
        if (table[i].length < b) {
          table[i].push(fp);
          frames.push(frame(bars(), { [slotOf(i, table[i].length - 1)]: "pivot" }, `バケット${i}に空きがある → 追い出された指紋${fp}を置いて完了`));
          placed = true;
        }
      }
      if (!placed) frames.push(frame(bars(), {}, `追い出しが${CUCKOO_MAX_KICKS}回続いても空きが見つからない → 挿入失敗(表が満杯に近い)`));
    }
    (placed ? inserted : failed).push(item);
  }
  const done: Highlight = {};
  bars().forEach((v, k) => {
    if (v !== 0) done[k] = "settled";
  });
  const found = inserted.filter((item) => {
    const f = cuckooFingerprint(item);
    const j = cuckooBucket1(item);
    return table[j].includes(f) || table[cuckooAlt(j, f)].includes(f);
  }).length;
  frames.push(
    frame(
      bars(),
      done,
      `完了: ${inserted.length}個を格納(負荷率 ${Math.round((inserted.length / (m * b)) * 100)}%)${failed.length ? `、${failed.length}個は失敗` : ""}。格納した${inserted.length}個を検索すると ${found}個が見つかる(追い出しても、指紋は必ず2つの候補のどちらかにあるので取りこぼさない)`,
    ),
  );
  return { frames, table, inserted, failed };
}

export const cuckooFilterSteps = (): SearchFrame[] => cuckooFilterRun().frames;

// ===========================================================================
// Zバッファ: 棒=1本の走査線の各ピクセルの深度(低いほど手前。最も遠い=1.0)。描く順序に依らず、手前が残る
// ===========================================================================

export const ZBUFFER_WIDTH = 24;
export const ZBUFFER_FAR = 1;
export type ZSpan = { name: string; x0: number; x1: number; z0: number; z1: number };
/** 走査線と交わる3つの図形が作る区間(両端を含む。深度は左端 z0 から右端 z1 へ線形に変わる)。 */
export const ZBUFFER_SPANS: ZSpan[] = [
  { name: "A(奥の斜めの面)", x0: 1, x1: 14, z0: 0.9, z1: 0.35 },
  { name: "B(手前の平らな面)", x0: 9, x1: 19, z0: 0.5, z1: 0.5 },
  { name: "C(さらに奥の面)", x0: 15, x1: 22, z0: 0.8, z1: 0.8 },
];

export const zSpanDepth = (s: ZSpan, x: number): number => s.z0 + ((s.z1 - s.z0) * (x - s.x0)) / (s.x1 - s.x0);

/** 指定の順序で描いたときの、最終の深度バッファと、各ピクセルで勝った区間の番号(なければ -1)。 */
export function zBufferResult(order: number[] = ZBUFFER_SPANS.map((_, i) => i)): { depth: number[]; winner: number[] } {
  const depth = Array<number>(ZBUFFER_WIDTH).fill(ZBUFFER_FAR);
  const winner = Array<number>(ZBUFFER_WIDTH).fill(-1);
  for (const si of order) {
    const s = ZBUFFER_SPANS[si];
    for (let x = s.x0; x <= s.x1; x++) {
      const z = zSpanDepth(s, x);
      if (z < depth[x]) {
        depth[x] = z;
        winner[x] = si;
      }
    }
  }
  return { depth, winner };
}

export function zBufferSteps(): SearchFrame[] {
  const depth = Array<number>(ZBUFFER_WIDTH).fill(ZBUFFER_FAR);
  const winner = Array<number>(ZBUFFER_WIDTH).fill(-1);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const frames = [
    frame(
      depth,
      {},
      `画面の1本の走査線(${ZBUFFER_WIDTH}ピクセル)で、3つの面を A → B → C の順に描く。棒は各ピクセルの深度バッファで、低いほど手前(最初は最も遠い ${ZBUFFER_FAR})。新しい面のピクセルが、いまの深度より手前のときだけ上書きする`,
    ),
  ];
  ZBUFFER_SPANS.forEach((s, si) => {
    const range: Highlight = {};
    for (let x = s.x0; x <= s.x1; x++) range[x] = "comparing";
    frames.push(
      frame(depth, range, `面${s.name}を描く: x=${s.x0}〜${s.x1}、深度は ${s.z0} から ${s.z1} へ線形に変わる(頂点の深度を補間して各ピクセルの深度を得る)`),
    );
    const marks: Highlight = {};
    let wrote = 0;
    let rejected = 0;
    for (let x = s.x0; x <= s.x1; x++) {
      const z = zSpanDepth(s, x);
      if (z < depth[x]) {
        depth[x] = z;
        winner[x] = si;
        marks[x] = "pivot";
        wrote++;
      } else {
        marks[x] = "swapping";
        rejected++;
      }
    }
    frames.push(
      frame(
        depth,
        marks,
        `${s.name}の深度テスト: ${wrote}ピクセルは、いまの深度より手前なので深度(と色)を上書き。${rejected}ピクセルは、すでに手前の面があるので捨てる${rejected === 0 ? "" : "(深度が変わらない)"}`,
      ),
    );
  });
  const done: Highlight = {};
  depth.forEach((_, x) => {
    if (winner[x] >= 0) done[x] = "settled";
  });
  const reversed = zBufferResult([2, 1, 0]);
  const same = reversed.depth.every((v, x) => Math.abs(v - depth[x]) < 1e-12);
  frames.push(
    frame(
      depth,
      done,
      `完了: 各ピクセルで最も手前の面が残った(${ZBUFFER_SPANS.map((s, i) => `${s.name.slice(0, 1)}=${winner.filter((w) => w === i).length}px`).join("・")}。最小の深度 ${round2(Math.min(...depth))})。描く順序を C → B → A に変えても、結果は${same ? "完全に同じ" : "異なる"}。画家のアルゴリズムのような並べ替えは不要`,
    ),
  );
  return frames;
}

export const STRUCTURE_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  "bitonic-sort": bitonicSortSteps,
  "binary-heap": binaryHeapSteps,
  "robin-hood-hashing": robinHoodSteps,
  "sos-dp": sosDpSteps,
  "segmented-sieve": segmentedSieveSteps,
  "cuckoo-filter": cuckooFilterSteps,
  "z-buffer": zBufferSteps,
};
