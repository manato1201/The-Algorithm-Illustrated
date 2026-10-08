import type { StateColorKey } from "@/lib/design-tokens";
import type { DPFrame } from "@/lib/dp-visualizers";
import type { GeometryFrame } from "@/lib/geometry-visualizers";
import type { GraphFrame } from "@/lib/graph-visualizers";
import type { LaneFrame } from "@/lib/lane-visualizers";
import type { GridCellState, GridFrame } from "@/lib/pathfinding-visualizers";
import type { StringMatchFrame } from "@/lib/string-visualizers";
import type { TreeFrame } from "@/lib/tree-visualizers";
import type { TrieFrame } from "@/lib/trie-visualizer";

/**
 * 下部タイムライン(IMPROVEMENT_DESIGN_2026-10 U1)用の、1ステップあたりの状態種別。
 * 可視化kindごとに状態名が違う(GraphNodeStateのvisited、TreeNodeStateのrotating等)ため、
 * 共通の状態語彙(idle/comparing/swapping/pivot/settled)に正規化して扱う。
 */
export type StepKind = StateColorKey;

type EntityStates = Map<string, StepKind>;

/** 同じステップで複数の状態が混在したときの優先順位(注目すべき順)。 */
const PRIORITY: readonly StepKind[] = [
  "swapping",
  "comparing",
  "pivot",
  "settled",
];

function dominantKind(kinds: Iterable<StepKind>): StepKind {
  const present = new Set(kinds);
  for (const kind of PRIORITY) {
    if (present.has(kind)) return kind;
  }
  return "idle";
}

/**
 * 全フレームから、各ステップの状態種別を求める。
 * 「そのステップで前のフレームから変化した要素」の状態を優先する(比較→確定のように、
 * 蓄積した確定済み要素が毎フレーム残っていても、そのステップで起きたことが分かるように)。
 * 何も変化していないフレームは、現在の状態全体の優先順位で決める。
 * 先頭フレームは初期状態なので idle とする。
 * 状態はフレームから導出するだけなので、巻き戻しても同じステップは常に同じ種別になる。
 */
export function buildStepKinds<F>(
  frames: readonly F[],
  toEntities: (frame: F) => EntityStates,
): StepKind[] {
  const kinds: StepKind[] = [];
  let previous: EntityStates | null = null;
  for (const frame of frames) {
    const current = toEntities(frame);
    if (previous === null) {
      kinds.push("idle");
    } else {
      const changed: StepKind[] = [];
      for (const [key, kind] of current) {
        if (kind !== "idle" && previous.get(key) !== kind) changed.push(kind);
      }
      kinds.push(
        changed.length > 0
          ? dominantKind(changed)
          : dominantKind(current.values()),
      );
    }
    previous = current;
  }
  return kinds;
}

/** 0..stepIndex までの各種別のステップ数(比較回数・交換回数のカウンタ用)。巻き戻すと同じ時点の値に戻る。 */
export function countKindsUpTo(
  kinds: readonly StepKind[],
  stepIndex: number,
): Record<StepKind, number> {
  const counts: Record<StepKind, number> = {
    idle: 0,
    comparing: 0,
    swapping: 0,
    pivot: 0,
    settled: 0,
  };
  const last = Math.min(stepIndex, kinds.length - 1);
  for (let i = 0; i <= last; i++) counts[kinds[i]]++;
  return counts;
}

// ---- 可視化kindごとのアダプタ(フレーム→要素ごとの状態) ----

/** highlight(index→状態)を持つ配列系(ソート・探索)。 */
export function highlightEntities(frame: {
  highlight: Partial<Record<number, StepKind>>;
}): EntityStates {
  const map: EntityStates = new Map();
  for (const [index, kind] of Object.entries(frame.highlight)) {
    map.set(index, kind ?? "idle");
  }
  return map;
}

const GRID_KIND: Record<GridCellState, StepKind> = {
  idle: "idle",
  wall: "idle",
  start: "idle",
  goal: "idle",
  difficult: "idle",
  frontier: "pivot",
  visited: "comparing",
  path: "settled",
};

