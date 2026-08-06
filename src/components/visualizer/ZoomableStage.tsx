"use client";

import { useState, type ReactNode } from "react";
import styles from "./ZoomableStage.module.css";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;
const ZOOM_DEFAULT = 1;

type ZoomableStageProps = {
  children: ReactNode;
};

/**
 * 可視化の描画領域(canvas/table等)を拡大縮小できる共通ラッパー。
 * CSS transform: scaleは要素のレイアウトサイズ(clientWidth/clientHeight)を変えないため、
 * 各Visualizerのcanvas再描画ロジック(canvas.clientWidthを読む処理)は無改修で動作する。
 */
export function ZoomableStage({ children }: ZoomableStageProps) {
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);

  const zoomIn = () =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  const zoomOut = () =>
    setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  const reset = () => setZoom(ZOOM_DEFAULT);

  return (
    <div className={styles.stage}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.zoomButton}
          onClick={zoomOut}
          disabled={zoom <= ZOOM_MIN}
          aria-label="縮小"
        >
          −
        </button>
        <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className={styles.zoomButton}
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX}
          aria-label="拡大"
        >
          +
        </button>
        {zoom !== ZOOM_DEFAULT && (
          <button type="button" className={styles.resetButton} onClick={reset}>
            リセット
          </button>
        )}
      </div>
      <div className={styles.viewport}>
        <div className={styles.content} style={{ transform: `scale(${zoom})` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
