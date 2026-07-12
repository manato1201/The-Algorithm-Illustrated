"use client";

import { useEffect, useRef } from "react";
import { Application, Graphics } from "pixi.js";
import styles from "./ParticleBurstLayer.module.css";

export type ParticleBurst = {
  /** 一意なイベントID。同じIDのバーストは1度しか再生しない(再レンダーでの重複発火を防ぐ)。 */
  id: string;
  /** 発生位置。キャンバスの0〜1に正規化した座標。 */
  xRatio: number;
  yRatio: number;
  /** #rrggbb形式の色。 */
  color: string;
};

type ParticleBurstLayerProps = {
  bursts: ParticleBurst[];
};

/**
 * 可視化キャンバスに重ねるpixi.js(WebGL)製のパーティクル演出。
 * ui-design.md 2.5節「パーティクル/グロー・パルスは可視化キャンバスの実行体験にのみ許可」に対応する、
 * プロジェクト初のWebGLベースのショーケース級演出(それ以外はCanvas 2D/HTML+CSSで統一している)。
 * prefers-reduced-motion環境ではパーティクルを一切生成しない(装飾であり情報を担わないため、停止しても情報は失われない)。
 */
export function ParticleBurstLayer({ bursts }: ParticleBurstLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotionRef.current) return;

    const app = new Application();
    let cancelled = false;

    app
      .init({
        resizeTo: containerRef.current ?? undefined,
        backgroundAlpha: 0,
        antialias: true,
      })
      .then(() => {
        if (cancelled || !containerRef.current) {
          app.destroy(true, { children: true });
          return;
        }
        containerRef.current.appendChild(app.canvas);
        appRef.current = app;
      });

    return () => {
      cancelled = true;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    if (!app || reducedMotionRef.current) return;
    for (const burst of bursts) {
      if (seenIdsRef.current.has(burst.id)) continue;
      seenIdsRef.current.add(burst.id);
      spawnBurst(app, burst);
    }
  }, [bursts]);

  return <div ref={containerRef} className={styles.layer} aria-hidden="true" />;
}

function spawnBurst(app: Application, burst: ParticleBurst) {
  const width = app.renderer.width;
  const height = app.renderer.height;
  const originX = burst.xRatio * width;
  const originY = burst.yRatio * height;
  const color = Number.parseInt(burst.color.replace("#", ""), 16);
  const particleCount = 10;

  for (let i = 0; i < particleCount; i++) {
    const particle = new Graphics();
    particle.circle(0, 0, 1.5 + Math.random() * 2).fill({ color, alpha: 0.9 });
    particle.x = originX;
    particle.y = originY;
    app.stage.addChild(particle);

    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2.5;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 0.6;
    const maxLife = 26;
    let life = 0;

    const tick = () => {
      life++;
      particle.x += vx;
      particle.y += vy;
      particle.alpha = Math.max(0, 1 - life / maxLife);
      if (life >= maxLife) {
        app.ticker.remove(tick);
        particle.destroy();
      }
    };
    app.ticker.add(tick);
  }
}
