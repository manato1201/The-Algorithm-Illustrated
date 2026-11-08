import type { Scene3DFrame, Scene3DMeta } from "./scene3d.ts";
import {
  SCENE3D_OPTIMIZERS,
  SCENE3D_OPTIMIZER_META,
} from "./scene3d-optimizers.ts";
import { SCENE3D_GRAPHICS, SCENE3D_GRAPHICS_META } from "./scene3d-graphics.ts";
import { SCENE3D_ML, SCENE3D_ML_META } from "./scene3d-ml.ts";

/**
 * 3次元の可視化のレジストリ(kind = "scene3d"。描画は three.js の Scene3DVisualizer)。
 * 計算は分野ごとに分けてある: オプティマイザ scene3d-optimizers.ts・CG scene3d-graphics.ts・機械学習 scene3d-ml.ts。
 * 3Dが向く題材(曲面の上を動く点・球面上の回転・流れ・視錐台・点群の軸)を、新しいファイルに足して、ここに並べる。
 * ※ 相対importに拡張子(.ts)を付けているのは、Node の型除去実行(scripts/*.mjs)からも直接読めるようにするため。
 */
export const SCENE3D_VISUALIZERS: Record<string, () => Scene3DFrame[]> = {
  ...SCENE3D_OPTIMIZERS,
  ...SCENE3D_GRAPHICS,
  ...SCENE3D_ML,
};

export const SCENE3D_META: Record<string, Scene3DMeta> = {
  ...SCENE3D_OPTIMIZER_META,
  ...SCENE3D_GRAPHICS_META,
  ...SCENE3D_ML_META,
};
