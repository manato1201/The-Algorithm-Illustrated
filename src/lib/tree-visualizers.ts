export type TreeNodeState = "idle" | "visiting" | "inserted" | "rotating";

export type TreeNode = {
  id: string;
  value: number;
  left: string | null;
  right: string | null;
  /** 赤黒木のみ使用。回転処理で親をたどる必要があるため親IDを保持する。 */
  parent?: string | null;
  /** 赤黒木のみ使用。それ以外のアルゴリズムでは未設定のまま(描画側は既存の状態パレットにフォールバックする)。 */
  color?: "red" | "black";
  /** 区間木のみ使用。区間の上端(valueを下端として扱う)。 */
  hi?: number;
  /** 区間木のみ使用。部分木内の上端(hi)の最大値。左右の子の挿入・更新のたびに再計算する。 */
  maxHigh?: number;
};

export type TreeFrame = {
  nodes: Record<string, TreeNode>;
  rootId: string | null;
  nodeStates: Record<string, TreeNodeState>;
  description: string;
};

function cloneNodes(nodes: Record<string, TreeNode>): Record<string, TreeNode> {
  const clone: Record<string, TreeNode> = {};
  for (const [id, node] of Object.entries(nodes)) {
    clone[id] = { ...node };
  }
  return clone;
}

/**
 * rootIdからleft/rightをたどって到達できるノードだけを抜き出す。
 * TreeVisualizer(canvas描画側)はrootIdからの到達可能性だけでレイアウト座標を割り振る
 * (computeLayoutがinorder(rootId, 0)から辿るだけで、到達できないノードには座標が
 * 割り振られない)ため、木全体でなく「森(複数の未結合な部分木が同時に存在する状態)」を
 * そのままnodesに入れるとレイアウトが壊れる。マークル木の構築途中(まだペアになっていない
 * 葉が複数ある状態)やUPGMA・近隣結合法の構築途中(複数の未結合クラスタが同時に存在する状態)
 * では、このヘルパーで「現在のrootIdから辿り着ける部分木」だけを毎フレーム抽出して使う。
 */
function reachableNodes(
  nodes: Record<string, TreeNode>,
  rootId: string | null,
): Record<string, TreeNode> {
  const result: Record<string, TreeNode> = {};
  const visit = (id: string | null) => {
    if (id === null || result[id]) return;
    result[id] = { ...nodes[id] };
    visit(nodes[id].left);
    visit(nodes[id].right);
  };
  visit(rootId);
  return result;
}

export const BST_INSERT_SEQUENCE = [50, 30, 70, 20, 40, 60, 80, 10];

/**
 * 二分探索木への挿入シーケンスのステップ列を生成する。
 * 回転は行わないため、挿入順序によっては木が偏る(AVL木・Treapとの対比になる)。
 */
export function bstSteps(): TreeFrame[] {
  const nodes: Record<string, TreeNode> = {};
  let rootId: string | null = null;
  const frames: TreeFrame[] = [];

  const snapshot = (
    nodeStates: Record<string, TreeNodeState>,
    description: string,
  ): TreeFrame => ({
    nodes: cloneNodes(nodes),
    rootId,
    nodeStates: { ...nodeStates },
    description,
  });

  frames.push(snapshot({}, "初期状態(空の木)"));

  for (const value of BST_INSERT_SEQUENCE) {
    const id = String(value);
    nodes[id] = { id, value, left: null, right: null };

    if (rootId === null) {
      rootId = id;
      frames.push(
        snapshot({ [id]: "inserted" }, `値${value}をルートとして挿入`),
      );
      continue;
    }

    let curId = rootId;
    const visited: string[] = [];
    for (;;) {
      visited.push(curId);
      const highlight: Record<string, TreeNodeState> = {};
      visited.forEach((v) => {
        highlight[v] = "visiting";
      });
      frames.push(
        snapshot(
          highlight,
          `値${value}を挿入する位置を探索中(現在: ${nodes[curId].value})`,
        ),
      );

      const cur = nodes[curId];
      if (value < cur.value) {
        if (cur.left === null) {
          cur.left = id;
          break;
        }
        curId = cur.left;
      } else {
        if (cur.right === null) {
          cur.right = id;
          break;
        }
        curId = cur.right;
      }
    }
    frames.push(snapshot({ [id]: "inserted" }, `値${value}を挿入`));
  }

  frames.push(
    snapshot(
      {},
      `挿入完了。${BST_INSERT_SEQUENCE.length}個の値からなる二分探索木が完成(回転は行わないため偏りうる)`,
    ),
  );
  return frames;
}

export const AVL_INSERT_SEQUENCE = [10, 20, 30, 40, 50, 25];

/**
 * AVL木への挿入シーケンスのステップ列を生成する。
 * 挿入のたびに各頂点の平衡係数(左部分木の高さ - 右部分木の高さ)を確認し、
 * ±2以上になったらLL/RR/LR/RLいずれかの回転で高さ差を1以内に戻す。
 * 挿入順序[10,20,30,40,50,25]は、RR回転(10→20→30)とLR回転(40→50→25の後)の両方が発生する古典的な例。
 */
