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

export const TREE_VISUALIZERS: Record<string, () => TreeFrame[]> = {
  "binary-search-tree": bstSteps,
  "avl-tree": avlTreeSteps,
  treap: treapSteps,
  "red-black-tree": redBlackTreeSteps,
};
