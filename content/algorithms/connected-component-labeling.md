---
name: 連結成分ラベリング
category: コンピュータビジョン
subcategory: ロバスト推定
complexity: O(w×h × α(w×h))(w×h画像、Union-Find使用時)
summary: 二値画像の中で隣接する前景画素同士をグループ化し、独立した「かたまり」ごとに一意な番号を割り振る、画像処理で最も基本的な走査アルゴリズム。
---

## 概要

閾値処理や[Watershed法](/algorithms/watershed-algorithm)で画像を「物体か背景か」の二値画像に分けた後、次に必要になるのが「一体いくつの独立した物体(かたまり)があるか、それぞれどこにあるか」を特定する処理である。連結成分ラベリングは、隣接する前景画素(値が1の画素)同士を辿っていき、互いに繋がっている画素の集合ごとに同じラベル(番号)を割り振ることで、この「かたまり」を機械的に列挙する。グラフの[BFS](/algorithms/bfs)・[DFS](/algorithms/dfs)による連結成分検出を画像の格子構造に特化させたものと理解できる。

## 仕組み

1. **2パス法(Two-Pass Algorithm)**の場合、まず画像を左上から右下へラスタスキャンし、各前景画素について、既にラベル付けされている左隣・上隣の画素を確認する
2. どちらも未ラベルなら新しいラベルを割り当てる。片方だけラベル済みならそのラベルを引き継ぐ。両方ラベル済みで異なるラベルだった場合、この2つのラベルは実は同じ連結成分の一部だったことになるので、[Union-Find](/algorithms/union-find)を使ってこの2つのラベルを同じグループとして記録する(「等価テーブル」を作る)
3. 1回目の走査が終わったら、[Union-Find](/algorithms/union-find)の等価関係を解決し、各仮ラベルが最終的にどの連結成分に属するかを確定する
4. 画像をもう一度走査し(2パス目)、各画素の仮ラベルを確定ラベルに置き換える

もう1つの代表的な方式は**シード充填法**で、未処理の前景画素を見つけるたびに新しいラベルを割り当て、そこから[BFS](/algorithms/bfs)または[DFS](/algorithms/dfs)で隣接する前景画素を全て同じラベルに塗りつぶしていく——これを未処理画素がなくなるまで繰り返す、より素直だが再帰の深さに注意が必要な方式である。

## 特性・トレードオフ

- **計算量**: 2パス法は画像を2回走査するだけなので`O(w×h)`にほぼ近い(正確には[Union-Find](/algorithms/union-find)の逆アッカーマン関数`α`が絡むがほぼ定数とみなせる)。シード充填法も全画素を1回ずつ処理するので同程度の計算量になる
- **4連結と8連結の選択**: 「隣接」を上下左右の4方向だけとする(4連結)か、斜めも含めた8方向とする(8連結)かで、同じ画像でも検出される連結成分の数や形が変わることがある。用途に応じてどちらを使うかを明確にしておく必要がある
- **後段処理への橋渡し**: ラベリングによって得られる各連結成分について、面積・重心・外接矩形といった特徴量を追加で計算すれば、[テンプレートマッチング](/algorithms/template-matching)や機械学習の分類器への入力として使える形に整理できる
- **使いどころ**: 光学文字認識(OCR)における個々の文字領域の切り出し、工業検査における欠陥・部品の個数カウント、医療画像における病変・細胞の個別領域抽出、二値画像処理パイプラインのほぼ標準的な構成要素

## 実装例

以下はシード充填法(4連結の[BFS](/algorithms/bfs))による実装。未処理の前景画素を見つけるたびに新しいラベルを割り当て、そこから隣接する前景画素へ同じラベルを広げていく。

```python
from collections import deque

def connected_component_labeling(grid: list[list[int]]) -> tuple[list[list[int]], int]:
    h = len(grid)
    w = len(grid[0]) if h else 0
    labels = [[0] * w for _ in range(h)]
    current_label = 0
    for sy in range(h):
        for sx in range(w):
            if grid[sy][sx] == 1 and labels[sy][sx] == 0:
                current_label += 1
                queue = deque([(sy, sx)])
                labels[sy][sx] = current_label
                while queue:
                    y, x = queue.popleft()
                    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and grid[ny][nx] == 1 and labels[ny][nx] == 0:
                            labels[ny][nx] = current_label
                            queue.append((ny, nx))
    return labels, current_label
```