export function avlTreeSteps(): TreeFrame[] {
  const nodes: Record<string, TreeNode> = {};
  const heights: Record<string, number> = {};
  let rootId: string | null = null;
  const frames: TreeFrame[] = [];

  const snapshot = (
    nodeStates: Record<string, TreeNodeState>,
    description: string,
  ): TreeFrame => ({
    nodes: cloneNodes(nodes),
    rootId,
    nodeStates: { ...nodeStates },
    description,
  });

  const height = (id: string | null) => (id === null ? 0 : heights[id]);
  const updateHeight = (id: string) => {
    const n = nodes[id];
    heights[id] = 1 + Math.max(height(n.left), height(n.right));
  };
  const balanceFactor = (id: string) =>
    height(nodes[id].left) - height(nodes[id].right);

  const rotateRight = (id: string): string => {
    const n = nodes[id];
    const leftId = n.left!;
    const left = nodes[leftId];
    n.left = left.right;
    left.right = id;
    updateHeight(id);
    updateHeight(leftId);
    return leftId;
  };
  const rotateLeft = (id: string): string => {
    const n = nodes[id];
    const rightId = n.right!;
    const right = nodes[rightId];
    n.right = right.left;
    right.left = id;
    updateHeight(id);
    updateHeight(rightId);
    return rightId;
  };

  const insert = (id: string | null, newId: string): string => {
    if (id === null) return newId;
    const n = nodes[id];
    const newVal = nodes[newId].value;

    if (newVal < n.value) {
      n.left = insert(n.left, newId);
    } else {
      n.right = insert(n.right, newId);
    }
    updateHeight(id);
    const bf = balanceFactor(id);

    if (bf > 1 && newVal < nodes[n.left!].value) {
      frames.push(
        snapshot(
          { [id]: "rotating", [n.left!]: "rotating" },
          `頂点${n.value}で左部分木が高くなりすぎた(LL型) → 右回転`,
        ),
      );
      return rotateRight(id);
    }
    if (bf < -1 && newVal > nodes[n.right!].value) {
      frames.push(
        snapshot(
          { [id]: "rotating", [n.right!]: "rotating" },
          `頂点${n.value}で右部分木が高くなりすぎた(RR型) → 左回転`,
        ),
      );
      return rotateLeft(id);
    }
    if (bf > 1 && newVal > nodes[n.left!].value) {
      frames.push(
        snapshot(
          { [n.left!]: "rotating" },
          `頂点${n.value}で左部分木が高くなりすぎた(LR型) → 左部分木を左回転してから右回転`,
        ),
      );
      n.left = rotateLeft(n.left!);
      return rotateRight(id);
    }
    if (bf < -1 && newVal < nodes[n.right!].value) {
      frames.push(
        snapshot(
          { [n.right!]: "rotating" },
          `頂点${n.value}で右部分木が高くなりすぎた(RL型) → 右部分木を右回転してから左回転`,
        ),
      );
      n.right = rotateRight(n.right!);
      return rotateLeft(id);
    }

    return id;
  };

  frames.push(snapshot({}, "初期状態(空の木)"));

  for (const value of AVL_INSERT_SEQUENCE) {
    const id = String(value);
    nodes[id] = { id, value, left: null, right: null };
    heights[id] = 1;
    frames.push(snapshot({ [id]: "visiting" }, `値${value}を挿入`));
    rootId = insert(rootId, id);
    frames.push(
      snapshot(
        { [id]: "inserted" },
        `値${value}の挿入完了(必要な回転を適用済み)`,
      ),
    );
  }

  frames.push(
    snapshot(
      {},
      `挿入完了。${AVL_INSERT_SEQUENCE.length}個の値から、どの頂点でも左右の高さ差が1以内の自己平衡二分探索木が完成`,
    ),
  );
  return frames;
}

export const TREAP_INSERT_SEQUENCE = [50, 30, 70, 20, 40, 60, 80];

/**
 * 乱数の代わりに固定の優先度を割り当てたTreap(ツリー+ヒープ)への挿入シーケンス。
 * BSTとしての順序(値の大小)を保ちながら、ヒープとしての順序(優先度の大小)も保つよう、
 * 子の優先度が親を上回った時点で回転して優先度の高い頂点を上に押し上げる。
 * 優先度をランダムに割り振ることで、期待計算量O(log n)の平衡木を確率的に実現するのがTreapの発想。
 */
export function treapSteps(): TreeFrame[] {
  const nodes: Record<string, TreeNode> = {};
  const priorities: Record<string, number> = {};
  const fixedPriorities: Record<number, number> = {
    50: 45,
    30: 80,
    70: 20,
    20: 90,
    40: 60,
    60: 30,
    80: 10,
  };
  let rootId: string | null = null;
  const frames: TreeFrame[] = [];

  const snapshot = (
    nodeStates: Record<string, TreeNodeState>,
    description: string,
  ): TreeFrame => ({
    nodes: cloneNodes(nodes),
    rootId,
    nodeStates: { ...nodeStates },
    description,
  });

  const rotateRight = (id: string): string => {
    const n = nodes[id];
    const leftId = n.left!;
    const left = nodes[leftId];
    n.left = left.right;
    left.right = id;
    return leftId;
  };
  const rotateLeft = (id: string): string => {
    const n = nodes[id];
    const rightId = n.right!;
    const right = nodes[rightId];
    n.right = right.left;
    right.left = id;
    return rightId;
  };

  const insert = (id: string | null, newId: string): string => {
    if (id === null) return newId;
    const n = nodes[id];
    const newVal = nodes[newId].value;

    if (newVal < n.value) {
      n.left = insert(n.left, newId);
      if (priorities[n.left] > priorities[id]) {
        frames.push(
          snapshot(
            { [id]: "rotating" },
            `頂点${n.value}より左の子の優先度が高い(ヒープ条件違反) → 右回転`,
          ),
        );
        return rotateRight(id);
      }
    } else {
      n.right = insert(n.right, newId);
      if (priorities[n.right] > priorities[id]) {
        frames.push(
          snapshot(
            { [id]: "rotating" },
            `頂点${n.value}より右の子の優先度が高い(ヒープ条件違反) → 左回転`,
          ),
        );
        return rotateLeft(id);
      }
    }
    return id;
  };

  frames.push(snapshot({}, "初期状態(空の木)"));

  for (const value of TREAP_INSERT_SEQUENCE) {
    const id = String(value);
    const priority = fixedPriorities[value];
    nodes[id] = { id, value, left: null, right: null };
    priorities[id] = priority;
    frames.push(
      snapshot(
        { [id]: "visiting" },
        `値${value}(優先度${priority}、本来は乱数で決定)を挿入`,
      ),
    );
    rootId = insert(rootId, id);
    frames.push(
      snapshot(
        { [id]: "inserted" },
        `値${value}の挿入完了(ヒープ条件を保つよう回転を適用済み)`,
      ),
    );
  }

  frames.push(
    snapshot(
      {},
      "挿入完了。BSTとしての順序とヒープとしての優先度を両立するTreapが完成",
    ),
  );
  return frames;
}

export const RED_BLACK_INSERT_SEQUENCE = [10, 20, 30, 15, 25, 5, 1];

/**
 * 赤黒木への挿入シーケンス(CLRS方式)のステップ列を生成する。
 * 新しい頂点は必ず赤として挿入し、赤黒木の性質(根は黒/赤の子は必ず黒/根から葉までの黒頂点数が均一)
 * が崩れた場合に、叔父の色に応じて2パターンで修正する:
 * - 叔父も赤 → 親・叔父を黒、祖父を赤に再彩色して問題を祖父の位置へ伝播させる(回転なし)
 * - 叔父が黒(またはnull) → ジグザグなら回転で直線に整形してから、親を黒・祖父を赤に再彩色し祖父を回転
 * 回転にはノードの親をたどる必要があるため、他の木構造とは異なりTreeNode.parentを使用する。
 */