export function gridEntities(frame: GridFrame): EntityStates {
  const map: EntityStates = new Map();
  frame.cellStates.forEach((row, r) => {
    row.forEach((state, c) => {
      const kind = GRID_KIND[state];
      if (kind !== "idle") map.set(`${r},${c}`, kind);
    });
  });
  return map;
}

export function dpEntities(frame: DPFrame): EntityStates {
  const map: EntityStates = new Map();
  frame.table.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell.state !== "idle") map.set(`${r},${c}`, cell.state);
    });
  });
  return map;
}

export function graphEntities(frame: GraphFrame): EntityStates {
  const map: EntityStates = new Map();
  for (const [id, state] of Object.entries(frame.nodeStates)) {
    if (state === "visited") map.set(`n:${id}`, "comparing");
    else if (state === "settled") map.set(`n:${id}`, "settled");
  }
  for (const [id, state] of Object.entries(frame.edgeStates)) {
    if (state === "checking") map.set(`e:${id}`, "pivot");
    else if (state === "relaxed") map.set(`e:${id}`, "comparing");
    else if (state === "tree") map.set(`e:${id}`, "settled");
    else if (state === "rejected") map.set(`e:${id}`, "swapping");
  }
  return map;
}

export function treeEntities(frame: TreeFrame): EntityStates {
  const map: EntityStates = new Map();
  for (const [id, state] of Object.entries(frame.nodeStates)) {
    if (state === "visiting") map.set(id, "comparing");
    else if (state === "inserted") map.set(id, "settled");
    else if (state === "rotating") map.set(id, "swapping");
  }
  return map;
}

export function trieEntities(frame: TrieFrame): EntityStates {
  const map: EntityStates = new Map();
  for (const [id, state] of Object.entries(frame.nodeStates)) {
    if (state === "visiting") map.set(id, "comparing");
    else if (state === "inserted") map.set(id, "settled");
    else if (state === "matched") map.set(id, "pivot");
  }
  return map;
}

export function stringEntities(frame: StringMatchFrame): EntityStates {
  const map: EntityStates = new Map();
  const add = (
    prefix: string,
    highlight: StringMatchFrame["textHighlight"],
  ) => {
    for (const [index, state] of Object.entries(highlight)) {
      if (state === "matching") map.set(`${prefix}${index}`, "comparing");
      else if (state === "mismatch") map.set(`${prefix}${index}`, "swapping");
      else if (state === "matched") map.set(`${prefix}${index}`, "settled");
    }
  };
  add("t", frame.textHighlight);
  add("p", frame.patternHighlight);
  return map;
}

export function geometryEntities(frame: GeometryFrame): EntityStates {
  const map: EntityStates = new Map();
  for (const [id, state] of Object.entries(frame.pointStates)) {
    if (state === "candidate") map.set(`p:${id}`, "comparing");
    else if (state === "hull") map.set(`p:${id}`, "settled");
    else if (state === "current" || state === "sweep")
      map.set(`p:${id}`, "pivot");
    else if (state === "rejected") map.set(`p:${id}`, "swapping");
  }
  frame.segments.forEach((segment) => {
    const key = `s:${segment.from}-${segment.to}`;
    if (segment.state === "active") map.set(key, "pivot");
    else if (segment.state === "final") map.set(key, "settled");
    else map.set(key, "swapping");
  });
  return map;
}

/**
 * レーン可視化(A1)用。複数レーンが同じステップで進むので、要素の差分ではなく
 * 「そのステップでいずれかのレーンが新たに完了したか」で決める(完了=確定、それ以外の進行中=比較中)。
 */
export function laneStepKinds(frames: readonly LaneFrame[]): StepKind[] {
  return frames.map((frame, index) => {
    if (index === 0) return "idle";
    const previous = frames[index - 1];
    const newlyFinished = frame.lanes.some(
      (lane, laneIndex) => lane.finished && !previous.lanes[laneIndex].finished,
    );
    return newlyFinished ? "settled" : "comparing";
  });
}
