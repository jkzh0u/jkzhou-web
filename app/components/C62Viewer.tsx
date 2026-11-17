"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ANTENNA_NAME, buildKit, KEY_TRAVEL, KEYS, KNOB_NAME, SCREEN_FACE, SCREEN_NAME, type KeyId } from "./c62Kit";

const SPIN_SECONDS_PER_TURN = 26;
const START_ANGLE = -0.55; // radians, 0 faces the display toward the viewer
const PAGE_COLOUR = 0xffffff;

// The scroll sequence. Progress p runs 0 to 1 over SCROLL_RANGE viewport heights of scrolling
// while the stage is pinned: the antenna screws on, the knob turns the radio on, the screen lights.
const SCROLL_RANGE = 1;
// The antenna starts this far above its seat (mm) and turns this many times on the way down
const ANTENNA_LIFT = 16;
const ANTENNA_TURNS = 3;
const ANTENNA_END = 0.4;
const KNOB_START = 0.38;
const KNOB_END = 0.6;
const KNOB_ON_ANGLE = -1.1; // clockwise seen from above
const SCREEN_START = 0.55;
const SCREEN_END = 0.85;
// When the sequence starts, the radio turns to face the camera, its PTT side a little toward it
const PRESENT_YAW = 0.35; // relative to the camera
const SETTLE_RATE = 4;
// Room left round the radio
const MARGIN = 1.08;

// Easter egg: 9 1 1 on the keypad brings up the Red Alarm screen for a moment
const ALARM_CODE = ["9", "1", "1"];
const ALARM_MS = 4000;
// The page's red wash: how strong, and how long it takes to come and go
const WASH_OPACITY = .9;
const WASH_IN_MS = 700;
const WASH_OUT_MS = 1200;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const KEY_BY_NAME = new Map<string, KeyId>(KEYS.map((k) => [k.name, k.id]));