export function redBlackTreeSteps(): TreeFrame[] {
  const nodes: Record<string, TreeNode> = {};
  let rootId: string | null = null;
  const frames: TreeFrame[] = [];

  const snapshot = (nodeStates: Record<string, TreeNodeState>, description: string): TreeFrame => ({
    nodes: cloneNodes(nodes),
    rootId,
    nodeStates: { ...nodeStates },
    description,
  });

  const isRed = (id: string | null) => id !== null && nodes[id].color === "red";
  const parentOf = (id: string | null): string | null => (id === null ? null : (nodes[id].parent ?? null));
  const grandparentOf = (id: string | null): string | null => parentOf(parentOf(id));
  const siblingOf = (id: string): string | null => {
    const p = parentOf(id);
    if (p === null) return null;
    return nodes[p].left === id ? nodes[p].right : nodes[p].left;
  };
  const uncleOf = (id: string): string | null => {
    const p = parentOf(id);
    return p === null ? null : siblingOf(p);
  };

  const rotateLeft = (id: string) => {
    const node = nodes[id];
    const rightId = node.right!;
    const right = nodes[rightId];
    node.right = right.left;
    if (right.left !== null) nodes[right.left].parent = id;
    right.parent = node.parent ?? null;
    if (node.parent == null) {
      rootId = rightId;
    } else if (nodes[node.parent].left === id) {
      nodes[node.parent].left = rightId;
    } else {
      nodes[node.parent].right = rightId;
    }
    right.left = id;
    node.parent = rightId;
  };

  const rotateRight = (id: string) => {
    const node = nodes[id];
    const leftId = node.left!;
    const left = nodes[leftId];
    node.left = left.right;
    if (left.right !== null) nodes[left.right].parent = id;
    left.parent = node.parent ?? null;
    if (node.parent == null) {
      rootId = leftId;
    } else if (nodes[node.parent].right === id) {
      nodes[node.parent].right = leftId;
    } else {
      nodes[node.parent].left = leftId;
    }
    left.right = id;
    node.parent = leftId;
  };

  const fixInsert = (startId: string) => {
    let id = startId;
    while (isRed(parentOf(id))) {
      const p = parentOf(id)!;
      const gp = grandparentOf(id)!;
      const u = uncleOf(id);

      if (p === nodes[gp].left) {
        if (u !== null && isRed(u)) {
          nodes[p].color = "black";
          nodes[u].color = "black";
          nodes[gp].color = "red";
          frames.push(
            snapshot(
              { [p]: "rotating", [u]: "rotating", [gp]: "rotating" },
              `叔父${nodes[u].value}も赤 → 親と叔父を黒、祖父${nodes[gp].value}を赤に再彩色して問題を上へ伝播`,
            ),
          );
          id = gp;
        } else {
          if (id === nodes[p].right) {
            id = p;
            rotateLeft(id);
            frames.push(snapshot({ [id]: "rotating" }, "叔父が黒でジグザグ形 → 左回転して直線形に整形"));
          }
          const newP = parentOf(id)!;
          const newGp = grandparentOf(id)!;
          nodes[newP].color = "black";
          nodes[newGp].color = "red";
          rotateRight(newGp);
          frames.push(
            snapshot(
              { [newP]: "rotating", [newGp]: "rotating" },
              "叔父が黒で直線形 → 親を黒・祖父を赤に再彩色し、祖父を右回転",
            ),
          );
        }
      } else {
        if (u !== null && isRed(u)) {
          nodes[p].color = "black";
          nodes[u].color = "black";
          nodes[gp].color = "red";
          frames.push(
            snapshot(
              { [p]: "rotating", [u]: "rotating", [gp]: "rotating" },
              `叔父${nodes[u].value}も赤 → 親と叔父を黒、祖父${nodes[gp].value}を赤に再彩色して問題を上へ伝播`,
            ),
          );
          id = gp;
        } else {
          if (id === nodes[p].left) {
            id = p;
            rotateRight(id);
            frames.push(snapshot({ [id]: "rotating" }, "叔父が黒でジグザグ形 → 右回転して直線形に整形"));
          }
          const newP = parentOf(id)!;
          const newGp = grandparentOf(id)!;
          nodes[newP].color = "black";
          nodes[newGp].color = "red";
          rotateLeft(newGp);
          frames.push(
            snapshot(
              { [newP]: "rotating", [newGp]: "rotating" },
              "叔父が黒で直線形 → 親を黒・祖父を赤に再彩色し、祖父を左回転",
            ),
          );
        }
      }
      if (id === rootId) break;
    }
    nodes[rootId!].color = "black";
  };

  frames.push(snapshot({}, "初期状態(空の木)"));

  for (const value of RED_BLACK_INSERT_SEQUENCE) {
    const id = String(value);
    nodes[id] = { id, value, left: null, right: null, parent: null, color: "red" };

    if (rootId === null) {
      rootId = id;
    } else {
      let curId = rootId;
      for (;;) {
        const cur = nodes[curId];
        if (value < cur.value) {
          if (cur.left === null) {
            cur.left = id;
            nodes[id].parent = curId;
            break;
          }
          curId = cur.left;
        } else {
          if (cur.right === null) {
            cur.right = id;
            nodes[id].parent = curId;
            break;
          }
          curId = cur.right;
        }
      }
    }
    frames.push(snapshot({ [id]: "visiting" }, `値${value}を赤色の葉として挿入`));
    fixInsert(id);
    frames.push(snapshot({}, `値${value}の挿入完了(赤黒木の性質を維持するよう再彩色・回転を適用済み)`));
  }

  frames.push(
    snapshot(
      {},
      `挿入完了。${RED_BLACK_INSERT_SEQUENCE.length}個の値から赤黒木が完成(根は黒、赤の子は必ず黒、根から葉までの黒頂点数が均一)`,
    ),
  );
  return frames;
}

export const SPLAY_TREE_INSERT_SEQUENCE = [40, 20, 60, 10, 30, 50, 70];
export const SPLAY_TREE_ACCESS_VALUE = 10;

