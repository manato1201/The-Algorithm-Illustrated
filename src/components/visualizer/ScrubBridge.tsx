"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

/**
 * 解説のスクロール位置から、可視化の再生位置を動かすための橋渡し
 * (IMPROVEMENT_DESIGN_2026-10 の「ピン留め+スクラブ」「スクロールテリング」)。
 * 解説(サーバー描画のHTML)と可視化(クライアント)は別のツリーなので、Providerで両者をつなぐ。
 * Providerが無い画面(比較画面など)では何も起きない。
 */
type Registration = {
  frameCount: number;
  scrubTo: (index: number) => void;
};

type ScrubBridgeValue = {
  register: (registration: Registration | null) => void;
  /** 0〜1の進み具合を、登録中の可視化のステップ位置に変換して反映する。 */
  scrubProgress: (progress: number) => void;
};

const ScrubBridgeContext = createContext<ScrubBridgeValue | null>(null);

export function ScrubBridgeProvider({ children }: { children: ReactNode }) {
  const registrationRef = useRef<Registration | null>(null);

  const value = useMemo<ScrubBridgeValue>(
    () => ({
      register: (registration) => {
        registrationRef.current = registration;
      },
      scrubProgress: (progress) => {
        const registration = registrationRef.current;
        if (!registration || registration.frameCount < 2) return;
        const clamped = Math.min(1, Math.max(0, progress));
        registration.scrubTo(
          Math.round(clamped * (registration.frameCount - 1)),
        );
      },
    }),
    [],
  );

  return (
    <ScrubBridgeContext.Provider value={value}>
      {children}
    </ScrubBridgeContext.Provider>
  );
}

/** スクロール側から使う。Providerの外なら null。 */
export function useScrubBridge(): ScrubBridgeValue | null {
  return useContext(ScrubBridgeContext);
}

/** 可視化側(PlaybackControls)から使う。マウント中だけ、自分の再生位置の操作口を登録する。 */
export function useRegisterScrub(
  frameCount: number,
  scrubTo: (index: number) => void,
): void {
  const bridge = useContext(ScrubBridgeContext);

  useEffect(() => {
    if (!bridge) return;
    bridge.register({ frameCount, scrubTo });
    return () => bridge.register(null);
  }, [bridge, frameCount, scrubTo]);
}
