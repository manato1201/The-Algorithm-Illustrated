"use client";

import { useState, type ReactNode } from "react";
import styles from "./ZoomableStage.module.css";
import type { StepKind } from "./step-timeline";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;
const ZOOM_DEFAULT = 1;

/** ステージの隅に出すHUD(いまのステップの種別と位置)。形の記号+ラベル+色で状態を示す。 */
export type StageHud = {
  kind: StepKind;
  step: number;
  total: number;
};

const HUD_LABELS: Record<StepKind, { glyph: string; ja: string; en: string }> = {
  idle: { glyph: "○", ja: "待機", en: "STANDBY" },
  comparing: { glyph: "●", ja: "比較中", en: "COMPARING" },
  swapping: { glyph: "▲", ja: "入れ替え", en: "SWAPPING" },
  pivot: { glyph: "◆", ja: "基準", en: "PIVOT" },
  settled: { glyph: "■", ja: "確定", en: "SETTLED" },
};

type ZoomableStageProps = {
  children: ReactNode;
  hud?: StageHud;
};

/**
 * 可視化の描画領域(canvas/table等)を拡大縮小できる共通ラッパー。
 * CSS transform: scaleは要素のレイアウトサイズ(clientWidth/clientHeight)を変えないため、
 * 各Visualizerのcanvas再描画ロジック(canvas.clientWidthを読む処理)は無改修で動作する。
 */
export function ZoomableStage({ children, hud }: ZoomableStageProps) {
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
      <div className={styles.viewportWrap}>
        {/* 可視化の描画領域は、テーマに関わらず常にダークの値を使う(globals.cssの data-surface="dark" 参照)。 */}
        <div className={styles.viewport} data-surface="dark">
          <div className={styles.content} style={{ transform: `scale(${zoom})` }}>
            {children}
          </div>
        </div>
        {hud ? (
          <div className={styles.hud} data-surface="dark" data-kind={hud.kind} aria-hidden="true">
            <span className={styles.hudKind}>
              <span className={styles.hudGlyph}>{HUD_LABELS[hud.kind].glyph}</span>
              {HUD_LABELS[hud.kind].en}
              <span className={styles.hudJa}>{HUD_LABELS[hud.kind].ja}</span>
            </span>
            <span className={styles.hudStep}>
              STEP {String(hud.step + 1).padStart(3, "0")}/{String(hud.total).padStart(3, "0")}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