// The display's front face. The bezel stays black so only the panel lights up. The renders are
// the panel's own 160 x 128 at 4x, so they fill it exactly.
function screenFace() {
  const { w, h, panel } = SCREEN_FACE;
  const ppm = 640 / panel.w;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * ppm);
  canvas.height = Math.round(h * ppm);
  const g = canvas.getContext("2d");
  if (g) {
    g.scale(ppm, ppm);
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const draw = (image: HTMLImageElement) => {
    if (!g) return;
    g.imageSmoothingEnabled = false;
    g.drawImage(image, panel.x, panel.y, panel.w, panel.h);
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

export default function C62Viewer({ screen, alarm }: { screen: string; alarm?: string }) {
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
      "3D model of a Retevis C62 handheld radio receiving a TETRA call. Drag or use the left and right arrow keys to rotate.",
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
    turntable.add(kit);
    scene.add(turntable);

    const antenna = kit.getObjectByName(ANTENNA_NAME);
    const antennaSeat = antenna?.position.clone();
    const knob = kit.getObjectByName(KNOB_NAME);
    const placeAntenna = (screwed: number) => {
      if (!antenna || !antennaSeat) return;
      antenna.position.y = antennaSeat.y + ANTENNA_LIFT * (1 - screwed);
      antenna.rotation.y = -ANTENNA_TURNS * Math.PI * 2 * (1 - screwed);
    };
    placeAntenna(0);

    // Measure the radio at its tallest, with the antenna off its seat, and centre it on the spin
    // axis. The frame fits the radius it sweeps, so nothing leaves the frame as it turns.
    kit.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(kit);
    const centre = bounds.getCenter(new THREE.Vector3());
    kit.position.set(-centre.x, -centre.y, -centre.z);
    // extra room under the foot, so the fade at the bottom of the stage only covers the shadow
    const halfHeight = ((bounds.max.y - bounds.min.y) / 2) * MARGIN * 1.08;
    const halfWidth = Math.hypot((bounds.max.x - bounds.min.x) / 2, (bounds.max.z - bounds.min.z) / 2) * MARGIN;
    turntable.rotation.y = START_ANGLE;

    let needsRender = true;
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
    const loadImage = (src: string) => {
      const image = new Image();
      image.src = src;
      return image;
    };
    const callImage = loadImage(screen);
    const alarmImage = alarm ? loadImage(alarm) : null;
    const showScreen = (image: HTMLImageElement) => {
      if (!image.complete || !image.naturalWidth) return;
      face.draw(image);
      needsRender = true;
    };
    callImage.onload = () => showScreen(callImage);

    // Soft shadow on the floor under the radio
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
      new THREE.PlaneGeometry(0.2, 0.2),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
        opacity: 0.42,
        toneMapped: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -(bounds.max.y - bounds.min.y) / 2 - 0.001;
    scene.add(shadow);

    const target = new THREE.Vector3(0, 0, 0);
    const camera = new THREE.PerspectiveCamera(28, 1, 0.02, 10);
    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 0.7;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.maxPolarAngle = Math.PI * 0.88;

    // Only draw when something moved
    controls.addEventListener("change", () => {
      needsRender = true;
    });

    let fitDistance = 1;
    let stickyTop = 0;
    // Moves the camera to fit, keeping any zoom and rotation the viewer has made
    const reframe = () => {
      const t = Math.tan((camera.fov * Math.PI) / 360);
      const next = Math.max(halfHeight / t, halfWidth / (t * camera.aspect));
      const offset = camera.position.clone().sub(controls.target);
      if (offset.lengthSq() < 1e-6) offset.set(0, 0.12, 1);
      offset.setLength((offset.length() / fitDistance) * next || next);
      fitDistance = next;
      camera.position.copy(controls.target).add(offset);
      controls.minDistance = next * 0.3;
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
    camera.position.set(0, 0.12, 1);
    fitDistance = camera.position.distanceTo(target);
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    let spinning = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dragging = false;
    let ease = 1;
    let resumeAt = 0;
    // The scroll sequence turns the radio to face the camera once, then leaves it alone
    let presenting = false;
    let presentArmed = true;
    let presentSettled = true;
    let presentTarget = 0;
    let progress = -1;
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

    // The keys sink KEY_TRAVEL along their own -Z while held. They do nothing else, except 9 1 1.
    const keyGroups = new Map<KeyId, { group: THREE.Object3D; rest: THREE.Vector3; travel: THREE.Vector3 }>();
    kit.traverse((object) => {
      const id = KEY_BY_NAME.get(object.name);
      if (!id) return;
      const travel = new THREE.Vector3(0, 0, -KEY_TRAVEL).applyQuaternion(object.quaternion);
      keyGroups.set(id, { group: object, rest: object.position.clone(), travel });
    });
    let typed: string[] = [];
    let alarmTimer = 0;
    let washTimer = 0;
    // While the alarm is up the whole page turns red. It multiplies, so the white page goes red and
    // the text stays readable, and it fades in and out instead of flashing.
    const wash = document.createElement("div");
    wash.setAttribute("aria-hidden", "true");
    Object.assign(wash.style, {
      position: "fixed",
      inset: "0",
      background: "#ff4131",
      mixBlendMode: "multiply",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "9999",
    });
    document.body.appendChild(wash);
    const fadeWash = (opacity: number, ms: number) => {
      wash.style.transition = `opacity ${ms}ms ease-in-out`;
      wash.style.opacity = String(opacity);
    };
    const listenForCode = (id: KeyId) => {
      typed = [...typed, id].slice(-ALARM_CODE.length);
      if (!alarmImage || typed.join() !== ALARM_CODE.join() || !screenMaterial?.emissiveIntensity) return;
      typed = [];
      showScreen(alarmImage);
      fadeWash(WASH_OPACITY, WASH_IN_MS);
      window.clearTimeout(alarmTimer);
      window.clearTimeout(washTimer);
      washTimer = window.setTimeout(() => fadeWash(0, WASH_OUT_MS), ALARM_MS - WASH_OUT_MS);
      alarmTimer = window.setTimeout(() => showScreen(callImage), ALARM_MS);
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const keyAt = (event: PointerEvent): KeyId | null => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(kit, true)[0];
      for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) {
        const id = KEY_BY_NAME.get(o.name);
        if (id) return id;
      }
      return null;
    };
    // Runs on the mount in the capture phase, so it sees the press before OrbitControls does and
    // a click on a key does not also turn the radio
    let pressed: { pointerId: number; id: KeyId } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || pressed) return;
      const id = keyAt(event);
      if (!id) return;
      const k = keyGroups.get(id);
      if (!k) return;
      controls.enabled = false;
      pressed = { pointerId: event.pointerId, id };
      k.group.position.copy(k.rest).add(k.travel);
      needsRender = true;
      listenForCode(id);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!pressed || pressed.pointerId !== event.pointerId) return;
      const k = keyGroups.get(pressed.id);
      if (k) k.group.position.copy(k.rest);
      pressed = null;
      controls.enabled = true;
      needsRender = true;
    };
    let hoverFrame = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || dragging || event.buttons) return;
      cancelAnimationFrame(hoverFrame);
      hoverFrame = requestAnimationFrame(() => {
        canvas.style.cursor = keyAt(event) ? "pointer" : "";
      });
    };
    mount.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointermove", onPointerMove);

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
        placeAntenna(smoothstep(0, ANTENNA_END, p));
        if (knob) knob.rotation.y = KNOB_ON_ANGLE * smoothstep(KNOB_START, KNOB_END, p);
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

      const idle = !dragging && !pressed && now > resumeAt;
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
      if (!needsRender) return;
      needsRender = false;
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(loop);

    const visibility = new IntersectionObserver(([entry]) => {
      renderer.setAnimationLoop(entry.isIntersecting ? loop : null);
    });
    visibility.observe(stage);

    return () => {
      visibility.disconnect();
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      window.clearTimeout(alarmTimer);
      window.clearTimeout(washTimer);
      wash.remove();
      cancelAnimationFrame(hoverFrame);
      callImage.onload = null;
      toggle.removeEventListener("click", onToggle);
      mount.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointermove", onPointerMove);
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
  }, [screen, alarm]);

  return (
    // The track is taller than the stage by the scroll that plays the sequence. On desktop it also
    // fills its grid column, so the stage stays pinned beside the write up.
    <div ref={trackRef} className="min-h-[172svh] lg:h-full lg:min-h-[calc(210svh-10rem)]">
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
