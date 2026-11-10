"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildKit, LID_NAME, SCREEN_FACE, SCREEN_NAME, WHIP_NAME } from "./sdrKit";

const SPIN_SECONDS_PER_TURN = 26;
const START_ANGLE = -0.55; // radians, 0 faces the screen toward the viewer
const PAGE_COLOUR = 0xffffff;

// The scroll sequence. Progress p runs 0 to 1 over SCROLL_RANGE viewport heights of scrolling
// while the stage is pinned: the antenna stands up, the lid swings open, then the screen comes on.
const SCROLL_RANGE = 1;
// The antenna starts folded along the top of the case, so the case can fill the frame
const FOLD_ANGLE = Math.PI / 2;
const ANTENNA_END = 0.3;
const LID_OPEN_ANGLE = (105 / 180) * Math.PI;
// The hinge is on the top edge, so the case leans back as the lid opens and the open lid stands
// behind the screen instead of swinging out at the camera
const LEAN_ANGLE = (42 / 180) * Math.PI;
const LID_START = 0.25;
const LID_END = 0.8;
const SCREEN_START = 0.72;
const SCREEN_END = 0.95;
// The camera always looks at this height, so the case stays put in the middle of the frame while
// the camera moves in and out
const TARGET_Y = 0.03;
// What the camera fits around the target, in metres: half the height to show and half the width
// the case sweeps as it spins. Measured extents over a full turn, plus a margin: folded the kit
// runs from -0.098 to 0.108 and 0.123 either side; with the antenna up it reaches 0.285.
const FRAME_FOLDED = { halfHeight: 0.152, halfWidth: 0.141 };
// The camera pulls back as the antenna stands up
const FRAME_RAISED = { halfHeight: 0.285, halfWidth: 0.155 };
// Open and leaning back, the kit runs from -0.103 to 0.197 within 30 degrees of the angle it is
// presented at. The camera moves in as the lid opens.
const FRAME_OPEN = { halfHeight: 0.187, halfWidth: 0.135 };
// The open lid sweeps 0.219 either side over a full turn, so spinning it open needs more width
const OPEN_SPIN_HALF_WIDTH = 0.23;
// Halfway open the lid swings out toward the camera and is wider than at either end. Half the
// width it needs, every tenth of the way open, measured within 30 degrees of the presented angle.
const SWING_HALF_WIDTH = [0.131, 0.14, 0.151, 0.163, 0.174, 0.178, 0.178, 0.173, 0.164, 0.148, 0.134];
// The camera makes room for the widest point still to come, so it only ever moves in as the lid
// opens instead of moving in, backing out for the swing, then moving in again
const SWING_AHEAD = SWING_HALF_WIDTH.map((_, i, all) => Math.max(...all.slice(i)));
const swingHalfWidth = (open: number) => {
  const i = clamp(open, 0, 1) * (SWING_AHEAD.length - 1);
  const a = Math.floor(i);
  const b = Math.min(a + 1, SWING_AHEAD.length - 1);
  return lerp(SWING_AHEAD[a], SWING_AHEAD[b], i - a);
};
type Frame = typeof FRAME_FOLDED;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// When the sequence starts, the model turns to show the screen instead of spinning on
const PRESENT_YAW = -0.45; // relative to the camera
const SETTLE_RATE = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// The display's front face. The bezel stays black so only the panel lights up. The recording is
// the display's own 800 x 480, so it fills the panel exactly rather than being cropped to fit.
function screenFace() {
  const { w, h, panel } = SCREEN_FACE;
  const ppm = 5;
  const canvas = document.createElement("canvas");
  canvas.width = w * ppm;
  canvas.height = h * ppm;
  const g = canvas.getContext("2d");
  if (g) {
    g.scale(ppm, ppm);
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#3a3f44";
    g.fillRect(panel.x, panel.y, panel.w, panel.h);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const draw = (video: HTMLVideoElement) => {
    g?.drawImage(video, panel.x, panel.y, panel.w, panel.h);
    texture.needsUpdate = true;
  };
  return { texture, draw };
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = [object.material].flat() as THREE.MeshStandardMaterial[];
    for (const material of materials) {
      material.map?.dispose();
      material.emissiveMap?.dispose();
      material.dispose();
    }
  });
}

