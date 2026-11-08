"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Group, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import styles from "./Scene3DVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { ZoomableStage } from "./ZoomableStage";
import { STEP_KIND_LABELS } from "./step-timeline";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { shouldGlow, stateColors, type StateColorKey } from "@/lib/design-tokens";
import { SCENE3D_META } from "@/lib/scene3d-visualizers";
import type { Scene3DFrame, Vec3 } from "@/lib/scene3d";
import type { WorkerRequest } from "@/workers/algorithm-worker";

type ThreeModule = typeof import("three");

/** three.js の実行時の部品(マウント中に1組だけ作り、フレームが変わるたびに中身だけ作り直す)。 */
type Runtime = {
  THREE: ThreeModule;
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  /** フレームごとに作り直す物(経路・点)。 */
  dynamicGroup: Group;
  /** 曲面・球・軸・床の格子。内容が変わらない間は作り直さない。 */
  staticGroup: Group;
  staticKey: string;
  render: () => void;
  dispose: () => void;
};

/** 凡例。色だけでなく3Dの形でも区別する(ui-design.md 2.7節)。 */
const LEGEND_ITEMS: { key: StateColorKey; label: string }[] = [
  { key: "comparing", label: "進行中・比較対象(球)" },
  { key: "pivot", label: "いま注目している点(八面体)" },
  { key: "swapping", label: "減少・動かした結果(円錐)" },
  { key: "settled", label: "確定した結果(立方体)" },
];

const VIEW_PRESETS: { key: string; label: string; direction: Vec3 | null }[] = [
  { key: "initial", label: "初期の視点", direction: null },
  { key: "top", label: "真上から", direction: [0.001, 1, 0.001] },
  { key: "side", label: "横から", direction: [1, 0.15, 0] },
  { key: "front", label: "正面から", direction: [0, 0.15, 1] },
];