/**
 * スプレー木への挿入・アクセスのステップ列を生成する。AVL木・赤黒木のような
 * 平衡条件(高さや色)を維持する代わりに、挿入または探索でアクセスした頂点を
 * 毎回「スプレー操作」(zig/zig-zig/zig-zagという3種類の回転パターン)でルートまで
 * 押し上げる。頻繁にアクセスされる要素ほどルート付近に留まりやすくなるため、
 * アクセスパターンに偏りがある実データに対して償却計算量O(log n)を達成できる
 * (最悪計算量の保証はAVL木・赤黒木に劣るが、局所性を活かせる場面で有利)。
 */
export function splayTreeSteps(): TreeFrame[] {
  const nodes: Record<string, TreeNode> = {};
  let rootId: string | null = null;
  const frames: TreeFrame[] = [];

  const snapshot = (nodeStates: Record<string, TreeNodeState>, description: string): TreeFrame => ({
    nodes: cloneNodes(nodes),
    rootId,
    nodeStates: { ...nodeStates },
    description,
  });

  const rotateLeft = (id: string) => {
    const node = nodes[id];
    const rightId = node.right!;
    const right = nodes[rightId];
    node.right = right.left;
    if (right.left !== null) nodes[right.left].parent = id;
    right.parent = node.parent ?? null;
    if (node.parent == null) rootId = rightId;
    else if (nodes[node.parent].left === id) nodes[node.parent].left = rightId;
    else nodes[node.parent].right = rightId;
    right.left = id;
    node.parent = rightId;
  };

  const rotateRight = (id: string) => {
    const node = nodes[id];
    const leftId = node.left!;
    const left = nodes[leftId];
    node.left = left.right;
    if (left.right !== null) nodes[left.right].parent = id;
    left.parent = node.parent ?? null;
    if (node.parent == null) rootId = leftId;
    else if (nodes[node.parent].right === id) nodes[node.parent].right = leftId;
    else nodes[node.parent].left = leftId;
    left.right = id;
    node.parent = leftId;
  };

  const splay = (id: string, descPrefix: string) => {
    while (nodes[id].parent != null) {
      const p = nodes[id].parent!;
      const g = nodes[p].parent ?? null;
      if (g === null) {
        if (nodes[p].left === id) rotateRight(p);
        else rotateLeft(p);
        frames.push(
          snapshot({ [id]: "rotating" }, `${descPrefix}: zig回転(親を1回転して頂点${nodes[id].value}を1段上げる)`),
        );
      } else {
        const idIsLeftOfP = nodes[p].left === id;
        const pIsLeftOfG = nodes[g].left === p;
        if (idIsLeftOfP === pIsLeftOfG) {
          if (idIsLeftOfP) {
            rotateRight(g);
            rotateRight(p);
          } else {
            rotateLeft(g);
            rotateLeft(p);
          }
          frames.push(
            snapshot(
              { [id]: "rotating" },
              `${descPrefix}: zig-zig回転(親と祖父を同じ向きに2回転し、頂点${nodes[id].value}を2段上げる)`,
            ),
          );
        } else {
          if (idIsLeftOfP) {
            rotateRight(p);
            rotateLeft(g);
          } else {
            rotateLeft(p);
            rotateRight(g);
          }
          frames.push(
            snapshot(
              { [id]: "rotating" },
              `${descPrefix}: zig-zag回転(親と祖父を逆向きに2回転し、頂点${nodes[id].value}を2段上げる)`,
            ),
          );
        }
      }
    }
  };

  frames.push(snapshot({}, "初期状態(空の木)。スプレー木は挿入・探索のたびにアクセスした頂点をルートまで押し上げる"));

  for (const value of SPLAY_TREE_INSERT_SEQUENCE) {
    const id = String(value);
    nodes[id] = { id, value, left: null, right: null, parent: null };

    if (rootId === null) {
      rootId = id;
      frames.push(snapshot({ [id]: "inserted" }, `値${value}をルートとして挿入`));
      continue;
    }

    let curId = rootId;
    const visited: string[] = [];
    for (;;) {
      visited.push(curId);
      const highlight: Record<string, TreeNodeState> = {};
      visited.forEach((v) => {
        highlight[v] = "visiting";
      });
      frames.push(snapshot(highlight, `値${value}を挿入する位置を探索中(現在: ${nodes[curId].value})`));

      const cur = nodes[curId];
      if (value < cur.value) {
        if (cur.left === null) {
          cur.left = id;
          nodes[id].parent = curId;
          break;
        }
        curId = cur.left;
      } else {
        if (cur.right === null) {
          cur.right = id;
          nodes[id].parent = curId;
          break;
        }
        curId = cur.right;
      }
    }
    frames.push(snapshot({ [id]: "inserted" }, `値${value}を葉として挿入。ここからスプレー操作でルートまで押し上げる`));
    splay(id, `値${value}のスプレー`);
    frames.push(snapshot({ [id]: "inserted" }, `値${value}がルートに到達`));
  }

  frames.push(
    snapshot({}, `挿入完了。${SPLAY_TREE_INSERT_SEQUENCE.length}個の値を挿入(挿入のたびにルートまでスプレーした)`),
  );

  const accessValue = SPLAY_TREE_ACCESS_VALUE;
  let curId = rootId!;
  const visited: string[] = [];
  for (;;) {
    visited.push(curId);
    const highlight: Record<string, TreeNodeState> = {};
    visited.forEach((v) => {
      highlight[v] = "visiting";
    });
    frames.push(snapshot(highlight, `値${accessValue}へのアクセス(探索)を開始。現在: ${nodes[curId].value}`));
    const cur = nodes[curId];
    if (cur.value === accessValue) break;
    curId = accessValue < cur.value ? cur.left! : cur.right!;
  }
  frames.push(
    snapshot(
      { [curId]: "visiting" },
      `値${accessValue}を発見。スプレー操作でルートまで押し上げる(頻繁にアクセスされる要素をルート付近に留める、スプレー木の核心)`,
    ),
  );
  splay(curId, `値${accessValue}へのアクセスによるスプレー`);
  frames.push(snapshot({ [curId]: "inserted" }, `計算完了。値${accessValue}が新しいルートになった`));

  return frames;
}

export type IntervalTreeInterval = { lo: number; hi: number };
/** CLRS(Cormen等)の教科書に登場する古典的な区間集合の例。 */
export const INTERVAL_TREE_INTERVALS: IntervalTreeInterval[] = [
  { lo: 15, hi: 20 },
  { lo: 10, hi: 30 },
  { lo: 17, hi: 19 },
  { lo: 5, hi: 20 },
  { lo: 12, hi: 15 },
  { lo: 30, hi: 40 },
];
export const INTERVAL_TREE_QUERY: IntervalTreeInterval = { lo: 14, hi: 16 };