export default function SdrViewer({ screen }: { screen?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const mount = mountRef.current;
    const fallback = fallbackRef.current;
    const hint = hintRef.current;
    const toggle = toggleRef.current;
    if (!track || !stage || !mount || !fallback || !hint || !toggle) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      fallback.textContent = "This 3D view needs WebGL, which this browser has switched off.";
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;

    const canvas = renderer.domElement;
    canvas.className = "block h-full w-full cursor-grab outline-none active:cursor-grabbing";
    canvas.setAttribute(
      "aria-label",
      "3D model of a portable SDR receiver built into a clear case. Drag or use the left and right arrow keys to rotate.",
    );
    canvas.setAttribute("role", "img");
    canvas.tabIndex = 0;
    mount.appendChild(canvas);
    fallback.hidden = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PAGE_COLOUR);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.03);
    room.dispose();
    pmrem.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.95;

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(0.5, 0.9, 0.8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.7);
    rim.position.set(-0.7, 0.4, -0.8);
    scene.add(rim);

    // The kit is built in millimetres, the scene is in metres
    const turntable = new THREE.Group();
    const kit = buildKit();
    kit.scale.setScalar(0.001);
    kit.position.set(0, 0, 0.0145); // spin about the middle of the case
    turntable.add(kit);
    turntable.rotation.y = START_ANGLE;
    scene.add(turntable);

    const lid = kit.getObjectByName(LID_NAME);
    const whip = kit.getObjectByName(WHIP_NAME);    if (whip) whip.rotation.z = -FOLD_ANGLE;
    const screenMesh = kit.getObjectByName(SCREEN_NAME);
    const screenMaterial =
      screenMesh instanceof THREE.Mesh && screenMesh.material instanceof THREE.MeshPhysicalMaterial
        ? screenMesh.material
        : null;
    const face = screenFace();
    if (screenMaterial) {
      screenMaterial.emissive = new THREE.Color(0xffffff);
      screenMaterial.emissiveIntensity = 0;
      screenMaterial.emissiveMap = face.texture;
      screenMaterial.needsUpdate = true;
    }
    // A looping recording of the display, played only while the screen is lit and in view
    let video: HTMLVideoElement | null = null;
    let shownTime = -1;
    if (screen && screenMaterial) {
      video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = screen;
    }
    const updateScreen = (inView: boolean) => {
      if (!video) return;
      const lit = inView && !!screenMaterial && screenMaterial.emissiveIntensity > 0;
      if (!lit) {
        if (!video.paused) video.pause();
        return;
      }
      if (video.paused) video.play().catch(() => {});
      if (video.readyState >= 2 && video.currentTime !== shownTime) {
        shownTime = video.currentTime;
        face.draw(video);
        needsRender = true;
      }
    };

    // Soft shadow on the floor under the kit
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext("2d");
    if (shadowContext) {
      const gradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 64);
      gradient.addColorStop(0, "rgba(0,0,0,0.55)");
      gradient.addColorStop(0.55, "rgba(0,0,0,0.16)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      shadowContext.fillStyle = gradient;
      shadowContext.fillRect(0, 0, 128, 128);
    }
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.42),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
        opacity: 0.42,
        toneMapped: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.092;
    scene.add(shadow);

    const target = new THREE.Vector3(0, TARGET_Y, 0);
    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 10);
    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 0.7;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.maxPolarAngle = Math.PI * 0.88;

    // Only draw when something moved. The clear case is expensive to render.
    let needsRender = true;
    controls.addEventListener("change", () => {
      needsRender = true;
    });

    let fitDistance = 1;
    let stickyTop = 0;
    // 0 frames the case with the antenna folded, 1 the whole kit with it standing up
    let framing = 0;
    // How far the lid is open, and how far the frame has widened for spinning
    let opening = 0;
    let wide = 0;
    const frame = (key: keyof Frame) =>
      lerp(lerp(FRAME_FOLDED[key], FRAME_RAISED[key], framing), FRAME_OPEN[key], opening);
    // Moves the camera to fit, keeping any zoom and rotation the viewer has made
    const reframe = () => {
      const t = Math.tan((camera.fov * Math.PI) / 360);
      const halfHeight = frame("halfHeight");
      const fitted = opening > 0 ? Math.max(frame("halfWidth"), swingHalfWidth(opening)) : frame("halfWidth");
      const halfWidth = lerp(fitted, OPEN_SPIN_HALF_WIDTH, opening * wide);
      const next = Math.max(halfHeight / t, halfWidth / (t * camera.aspect));
      const offset = camera.position.clone().sub(controls.target);
      if (offset.lengthSq() < 1e-6) offset.set(0, 0.16, 1);
      offset.setLength((offset.length() / fitDistance) * next || next);
      fitDistance = next;
      camera.position.copy(controls.target).add(offset);
      controls.minDistance = next * 0.35;
      controls.maxDistance = next * 1.7;
      needsRender = true;
    };
    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      reframe();
      stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
    };
    camera.position.set(0, TARGET_Y + 0.16, 1);
    fitDistance = camera.position.distanceTo(target);
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    let spinning = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dragging = false;
    let ease = 1;
    let resumeAt = 0;
    // The scroll sequence turns the model to face the camera once, then leaves it alone
    let presenting = false;
    let presentArmed = true;
    let presentSettled = true;
    let presentTarget = 0;
    let progress = 0;
    const showSpinState = () => {
      const on = spinning && !presenting;
      toggle.textContent = on ? "pause" : "spin";
      toggle.setAttribute("aria-pressed", String(on));
    };
    showSpinState();
    const onToggle = () => {
      if (spinning && !presenting) {
        spinning = false;
      } else {
        spinning = true;
        presenting = false;
        presentArmed = false;
      }
      ease = 0;
      showSpinState();
    };
    toggle.addEventListener("click", onToggle);

    controls.addEventListener("start", () => {
      dragging = true;
      presentSettled = true;
      hint.style.opacity = "0";
    });
    controls.addEventListener("end", () => {
      dragging = false;
      ease = 0;
      resumeAt = performance.now() + 900;
    });

    // The wheel zooms only after the model is clicked, so scrolling the page past it never gets
    // caught. Lenis has to be told to leave those wheel events alone, or the page moves as well.
    if (window.matchMedia("(pointer: coarse)").matches) hint.textContent = "drag to rotate, pinch to zoom";
    controls.enableZoom = false;
    const engage = () => {
      controls.enableZoom = true;
      canvas.setAttribute("data-lenis-prevent-wheel", "");
    };
    const disengage = () => {
      controls.enableZoom = false;
      canvas.removeAttribute("data-lenis-prevent-wheel");
    };
    canvas.addEventListener("pointerdown", engage);
    canvas.addEventListener("pointerleave", disengage);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      turntable.rotation.y += event.key === "ArrowLeft" ? -0.2 : 0.2;
      resumeAt = performance.now() + 1500;
      ease = 0;
      presentSettled = true;
      needsRender = true;
      event.preventDefault();
    };
    canvas.addEventListener("keydown", onKeyDown);

    // How far the stage has been pinned, as a share of the scroll that drives the sequence
    const scrollProgress = () => {
      const trackRect = track.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const range = Math.min(trackRect.height - stageRect.height, window.innerHeight * SCROLL_RANGE);
      if (range <= 0) return 0;
      return clamp((stickyTop - trackRect.top) / range, 0, 1);
    };

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const p = scrollProgress();
      if (p !== progress) {
        progress = p;
        stage.dataset.progress = p.toFixed(3);
        const raise = smoothstep(0, ANTENNA_END, p);
        if (whip) whip.rotation.z = -FOLD_ANGLE * (1 - raise);
        // The tip's height goes with the sine of the angle, so the frame grows the same way and
        // the tip never runs out of the top
        framing = Math.sin((raise * Math.PI) / 2);
        const open = smoothstep(LID_START, LID_END, p);
        opening = open;
        reframe();
        if (lid) lid.rotation.x = -LID_OPEN_ANGLE * open;
        kit.rotation.x = -LEAN_ANGLE * open;
        if (screenMaterial) screenMaterial.emissiveIntensity = smoothstep(SCREEN_START, SCREEN_END, p);
        needsRender = true;
      }
      if (p === 0) {
        if (presenting) {
          presenting = false;
          showSpinState();
        }
        presentArmed = true;
      } else if (presentArmed) {
        presentArmed = false;
        presenting = true;
        presentSettled = false;
        presentTarget = controls.getAzimuthalAngle() + PRESENT_YAW;
        showSpinState();
      }

      // Pull back to fit the open lid's sweep when it is set spinning, and back in when it stops
      const wideTarget = spinning && !presenting ? 1 : 0;
      if (wide !== wideTarget) {
        wide += (wideTarget - wide) * (1 - Math.exp(-dt * SETTLE_RATE));
        if (Math.abs(wideTarget - wide) < 0.001) wide = wideTarget;
        if (opening > 0) reframe();
      }

      const idle = !dragging && now > resumeAt;
      if (presenting && !presentSettled && idle) {
        const diff = Math.atan2(
          Math.sin(presentTarget - turntable.rotation.y),
          Math.cos(presentTarget - turntable.rotation.y),
        );
        if (Math.abs(diff) < 0.001) {
          turntable.rotation.y = presentTarget;
          presentSettled = true;
        } else {
          turntable.rotation.y += diff * (1 - Math.exp(-dt * SETTLE_RATE));
        }
        needsRender = true;
      } else if (spinning && !presenting && idle) {
        ease = Math.min(1, ease + dt * 1.5);
        turntable.rotation.y += ((Math.PI * 2) / SPIN_SECONDS_PER_TURN) * dt * ease * ease;
        needsRender = true;
      }
      controls.update();
      updateScreen(true);
      if (!needsRender) return;
      needsRender = false;
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(loop);

    const visibility = new IntersectionObserver(([entry]) => {
      renderer.setAnimationLoop(entry.isIntersecting ? loop : null);
      if (!entry.isIntersecting) updateScreen(false);
    });
    visibility.observe(stage);

    return () => {
      visibility.disconnect();
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      toggle.removeEventListener("click", onToggle);
      canvas.removeEventListener("pointerdown", engage);
      canvas.removeEventListener("pointerleave", disengage);
      canvas.removeEventListener("keydown", onKeyDown);
      controls.dispose();
      disposeScene(scene);
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      fallback.hidden = false;
    };
  }, [screen]);

  return (
    // The track is taller than the stage by the scroll that plays the sequence. On desktop it also
    // fills its grid column, so the stage stays pinned beside the write up.
    <div
      ref={trackRef}
      className="min-h-[172svh] lg:h-full lg:min-h-[calc(210svh-10rem)]"
    >
      {/* Shorter than the screen on phones, so there is always somewhere to swipe the page past it */}
      <div
        ref={stageRef}
        className="sticky top-20 h-[62svh] w-full lg:top-24 lg:h-[calc(100svh-10rem)] lg:min-h-[480px]"
      >
        {/* Runs to the screen edges on phones, where the floor shadow is wider than the page column */}
        <div ref={mountRef} className="absolute inset-y-0 -inset-x-4 grid place-items-center md:inset-x-0">
          <p ref={fallbackRef} className="text-neutral-500">
            loading the 3D model...
          </p>
        </div>
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 flex items-center justify-between gap-4 text-sm">
          <p ref={hintRef} className="text-neutral-500 transition-opacity duration-500">
            drag to rotate, click then scroll to zoom
          </p>
          <button
            ref={toggleRef}
            type="button"
            aria-pressed="true"
            className="pointer-events-auto ml-auto min-w-16 cursor-pointer rounded-full border border-neutral-300 bg-white/70 px-3 py-1.5 backdrop-blur-sm transition-colors hover:border-neutral-800"
          >
            pause
          </button>
        </div>
        {/* Fades the floor shadow out instead of letting the canvas edge cut it off */}
        <div className="pointer-events-none absolute -inset-x-4 bottom-0 h-12 bg-gradient-to-t from-white to-transparent md:inset-x-0" />
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-8 bg-gradient-to-r from-white to-transparent lg:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-8 bg-gradient-to-l from-white to-transparent lg:block" />
      </div>
    </div>
  );
}