```typescript
function connectedComponentLabeling(grid: number[][]): { labels: number[][]; count: number } {
  const h = grid.length;
  const w = h > 0 ? grid[0].length : 0;
  const labels: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  let currentLabel = 0;
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      if (grid[sy][sx] === 1 && labels[sy][sx] === 0) {
        currentLabel++;
        const queue: [number, number][] = [[sy, sx]];
        labels[sy][sx] = currentLabel;
        let qi = 0;
        while (qi < queue.length) {
          const [y, x] = queue[qi++];
          for (const [dy, dx] of dirs) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny][nx] === 1 && labels[ny][nx] === 0) {
              labels[ny][nx] = currentLabel;
              queue.push([ny, nx]);
            }
          }
        }
      }
    }
  }
  return { labels, count: currentLabel };
}
```

```cpp
#include <vector>
#include <queue>

std::pair<std::vector<std::vector<int>>, int> connectedComponentLabeling(const std::vector<std::vector<int>>& grid) {
    int h = static_cast<int>(grid.size());
    int w = h > 0 ? static_cast<int>(grid[0].size()) : 0;
    std::vector<std::vector<int>> labels(h, std::vector<int>(w, 0));
    int currentLabel = 0;
    const int dy[4] = {-1, 1, 0, 0};
    const int dx[4] = {0, 0, -1, 1};
    for (int sy = 0; sy < h; sy++) {
        for (int sx = 0; sx < w; sx++) {
            if (grid[sy][sx] == 1 && labels[sy][sx] == 0) {
                currentLabel++;
                std::queue<std::pair<int, int>> q;
                q.push({sy, sx});
                labels[sy][sx] = currentLabel;
                while (!q.empty()) {
                    auto [y, x] = q.front();
                    q.pop();
                    for (int k = 0; k < 4; k++) {
                        int ny = y + dy[k], nx = x + dx[k];
                        if (ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny][nx] == 1 && labels[ny][nx] == 0) {
                            labels[ny][nx] = currentLabel;
                            q.push({ny, nx});
                        }
                    }
                }
            }
        }
    }
    return {labels, currentLabel};
}
```

```rust
use std::collections::VecDeque;

fn connected_component_labeling(grid: &[Vec<i32>]) -> (Vec<Vec<i32>>, i32) {
    let h = grid.len();
    let w = if h > 0 { grid[0].len() } else { 0 };
    let mut labels = vec![vec![0i32; w]; h];
    let mut current_label = 0;
    let dirs: [(i32, i32); 4] = [(-1, 0), (1, 0), (0, -1), (0, 1)];
    for sy in 0..h {
        for sx in 0..w {
            if grid[sy][sx] == 1 && labels[sy][sx] == 0 {
                current_label += 1;
                let mut queue: VecDeque<(usize, usize)> = VecDeque::new();
                queue.push_back((sy, sx));
                labels[sy][sx] = current_label;
                while let Some((y, x)) = queue.pop_front() {
                    for &(dy, dx) in &dirs {
                        let ny = y as i32 + dy;
                        let nx = x as i32 + dx;
                        if ny >= 0 && ny < h as i32 && nx >= 0 && nx < w as i32 {
                            let (nyu, nxu) = (ny as usize, nx as usize);
                            if grid[nyu][nxu] == 1 && labels[nyu][nxu] == 0 {
                                labels[nyu][nxu] = current_label;
                                queue.push_back((nyu, nxu));
                            }
                        }
                    }
                }
            }
        }
    }
    (labels, current_label)
}
```

```csharp
static (int[,] labels, int count) ConnectedComponentLabeling(int[,] grid)
{
    int h = grid.GetLength(0), w = grid.GetLength(1);
    var labels = new int[h, w];
    int currentLabel = 0;
    int[] dy = { -1, 1, 0, 0 };
    int[] dx = { 0, 0, -1, 1 };
    for (int sy = 0; sy < h; sy++)
    {
        for (int sx = 0; sx < w; sx++)
        {
            if (grid[sy, sx] == 1 && labels[sy, sx] == 0)
            {
                currentLabel++;
                var queue = new Queue<(int y, int x)>();
                queue.Enqueue((sy, sx));
                labels[sy, sx] = currentLabel;
                while (queue.Count > 0)
                {
                    var (y, x) = queue.Dequeue();
                    for (int k = 0; k < 4; k++)
                    {
                        int ny = y + dy[k], nx = x + dx[k];
                        if (ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny, nx] == 1 && labels[ny, nx] == 0)
                        {
                            labels[ny, nx] = currentLabel;
                            queue.Enqueue((ny, nx));
                        }
                    }
                }
            }
        }
    }
    return (labels, currentLabel);
}
```