/**
 * 区間木のステップ列を生成する。区間の下端(lo)をキーとするBSTに、
 * 各頂点が「自分を根とする部分木に含まれる区間の上端(hi)の最大値」(maxHigh)を
 * 併せて持たせる(挿入のたびに祖先へ再計算を伝播させる)。この補助情報のおかげで、
 * クエリ区間と重ならない部分木を「左の子のmaxHighがクエリの下端より小さければ、
 * 左の子孫はどれもクエリと重なりえない」という条件だけで枝刈りでき、
 * 全区間を1つずつ調べるO(n)ではなくO(log n)で(1つの)重なる区間を発見できる。
 */
export function intervalTreeSteps(): TreeFrame[] {
  const nodes: Record<string, TreeNode> = {};
  let rootId: string | null = null;
  const frames: TreeFrame[] = [];

  const snapshot = (nodeStates: Record<string, TreeNodeState>, description: string): TreeFrame => ({
    nodes: cloneNodes(nodes),
    rootId,
    nodeStates: { ...nodeStates },
    description,
  });

  const updateMaxUpward = (id: string | null) => {
    let cur = id;
    while (cur !== null) {
      const node = nodes[cur];
      let m = node.hi!;
      if (node.left !== null) m = Math.max(m, nodes[node.left].maxHigh!);
      if (node.right !== null) m = Math.max(m, nodes[node.right].maxHigh!);
      node.maxHigh = m;
      cur = node.parent ?? null;
    }
  };

  frames.push(
    snapshot({}, "初期状態(空の区間木)。各区間の下端(lo)をキーとするBSTに、部分木内の上端(hi)の最大値maxHighを併せて管理する"),
  );

  for (const interval of INTERVAL_TREE_INTERVALS) {
    const id = `${interval.lo}-${interval.hi}`;
    nodes[id] = {
      id,
      value: interval.lo,
      hi: interval.hi,
      maxHigh: interval.hi,
      left: null,
      right: null,
      parent: null,
    };

    if (rootId === null) {
      rootId = id;
      frames.push(snapshot({ [id]: "inserted" }, `区間[${interval.lo},${interval.hi}]をルートとして挿入`));
      continue;
    }

    let curId = rootId;
    const visited: string[] = [];
    for (;;) {
      visited.push(curId);
      const highlight: Record<string, TreeNodeState> = {};
      visited.forEach((v) => {
        highlight[v] = "visiting";
      });
      frames.push(
        snapshot(
          highlight,
          `区間[${interval.lo},${interval.hi}]を挿入する位置を探索中(現在: [${nodes[curId].value},${nodes[curId].hi}])`,
        ),
      );

      const cur = nodes[curId];
      if (interval.lo < cur.value) {
        if (cur.left === null) {
          cur.left = id;
          nodes[id].parent = curId;
          break;
        }
        curId = cur.left;
      } else {
        if (cur.right === null) {
          cur.right = id;
          nodes[id].parent = curId;
          break;
        }
        curId = cur.right;
      }
    }
    updateMaxUpward(id);
    frames.push(snapshot({ [id]: "inserted" }, `区間[${interval.lo},${interval.hi}]を挿入。祖先のmaxHighを再計算して伝播`));
  }

  frames.push(snapshot({}, `構築完了。${INTERVAL_TREE_INTERVALS.length}個の区間からなる区間木が完成`));

  const query = INTERVAL_TREE_QUERY;
  const overlaps = (a: IntervalTreeInterval, b: IntervalTreeInterval) => a.lo <= b.hi && b.lo <= a.hi;
  let curId: string | null = rootId;
  const found: string[] = [];
  const visitedSearch: string[] = [];
  while (curId !== null) {
    visitedSearch.push(curId);
    const node = nodes[curId];
    const nodeInterval = { lo: node.value, hi: node.hi! };
    const highlight: Record<string, TreeNodeState> = {};
    visitedSearch.forEach((v) => {
      highlight[v] = "visiting";
    });
    const isOverlap = overlaps(nodeInterval, query);
    if (isOverlap) {
      found.push(curId);
      highlight[curId] = "inserted";
    }
    frames.push(
      snapshot(
        highlight,
        `クエリ区間[${query.lo},${query.hi}]と頂点の区間[${nodeInterval.lo},${nodeInterval.hi}]を比較: ${isOverlap ? "重なりあり" : "重なりなし"}`,
      ),
    );

    if (node.left !== null && nodes[node.left].maxHigh! >= query.lo) {
      frames.push(
        snapshot(highlight, `左の子の部分木のmaxHigh(${nodes[node.left].maxHigh})がクエリの下端${query.lo}以上 → 左へ`),
      );
      curId = node.left;
    } else if (node.right !== null) {
      frames.push(snapshot(highlight, "左の子孫には重なる可能性がない(またはそもそも左の子がない) → 右へ"));
      curId = node.right;
    } else {
      curId = null;
    }
  }

  frames.push(
    snapshot(
      {},
      `検索完了。たどった経路上で重なりが見つかった区間: ${found.map((id) => `[${nodes[id].value},${nodes[id].hi}]`).join(", ") || "なし"}(このアルゴリズムは経路上の重なりを見つけるものであり、木全体から全ての重なる区間を網羅的に探すわけではない)`,
    ),
  );

  return frames;
}

export const MERKLE_TREE_BLOCKS = [
  "tx-alice-1.0",
  "tx-bob-2.5",
  "tx-carol-0.8",
  "tx-dave-3.2",
  "tx-erin-1.1",
  "tx-frank-4.0",
  "tx-grace-0.5",
  "tx-heidi-2.2",
];

/**
 * マークル木専用の簡略化ハッシュ関数。本来はSHA-256等の暗号学的ハッシュ関数を使うが、
 * ここでは仕組み(隣接ハッシュの連結→再ハッシュ化をルートまで繰り返す)の可視化を優先し、
 * 文字コードの合計を素数で剰余した決定論的な整数値で代用する(TreeNode.valueがnumber型のため)。
 */
function merkleSimpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 9973; // 9973は4桁の素数
  }
  return h;
}