function disposeObject(root: Group) {
  root.traverse((object) => {
    const mesh = object as unknown as { geometry?: { dispose: () => void }; material?: { dispose: () => void } | { dispose: () => void }[] };
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
  root.clear();
}

function staticKeyOf(frame: Scene3DFrame): string {
  const s = frame.surface;
  const surfaceKey = s ? `${s.nx}x${s.nz}:${s.heights[0]}:${s.heights[Math.floor(s.heights.length / 2)]}:${s.heights[s.heights.length - 1]}` : "none";
  return `${surfaceKey}|${frame.sphere?.radius ?? "none"}`;
}

type Scene3DVisualizerProps = {
  algorithmId: string;
};

/**
 * 3次元の可視化(three.js)。ドラッグで回転・ホイールで拡大・右ドラッグで移動でき、視点の切り替えボタンもある。
 * 計算は src/lib/scene3d-*.ts で実際のアルゴリズムどおりに行い(Web Worker)、ここは座標を描くだけ。
 * 再生コントロール・状態タイムラインは他の可視化と同じ。three.js は、3D可視化のページを開いたときだけ読み込む。
 */
export function Scene3DVisualizer({ algorithmId }: Scene3DVisualizerProps) {
  const request = useMemo<WorkerRequest>(() => ({ kind: "scene3d", algorithmId }), [algorithmId]);
  const { frames, isComputing } = useWorkerFrames<Scene3DFrame>(request);
  const { stepIndex, isFinished, showPause, speed, setSpeed, handlePlayPause, handleStep, handleScrub, reset } =
    useStepPlayer(frames.length);
  const stepKinds = useMemo(() => frames.map((frame) => frame.kind), [frames]);
  const meta = SCENE3D_META[algorithmId];
  const currentFrame = frames[stepIndex];

  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const [ready, setReady] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  // three.js の初期化(マウント時に1回)。読み込み・WebGLの生成に失敗したら、説明の文字だけを出す
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !meta) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        if (cancelled) return;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
        camera.position.set(...meta.camera.position);
        const target = new THREE.Vector3(...meta.camera.target);
        camera.lookAt(target);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.copy(target);
        controls.enableDamping = false; // 動かしたときだけ描く(常時の再描画をしない)
        controls.listenToKeyEvents(container);
        controls.update();
        const dynamicGroup = new THREE.Group();
        const staticGroup = new THREE.Group();
        scene.add(staticGroup, dynamicGroup);
        container.appendChild(renderer.domElement);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.display = "block";

        const render = () => renderer.render(scene, camera);
        const resize = () => {
          const { clientWidth, clientHeight } = container;
          if (clientWidth === 0 || clientHeight === 0) return;
          renderer.setSize(clientWidth, clientHeight, false);
          camera.aspect = clientWidth / clientHeight;
          camera.updateProjectionMatrix();
          render();
        };
        controls.addEventListener("change", render);
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);

        const runtime: Runtime = {
          THREE,
          renderer,
          scene,
          camera,
          controls,
          dynamicGroup,
          staticGroup,
          staticKey: "",
          render,
          dispose: () => {
            controls.dispose();
            disposeObject(dynamicGroup);
            disposeObject(staticGroup);
            renderer.dispose();
            renderer.domElement.remove();
          },
        };
        runtimeRef.current = runtime;
        resize();
        setReady(true);
      } catch {
        if (!cancelled) setUnsupported(true);
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
      setReady(false);
    };
  }, [algorithmId, meta]);

  // フレームが変わったら、経路・点を作り直して描く
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!ready || !runtime || !currentFrame || !meta) return;
    const { THREE, scene, staticGroup, dynamicGroup } = runtime;
    const unit = new THREE.Vector3(...meta.camera.position).distanceTo(new THREE.Vector3(...meta.camera.target)) * 0.017;
    const colorOf = (state: StateColorKey) => new THREE.Color(stateColors[state]);

    // 曲面・球・軸・床: 内容が変わった時だけ作り直す
    const key = staticKeyOf(currentFrame);
    if (runtime.staticKey !== key) {
      runtime.staticKey = key;
      disposeObject(staticGroup);
      const idle = colorOf("idle");
      const extent = new THREE.Vector3(...meta.camera.position).distanceTo(new THREE.Vector3(...meta.camera.target));
      const grid = new THREE.GridHelper(extent * 1.1, 14, 0x4a5163, 0x2a2f3d);
      staticGroup.add(grid);
      const axisLength = extent * 0.35;
      for (const [vector, name] of [
        [[axisLength, 0, 0], "x"],
        [[0, axisLength, 0], "y"],
        [[0, 0, axisLength], "z"],
      ] as [Vec3, string][]) {
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(...vector)]);
        const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: name === "y" ? 0x8b93a7 : 0x5a6275 }));
        staticGroup.add(line);
      }
      const surface = currentFrame.surface;
      if (surface) {
        const { nx, nz, xRange, zRange, heights } = surface;
        const positions: number[] = [];
        for (let iz = 0; iz < nz; iz++) {
          for (let ix = 0; ix < nx; ix++) {
            positions.push(
              xRange[0] + ((xRange[1] - xRange[0]) * ix) / (nx - 1),
              heights[iz * nx + ix],
              zRange[0] + ((zRange[1] - zRange[0]) * iz) / (nz - 1),
            );
          }
        }
        const indices: number[] = [];
        const lineIndices: number[] = [];
        for (let iz = 0; iz < nz - 1; iz++) {
          for (let ix = 0; ix < nx - 1; ix++) {
            const a = iz * nx + ix;
            const b = a + 1;
            const c = a + nx;
            const d = c + 1;
            indices.push(a, c, b, b, c, d);
          }
        }
        for (let iz = 0; iz < nz; iz++) {
          for (let ix = 0; ix < nx; ix++) {
            const a = iz * nx + ix;
            if (ix < nx - 1) lineIndices.push(a, a + 1);
            if (iz < nz - 1) lineIndices.push(a, a + nx);
          }
        }
        const meshGeometry = new THREE.BufferGeometry();
        meshGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        meshGeometry.setIndex(indices);
        staticGroup.add(
          new THREE.Mesh(meshGeometry, new THREE.MeshBasicMaterial({ color: 0x1d2130, transparent: true, opacity: 0.6, side: THREE.DoubleSide })),
        );
        const wireGeometry = new THREE.BufferGeometry();
        wireGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        wireGeometry.setIndex(lineIndices);
        staticGroup.add(new THREE.LineSegments(wireGeometry, new THREE.LineBasicMaterial({ color: idle })));
      }
      if (currentFrame.sphere) {
        const sphere = new THREE.SphereGeometry(currentFrame.sphere.radius, 24, 16);
        staticGroup.add(new THREE.LineSegments(new THREE.WireframeGeometry(sphere), new THREE.LineBasicMaterial({ color: idle })));
        sphere.dispose();
      }
    }

    // 経路・点: フレームごとに作り直す
    disposeObject(dynamicGroup);
    for (const path of currentFrame.paths) {
      const points = path.points.map((p) => new THREE.Vector3(...p));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: colorOf(path.state), transparent: path.state === "idle", opacity: path.state === "idle" ? 0.55 : 1 });
      dynamicGroup.add(path.closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material));
    }
    for (const point of currentFrame.points) {
      const size = unit * (point.size ?? 1);
      let geometry;
      if (point.state === "swapping") geometry = new THREE.ConeGeometry(size * 0.9, size * 2, 12);
      else if (point.state === "pivot") geometry = new THREE.OctahedronGeometry(size * 1.15);
      else if (point.state === "settled") geometry = new THREE.BoxGeometry(size * 1.5, size * 1.5, size * 1.5);
      else geometry = new THREE.SphereGeometry(point.state === "idle" ? size * 0.7 : size, 14, 10);
      const color = stateColors[point.state];
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color }));
      mesh.position.set(...point.position);
      dynamicGroup.add(mesh);
      // 発光は確定・比較中の色だけ(決めごと表 2.7節)。透明な外殻で表す
      if (shouldGlow(color)) {
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(size * 1.9, 14, 10),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16 }),
        );
        halo.position.copy(mesh.position);
        dynamicGroup.add(halo);
      }
    }
    void scene;
    runtime.render();
  }, [ready, currentFrame, meta]);

  const applyView = useCallback(
    (direction: Vec3 | null) => {
      const runtime = runtimeRef.current;
      if (!runtime || !meta) return;
      const target = new runtime.THREE.Vector3(...meta.camera.target);
      const distance = new runtime.THREE.Vector3(...meta.camera.position).distanceTo(target);
      if (direction === null) runtime.camera.position.set(...meta.camera.position);
      else runtime.camera.position.copy(new runtime.THREE.Vector3(...direction).normalize().multiplyScalar(distance).add(target));
      runtime.controls.target.copy(target);
      runtime.controls.update();
      runtime.render();
    },
    [meta],
  );

  if (!meta) return null;

  return (
    <div className={styles.visualizer}>
      <ul className={styles.chips}>
        {meta.chips.map((chip) => (
          <li key={chip} className={styles.chip}>
            {chip}
          </li>
        ))}
      </ul>

      <ZoomableStage hud={{ kind: stepKinds[stepIndex] ?? "idle", step: stepIndex, total: frames.length }}>
        <div
          ref={containerRef}
          className={styles.canvasWrap}
          tabIndex={0}
          role="img"
          aria-label={currentFrame ? `3次元の図。${currentFrame.description}` : "3次元の可視化"}
        />
        {unsupported ? (
          <p className={styles.unsupported}>このブラウザでは3D表示(WebGL)を使えません。下の説明と数値で、同じ手順を追えます。</p>
        ) : null}
      </ZoomableStage>

      <div className={styles.viewBar} role="group" aria-label="視点の切り替え">
        <span className={styles.hint}>ドラッグで回転・ホイールで拡大・右ドラッグで移動(図を選んで矢印キーでも動かせます)</span>
        {VIEW_PRESETS.map((preset) => (
          <button key={preset.key} type="button" className={styles.viewButton} onClick={() => applyView(preset.direction)} disabled={!ready}>
            {preset.label}
          </button>
        ))}
      </div>

      {currentFrame && currentFrame.readouts.length > 0 ? (
        <dl className={styles.readouts}>
          {currentFrame.readouts.map((readout) => (
            <div key={readout.label} className={styles.readout}>
              <dt>{readout.label}</dt>
              <dd>{readout.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <p className={styles.description} role="status">
        {isComputing ? "Web Workerで計算中…" : currentFrame?.description}
      </p>
      <PlaybackControls
        stepIndex={stepIndex}
        frameCount={frames.length}
        showPause={showPause}
        isFinished={isFinished}
        speed={speed}
        stepKinds={stepKinds}
        onPlayPause={handlePlayPause}
        onStep={handleStep}
        onScrub={handleScrub}
        onSpeedChange={setSpeed}
        onReset={reset}
        resetLabel="最初から"
      />
      <ul className={styles.legend}>
        {LEGEND_ITEMS.map((item) => (
          <li key={item.key} className={styles.legendItem}>
            <span style={{ color: stateColors[item.key] }} aria-hidden="true">
              {STEP_KIND_LABELS[item.key].glyph}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
      <p className={styles.axes}>
        軸: x = {meta.axes.x} / y(上) = {meta.axes.y} / z = {meta.axes.z}
      </p>
      {meta.caveat ? <p className={styles.caveat}>※ {meta.caveat}</p> : null}
    </div>
  );
}
