"use client";

import { useCallback, useEffect, useState } from "react";

const BASE_INTERVAL_MS = 400;

/** 再生速度の倍率。1x基準でBASE_INTERVAL_MSを割ることでフレーム間隔を変える。 */
export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];
const DEFAULT_SPEED: PlaybackSpeed = 1;

/**
 * フレーム列の再生状態を管理する共通フック(SortVisualizer/PathfindingVisualizerで共用)。
 * effect内で直接setStateせず、setTimeoutコールバック内でのみ呼ぶことでreact-hooks/set-state-in-effectを回避している。
 */
export function useStepPlayer(frameCount: number) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(DEFAULT_SPEED);

  useEffect(() => {
    if (!isPlaying || stepIndex >= frameCount - 1) return;
    const timer = setTimeout(() => {
      setStepIndex((i) => Math.min(i + 1, frameCount - 1));
    }, BASE_INTERVAL_MS / speed);
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, frameCount, speed]);

  const isFinished = stepIndex >= frameCount - 1;
  const showPause = isPlaying && !isFinished;

  const handlePlayPause = useCallback(() => {
    if (stepIndex >= frameCount - 1) {
      setStepIndex(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((playing) => !playing);
  }, [stepIndex, frameCount]);

  const handleStep = useCallback(
    (delta: number) => {
      setIsPlaying(false);
      setStepIndex((i) => Math.min(Math.max(i + delta, 0), frameCount - 1));
    },
    [frameCount],
  );

  /** タイムラインのスクラバー(range input)から任意ステップへ直接ジャンプする。 */
  const handleScrub = useCallback(
    (index: number) => {
      setIsPlaying(false);
      setStepIndex(Math.min(Math.max(index, 0), Math.max(frameCount - 1, 0)));
    },
    [frameCount],
  );

  const reset = useCallback(() => {
    setIsPlaying(false);
    setStepIndex(0);
  }, []);

  return {
    stepIndex: Math.min(stepIndex, Math.max(frameCount - 1, 0)),
    isFinished,
    showPause,
    speed,
    setSpeed,
    handlePlayPause,
    handleStep,
    handleScrub,
    reset,
  };
}