/**
 * マークル木の構築ステップ列を生成する。8個のデータブロック(トランザクション風の文字列)を
 * 葉ノードとし、隣接する2つのハッシュを連結して再ハッシュ化する操作をボトムアップに
 * 繰り返して1つのルートハッシュに到達する過程を示す。葉の数が2の累風(8個)なので、
 * 奇数調整(最後の葉を複製する処理)は不要。
 * 最後に、1つの葉のデータを改ざんすると変更がルートまで伝播し、ルートハッシュが変わる
 * (=改ざんを検知できる)様子を追加フレームで示す。
 */
export function merkleTreeSteps(): TreeFrame[] {
  const blocks = [...MERKLE_TREE_BLOCKS];
  const nodes: Record<string, TreeNode> = {};
  let rootId: string | null = null;
  const frames: TreeFrame[] = [];

  const snapshot = (nodeStates: Record<string, TreeNodeState>, description: string): TreeFrame => ({
    nodes: reachableNodes(nodes, rootId),
    rootId,
    nodeStates: { ...nodeStates },
    description,
  });

  frames.push(
    snapshot(
      {},
      `初期状態。${blocks.length}個のデータブロックからマークル木をボトムアップに構築する(ハッシュ関数は仕組みの説明を優先し、文字コード合計を素数で剰余した簡略化ハッシュで代用)`,
    ),
  );

  blocks.forEach((block, i) => {
    nodes[`L${i}`] = { id: `L${i}`, value: merkleSimpleHash(block), left: null, right: null };
  });

  let level: string[] = blocks.map((_, i) => `L${i}`);
  let levelIndex = 0;
  while (level.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const leftId = level[i];
      const rightId = level[i + 1];
      const parentId = `P${levelIndex}-${i / 2}`;
      const parentValue = merkleSimpleHash(`${nodes[leftId].value}|${nodes[rightId].value}`);
      nodes[parentId] = { id: parentId, value: parentValue, left: leftId, right: rightId };
      rootId = parentId;

      const leftLabel =
        levelIndex === 0 ? `葉${leftId}(ブロック「${blocks[Number(leftId.slice(1))]}」)` : leftId;
      const rightLabel =
        levelIndex === 0 ? `葉${rightId}(ブロック「${blocks[Number(rightId.slice(1))]}」)` : rightId;
      frames.push(
        snapshot(
          { [leftId]: "visiting", [rightId]: "visiting" },
          `${leftLabel}(hash=${nodes[leftId].value})と${rightLabel}(hash=${nodes[rightId].value})のハッシュを連結して結合`,
        ),
      );
      frames.push(snapshot({ [parentId]: "inserted" }, `親ノード${parentId}のハッシュ=${parentValue}を計算`));
      nextLevel.push(parentId);
    }
    level = nextLevel;
    levelIndex++;
  }

  const originalRoot = nodes[rootId!].value;
  frames.push(
    snapshot(
      {},
      `構築完了。ルートハッシュ=${originalRoot}。以後はこの1つの値を比較するだけで配下${blocks.length}個の全データの一致を検証できる`,
    ),
  );

  // 改ざん検知の例: 1つの葉のデータを書き換えると、根まで再計算が伝播しルートハッシュが変わる
  const tamperedIndex = 2;
  const tamperedBlock = `${blocks[tamperedIndex]}-TAMPERED`;
  const tamperedLeafId = `L${tamperedIndex}`;
  nodes[tamperedLeafId].value = merkleSimpleHash(tamperedBlock);
  frames.push(
    snapshot(
      { [tamperedLeafId]: "rotating" },
      `改ざん例: ブロック「${blocks[tamperedIndex]}」を「${tamperedBlock}」に書き換え。葉${tamperedLeafId}のハッシュが${nodes[tamperedLeafId].value}に変化`,
    ),
  );

  const parentOf = new Map<string, string>();
  Object.values(nodes).forEach((n) => {
    if (n.left) parentOf.set(n.left, n.id);
    if (n.right) parentOf.set(n.right, n.id);
  });
  let currentId: string = tamperedLeafId;
  while (parentOf.has(currentId)) {
    const pId = parentOf.get(currentId)!;
    const p = nodes[pId];
    p.value = merkleSimpleHash(`${nodes[p.left!].value}|${nodes[p.right!].value}`);
    frames.push(snapshot({ [pId]: "rotating" }, `祖先${pId}のハッシュを再計算 → ${p.value}(改ざんが根まで伝播)`));
    currentId = pId;
  }

  frames.push(
    snapshot(
      { [rootId!]: "rotating" },
      `改ざん後のルートハッシュ=${nodes[rootId!].value}(元の${originalRoot}と一致しない → ルートハッシュ1つの比較だけで改ざんを検知できる)`,
    ),
  );

  return frames;
}

export const KD_TREE_POINTS: Array<[number, number]> = [
  [2, 3],
  [5, 4],
  [9, 6],
  [4, 7],
  [8, 1],
  [7, 2],
];

/**
 * kd木の構築ステップ列を生成する(Wikipedia等でも使われる古典的な6点の例)。
 * TreeNode.valueは本来2次元の座標(x,y)を表すべきだが、型定義上numberの1フィールドしか
 * 持たないため、ここでは「その頂点を分割するのに使った座標軸の値」(x軸分割ならx座標、
 * y軸分割ならy座標)だけを簡略化してvalueに格納する(もう一方の座標はノードidに埋め込んで
 * 表現し、説明文でも両座標を明示する)。標準的なkd木の構築規則に従い、深さ0(ルート)を
 * x軸、深さ1をy軸というように、階層ごとに分割軸をx→y→x→…と交互に切り替える。
 */
export function kdTreeSteps(): TreeFrame[] {
  const points = KD_TREE_POINTS;
  const nodes: Record<string, TreeNode> = {};
  let rootId: string | null = null;
  const frames: TreeFrame[] = [];

  const snapshot = (nodeStates: Record<string, TreeNodeState>, description: string): TreeFrame => ({
    nodes: cloneNodes(nodes),
    rootId,
    nodeStates: { ...nodeStates },
    description,
  });

  frames.push(
    snapshot(
      {},
      `初期状態。${points.length}個の2次元点からkd木を構築する。階層ごとにx軸→y軸→x軸…と分割軸を交互に切り替える`,
    ),
  );

  const build = (
    pts: Array<[number, number]>,
    depth: number,
    parentId: string | null,
    side: "left" | "right" | null,
  ) => {
    if (pts.length === 0) return;
    const axis: 0 | 1 = (depth % 2) as 0 | 1;
    const axisLabel = axis === 0 ? "x" : "y";
    const sorted = [...pts].sort((a, b) => a[axis] - b[axis]);
    frames.push(
      snapshot(
        {},
        `深さ${depth}(${axisLabel}軸で分割): 対象の点 ${sorted
          .map(([x, y]) => `(${x},${y})`)
          .join(", ")} を${axisLabel}座標で並べ替え`,
      ),
    );

    const mid = Math.floor(sorted.length / 2);
    const [x, y] = sorted[mid];
    const id = `${x},${y}`;
    const splitValue = axis === 0 ? x : y;
    nodes[id] = { id, value: splitValue, left: null, right: null };

    if (parentId === null) {
      rootId = id;
    } else if (side === "left") {
      nodes[parentId].left = id;
    } else {
      nodes[parentId].right = id;
    }

    frames.push(
      snapshot(
        { [id]: "inserted" },
        `中央値の点(${x},${y})を分割点として選択(${axisLabel}軸、簡略化のためvalueには${axisLabel}座標=${splitValue}のみ格納)`,
      ),
    );

    build(sorted.slice(0, mid), depth + 1, id, "left");
    build(sorted.slice(mid + 1), depth + 1, id, "right");
  };

  build([...points], 0, null, null);

  frames.push(
    snapshot(
      {},
      `構築完了。${points.length}個の点からkd木が完成。最近傍探索・範囲検索では、分割境界までの距離を使って探索不要な部分木を枝刈りできる`,
    ),
  );

  return frames;
}

export const UPGMA_LABELS = ["a", "b", "c", "d", "e"];
/** content/algorithms/upgma.md の実装例と同じ5種の距離行列(検証済みの既知トポロジーを持つ)。 */
export const UPGMA_DIST: number[][] = [
  [0, 17, 21, 31, 23],
  [17, 0, 30, 34, 21],
  [21, 30, 0, 28, 39],
  [31, 34, 28, 0, 43],
  [23, 21, 39, 43, 0],
];

/**
 * UPGMA法のステップ列を生成する。距離行列の中から最も近い2つのクラスタを繰り返し統合し、
 * 統合のたびに新クラスタと残りの各クラスタとの距離をサイズで重み付けした算術平均で
 * 再計算する(非加重ではなくクラスタサイズで重み付けするのが正しいUPGMAの定義)。
 * 統合順序が木の枝分かれ構造(デンドログラム)になる。
 *
 * 中間状態では複数の未結合クラスタが同時に存在する(森になっている)ため、rootIdは
 * 「現時点で最も新しく作られた(最大の)クラスタのID」を指す。まだ全体が1つの木に
 * 結合されていない間は、そのrootIdから辿り着ける部分木だけがフレームに現れる
 * (reachableNodesの説明を参照)。最終フレームで全クラスタが1つの木に結合される。
 * TreeNode.valueは元々「挿入する値」を表すフィールドだが、ここでは意味を読み替えて
 * 「クラスタが統合された高さ(branch height)」を格納する(葉クラスタは高さ0)。
 */
export function upgmaSteps(): TreeFrame[] {
  const labels = UPGMA_LABELS;
  const distInput = UPGMA_DIST;
  const n = labels.length;

  const nodes: Record<string, TreeNode> = {};
  let rootId: string | null = null;
  const frames: TreeFrame[] = [];

  type ClusterInfo = { id: string; size: number; members: string[] };
  const clusters = new Map<number, ClusterInfo>();
  for (let i = 0; i < n; i++) {
    nodes[labels[i]] = { id: labels[i], value: 0, left: null, right: null };
    clusters.set(i, { id: labels[i], size: 1, members: [labels[i]] });
  }

  const d = new Map<string, number>();
  const key = (i: number, j: number) => `${i},${j}`;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) d.set(key(i, j), distInput[i][j]);
    }
  }

  const snapshot = (nodeStates: Record<string, TreeNodeState>, description: string): TreeFrame => ({
    nodes: reachableNodes(nodes, rootId),
    rootId,
    nodeStates: { ...nodeStates },
    description,
  });

  frames.push(
    snapshot(
      {},
      `初期状態: ${n}個の配列(${labels.join(", ")})がそれぞれ独立したクラスタ。距離行列から最も近い2つのクラスタを繰り返し統合していく`,
    ),
  );

  let nextId = n;
  const active = new Set<number>(Array.from({ length: n }, (_, i) => i));

  while (active.size > 1) {
    let best = Infinity;
    let bestPair: [number, number] = [-1, -1];
    for (const i of active) {
      for (const j of active) {
        if (i < j) {
          const dij = d.get(key(i, j))!;
          if (dij < best) {
            best = dij;
            bestPair = [i, j];
          }
        }
      }
    }
    const [i, j] = bestPair;
    const ci = clusters.get(i)!;
    const cj = clusters.get(j)!;
    const newSize = ci.size + cj.size;
    const newHeight = Math.round((best / 2) * 10) / 10;
    const newId = `U${nextId}`;

    nodes[newId] = { id: newId, value: newHeight, left: ci.id, right: cj.id };
    rootId = newId;

    frames.push(
      snapshot(
        { [ci.id]: "visiting", [cj.id]: "visiting" },
        `クラスタ{${ci.members.join(",")}}とクラスタ{${cj.members.join(",")}}の距離${best}が最小 → 統合`,
      ),
    );
    frames.push(
      snapshot(
        { [newId]: "inserted" },
        `新クラスタ{${ci.members.concat(cj.members).join(",")}}を高さ${newHeight}で作成(枝の高さ=統合前の距離/2)`,
      ),
    );

    for (const k of active) {
      if (k !== i && k !== j) {
        const newD = (ci.size * d.get(key(i, k))! + cj.size * d.get(key(j, k))!) / newSize;
        d.set(key(nextId, k), newD);
        d.set(key(k, nextId), newD);
      }
    }

    clusters.set(nextId, { id: newId, size: newSize, members: [...ci.members, ...cj.members] });
    active.delete(i);
    active.delete(j);
    active.add(nextId);
    nextId++;
  }

  frames.push(
    snapshot(
      {},
      `構築完了。${n}個の配列から系統樹(デンドログラム)が完成。UPGMAは常に根から全ての葉までの距離が等しい超計量的な木を作る`,
    ),
  );

  return frames;
}

export const NEIGHBOR_JOINING_LABELS = ["A", "B", "C", "D"];
/**
 * 真のトポロジー((A,B)が先に合流し、(C,D)が先に合流してから2つのクラスタが結合する)
 * A-x:2, B-x:3, x-y:1, C-y:4, D-y:2 という枝長を持つ木から生成した加法的な距離行列。
 * 近隣結合法がこの行列から、枝長も含めて元のトポロジーを正確に再構築できることを
 * 手計算で検証済み(content/algorithms/neighbor-joining.md の実装例と同じQ基準・距離更新式を使用)。
 */
export const NEIGHBOR_JOINING_DIST: number[][] = [
  [0, 5, 7, 5],
  [5, 0, 8, 6],
  [7, 8, 0, 6],
  [5, 6, 6, 0],
];

/**
 * 近隣結合法のステップ列を生成する。UPGMAと違い、単純な最短距離ではなく「他の全体からの
 * 平均距離」R(i)を考慮した補正スコアQ(i,j) = (n-2)*D(i,j) - R(i) - R(j)が最小のペアを
 * 選んで統合する。統合時の枝の長さも左右で異なりうる(進化速度の不均一性を許容する)のが
 * UPGMAとの決定的な違い。最後に2ノードだけが残ったら、それらを直接結んで木を完成させる。
 *
 * 中間状態でも複数の未結合クラスタが同時に存在しうるため、UPGMAと同様にrootIdは
 * 「現時点で最も新しく作られたノードのID」を指し、reachableNodesでその部分木だけを
 * フレームに含める。TreeNode.valueは「そのノードで生じた2本の枝の長さの合計」という
 * 簡略化した値を格納する(左右で枝長が異なる点は説明文でd_iu/d_juとして明示する)。
 */
export function neighborJoiningSteps(): TreeFrame[] {
  const labels = NEIGHBOR_JOINING_LABELS;
  const distMatrix = NEIGHBOR_JOINING_DIST;

  const nodes: Record<string, TreeNode> = {};
  let rootId: string | null = null;
  const frames: TreeFrame[] = [];

  labels.forEach((label) => {
    nodes[label] = { id: label, value: 0, left: null, right: null };
  });

  const dist = new Map<string, Map<string, number>>();
  labels.forEach((a, i) => {
    const row = new Map<string, number>();
    labels.forEach((b, j) => row.set(b, distMatrix[i][j]));
    dist.set(a, row);
  });

  let workingNodes = [...labels];
  let nextId = 0;

  const snapshot = (nodeStates: Record<string, TreeNodeState>, description: string): TreeFrame => ({
    nodes: reachableNodes(nodes, rootId),
    rootId,
    nodeStates: { ...nodeStates },
    description,
  });

  frames.push(
    snapshot(
      {},
      `初期状態: ${labels.length}個の配列(${labels.join(", ")})。UPGMAと異なり、他全体からの平均距離R(i)を考慮した補正スコアQ(i,j)で統合するペアを選ぶ`,
    ),
  );

  while (workingNodes.length > 2) {
    const n = workingNodes.length;
    const r = new Map<string, number>();
    for (const i of workingNodes) {
      let sum = 0;
      for (const j of workingNodes) {
        if (j !== i) sum += dist.get(i)!.get(j)!;
      }
      r.set(i, sum);
    }

    let bestQ = Infinity;
    let bestI = "";
    let bestJ = "";
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const i = workingNodes[a];
        const j = workingNodes[b];
        const q = (n - 2) * dist.get(i)!.get(j)! - r.get(i)! - r.get(j)!;
        if (q < bestQ) {
          bestQ = q;
          bestI = i;
          bestJ = j;
        }
      }
    }

    const u = `N${nextId++}`;
    const dij = dist.get(bestI)!.get(bestJ)!;
    const dIu = 0.5 * dij + (r.get(bestI)! - r.get(bestJ)!) / (2 * (n - 2));
    const dJu = dij - dIu;

    nodes[u] = { id: u, value: Math.round((dIu + dJu) * 10) / 10, left: bestI, right: bestJ };
    rootId = u;

    frames.push(
      snapshot(
        { [bestI]: "visiting", [bestJ]: "visiting" },
        `補正スコアQ(${bestI},${bestJ})=${bestQ.toFixed(1)}が最小 → 統合(枝長: ${bestI}側=${dIu.toFixed(1)}, ${bestJ}側=${dJu.toFixed(1)}。UPGMAと異なり左右で枝の長さが異なりうる)`,
      ),
    );
    frames.push(snapshot({ [u]: "inserted" }, `新ノード${u}を作成(${bestI}と${bestJ}を統合)`));

    const uRow = new Map<string, number>();
    for (const k of workingNodes) {
      if (k !== bestI && k !== bestJ) {
        const dUk = 0.5 * (dist.get(bestI)!.get(k)! + dist.get(bestJ)!.get(k)! - dij);
        uRow.set(k, dUk);
        dist.get(k)!.set(u, dUk);
      }
    }
    dist.set(u, uRow);
    for (const k of dist.keys()) {
      dist.get(k)!.delete(bestI);
      dist.get(k)!.delete(bestJ);
    }
    dist.delete(bestI);
    dist.delete(bestJ);

    workingNodes = workingNodes.filter((x) => x !== bestI && x !== bestJ);
    workingNodes.push(u);
  }

  const [last1, last2] = workingNodes;
  const finalDist = dist.get(last1)!.get(last2)!;
  const finalId = `N${nextId++}`;
  nodes[finalId] = { id: finalId, value: Math.round(finalDist * 10) / 10, left: last1, right: last2 };
  rootId = finalId;
  frames.push(
    snapshot(
      { [finalId]: "inserted" },
      `残った${last1}と${last2}を距離${finalDist}で直接結んで木を完成(近隣結合法は最後に残った2ノードを直接結ぶ)`,
    ),
  );

  frames.push(
    snapshot(
      {},
      `構築完了。${labels.length}個の配列から近隣結合法による系統樹が完成(進化速度の違いを反映し、枝の長さは不均一になりうる)`,
    ),
  );

  return frames;
}

export const TREE_VISUALIZERS: Record<string, () => TreeFrame[]> = {
  "binary-search-tree": bstSteps,
  "avl-tree": avlTreeSteps,
  treap: treapSteps,
  "red-black-tree": redBlackTreeSteps,
  "splay-tree": splayTreeSteps,
  "interval-tree": intervalTreeSteps,
  "merkle-tree": merkleTreeSteps,
  "kd-tree": kdTreeSteps,
  upgma: upgmaSteps,
  "neighbor-joining": neighborJoiningSteps,
};
