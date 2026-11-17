import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* ------------------------------------------------------------------
   The model. Everything below is in millimetres.
   X = width of the radio (knob and accessory port are +X, PTT and antenna are -X)
   Y = up when the radio stands on its foot (antenna is +Y); y = 0 is the foot
   Z = depth (display and keys face +Z, battery and belt clip are -Z); z = 0 is mid-depth

   Body 58 x 121 x 35 (published size). Display 160 x 128 px, lit panel 42 x 33.6 (5:4), its size and the
   badge's measured from product photos against the keypad.
   Stubby antenna 95.25 x 12.70 measured over its connector stud: 5 mm of stud sits in the
   socket and 90.25 mm stands proud. Key pitch, PTT, port cover and clip are scaled from photos.
   The badge above the display and the emblem recess on the antenna are left blank.
------------------------------------------------------------------- */
type P3 = [number, number, number];
type Section = { w: number; h: number; r: number; z: number };

/** Mesh whose material carries the screen image; its emissive intensity turns it on */
export const SCREEN_NAME = 'Screen';
/** The display's front face in mm, and the lit panel inside its bezel, as drawn in buildKit.
 *  panel.x / panel.y are measured from the face's top-left corner, y running down */
export const SCREEN_FACE = { w: 43.8, h: 35.4, panel: { x: 0.9, y: 1, w: 42, h: 33.6 } };
/** Group the viewer rotates about y to turn the power / volume knob; it pivots on the knob's axis */
export const KNOB_NAME = 'Knob';
/** Group the viewer rotates about y to unscrew the antenna; it pivots on the socket seat */
export const ANTENNA_NAME = 'Stubby antenna';
/** Group the viewer rotates about x to open the belt clip; it pivots on the hinge pin.
 *  Positive angles swing the tip away from the battery, up to CLIP_OPEN */
export const CLIP_NAME = 'Clip arm';
export const CLIP_OPEN = 0.38;
/** Every button. Each is its own group, with its origin on the surface it sits in and its
 *  local +Z pointing out of that surface: to press one, move it KEY_TRAVEL along its own -Z */
export const KEYS = [
  { id: '1', name: 'Key 1' }, { id: '2', name: 'Key 2' }, { id: '3', name: 'Key 3' },
  { id: '4', name: 'Key 4' }, { id: '5', name: 'Key 5' }, { id: '6', name: 'Key 6' },
  { id: '7', name: 'Key 7' }, { id: '8', name: 'Key 8' }, { id: '9', name: 'Key 9' },
  { id: '*', name: 'Key star' }, { id: '0', name: 'Key 0' }, { id: '#', name: 'Key hash' },
  { id: 'menu', name: 'Key Menu' }, { id: 'esc', name: 'Key ESC' },
  { id: 'up', name: 'Key Up' }, { id: 'down', name: 'Key Down' }, { id: 'ok', name: 'Key OK' },
  { id: 'p1', name: 'Key P1' }, { id: 'p2', name: 'Key P2' },
  { id: 'ptt', name: 'PTT' }, { id: 'side1', name: 'Side key 1' }, { id: 'side2', name: 'Side key 2' },
] as const;
export type KeyId = (typeof KEYS)[number]['id'];
export const PTT_NAME = 'PTT';
export const KEY_TRAVEL = 0.7;

const W = 58, H = 121;
const SIDE = W / 2;                 // side walls at x = +-29
const BACK = -17.5;                 // back of the battery
const FACE = 15.4;                  // moulded front face; keys and bezel stand about 2 mm proud
const SPLIT = -5.5;                 // where the battery meets the chassis
const SPINE = -14.5;                // back of the chassis above the battery
const DISPLAY_Y = 84, NAV_Y = 56;
const ROWS = [43, 33.3, 23.6, 13.9], COLS = [-15.5, 0, 15.5];
const ANT_X = -14.5, KNOB_X = 16.5, DECK_Z = 0.5, SEAT_Y = H + 3.7;
const HINGE: P3 = [0, 91, -19.4];

export function buildKit() {
  const kit = new THREE.Group();
  kit.name = 'Retevis C62';

  /* ---------- materials ---------- */
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  const m = {
    shell: std({ color: 0x1a1b1d, roughness: 0.82 }),          // moulded housing
    pack: std({ color: 0x151617, roughness: 0.7 }),            // battery and belt clip
    gloss: std({ color: 0x08090a, roughness: 0.18 }),          // bezel, blank badge, port window
    plate: std({ color: 0x101112, roughness: 0.55 }),          // satin plate behind the keys
    key: std({ color: 0x232527, roughness: 0.62 }),
    rubber: std({ color: 0x0e0e0f, roughness: 0.95 }),
    grip: std({ color: 0x2b2d30, metalness: 0.25, roughness: 0.5 }),
    antenna: std({ color: 0x161718, roughness: 0.78 }),
    steel: std({ color: 0xb9bdc3, metalness: 1, roughness: 0.32 }),
    gold: std({ color: 0xd9b25a, metalness: 1, roughness: 0.35 }),
    cavity: std({ color: 0x020202, roughness: 1 }),
    green: std({ color: 0x2fd35a, roughness: 0.45, emissive: 0x0c3a17 }),
    red: std({ color: 0xe23a32, roughness: 0.45, emissive: 0x3d0d0a }),
    white: std({ color: 0xe6e8ea, roughness: 0.6 }),
    lens: phys({ color: 0xf2f4f5, roughness: 0.1, transmission: 0.6, thickness: 1.5, ior: 1.5 }),
  };
  Object.entries(m).forEach(([k, mat]) => { mat.name = k; });

  /* ---------- small helpers ---------- */
  const add = (parent: THREE.Object3D, geom: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, name?: string) => {
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  const group = (name: string, parent: THREE.Object3D = kit) => { const g = new THREE.Group(); g.name = name; parent.add(g); return g; };
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r: number, len: number, axis: 'x' | 'y' | 'z' = 'y', seg = 24, rEnd = r) => {
    const g = new THREE.CylinderGeometry(rEnd, r, len, seg);
    if (axis === 'x') g.rotateZ(-Math.PI / 2);
    if (axis === 'z') g.rotateX(Math.PI / 2);
    return g;
  };
  // rounded-rectangle outline, counter-clockwise
  const rrPoints = (w: number, h: number, r: number, k = 8) => {
    const hw = w / 2, hh = h / 2; r = Math.min(r, hw, hh);
    const pts: [number, number][] = [];
    [[hw - r, hh - r, 0], [-(hw - r), hh - r, 0.5], [-(hw - r), -(hh - r), 1], [hw - r, -(hh - r), 1.5]]
      .forEach(([cx, cy, q]) => { for (let i = 0; i <= k; i++) { const a = (q + i / k / 2) * Math.PI; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } });
    return pts;
  };
  const rrShape = (w: number, h: number, r: number) => new THREE.Shape(rrPoints(w, h, r).map(([x, y]) => new THREE.Vector2(x, y)));
  const rrPath = (w: number, h: number, r: number) => new THREE.Path(rrPoints(w, h, r, 6).reverse().map(([x, y]) => new THREE.Vector2(x, y)));
  const frame = (ow: number, oh: number, or: number, iw: number, ih: number, ir: number, depth: number) => {
    const s = rrShape(ow, oh, or); s.holes.push(rrPath(iw, ih, ir));
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 });
  };
  // skin stretched over a stack of rounded rectangles (sections listed bottom to top)
  const loft = (sections: Section[]) => {
    const rings = sections.map((s) => rrPoints(s.w, s.h, s.r).map(([x, y]) => [x, y, s.z]));
    const n = rings[0].length, pos: number[] = [], idx: number[] = [];
    rings.forEach((ring) => ring.forEach((p) => pos.push(...p)));
    for (let s = 0; s < rings.length - 1; s++) for (let i = 0; i < n; i++) {
      const a = s * n + i, b = s * n + ((i + 1) % n), c = (s + 1) * n + i, d = (s + 1) * n + ((i + 1) % n);
      idx.push(a, b, d, a, d, c);
    }
    const cap = (ringIndex: number, flip: boolean) => {
      const c = pos.length / 3; pos.push(0, 0, sections[ringIndex].z);
      for (let i = 0; i < n; i++) { const a = ringIndex * n + i, b = ringIndex * n + ((i + 1) % n); if (flip) idx.push(c, b, a); else idx.push(c, a, b); }
    };
    cap(0, true); cap(rings.length - 1, false);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  };
  // block w x h x d, centred, with corner radius r in outline and both z edges rounded by f
  const slab = (w: number, h: number, d: number, r: number, f = 0) => {
    f = Math.min(f, d / 2 - 0.01, r - 0.01);
    if (f <= 0) return loft([{ w, h, r, z: -d / 2 }, { w, h, r, z: d / 2 }]);
    const lower: Section[] = [];
    for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2, inset = f * (1 - Math.sin(a)); lower.push({ w: w - 2 * inset, h: h - 2 * inset, r: r - inset, z: -d / 2 + f * (1 - Math.cos(a)) }); }
    return loft([...lower, ...lower.map((s) => ({ ...s, z: -s.z })).reverse()]);
  };
  // the same block turned to sit on a side wall: its thickness along x
  const sideSlab = (depthZ: number, h: number, thick: number, r: number, f = 0) => slab(depthZ, h, thick, r, f).rotateY(Math.PI / 2);
  // drawing surface measured in millimetres
  const canvasTexture = (wmm: number, hmm: number, ppm: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const c = document.createElement('canvas');
    c.width = Math.round(wmm * ppm); c.height = Math.round(hmm * ppm);
    const g = c.getContext('2d')!; g.scale(ppm, ppm); draw(g, wmm, hmm);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  };
  const FONT = 'Arial, Helvetica, "Liberation Sans", sans-serif';
  // white print on a key cap or on the antenna
  const legend = (parent: THREE.Object3D, w: number, h: number, main: string, sub = '', italic = false) => {
    const tex = canvasTexture(w, h, 24, (g) => {
      g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'center';
      if (sub) {
        g.font = `600 ${h * 0.62}px ${FONT}`; g.fillText(main, w * 0.25, h * 0.54);
        g.font = `600 ${h * 0.29}px ${FONT}`; g.fillText(sub, w * 0.66, h * 0.6);
      } else { g.font = `${italic ? 'italic 800' : '600'} ${h * (italic ? 0.82 : 0.6)}px ${FONT}`; g.fillText(main, w / 2, h * 0.54); }
    });
    const mat = std({ map: tex, transparent: true, depthWrite: false, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.name = `Legend ${main}`; parent.add(mesh);
    return mesh;
  };
  // a button: its own group, origin on the surface, +Z out of it
  const keyName = (id: string) => KEYS.find((k) => k.id === id)!.name;
  const key = (parent: THREE.Object3D, id: string, x: number, y: number, z: number, side = false) => {
    const g = group(keyName(id), parent);
    g.position.set(x, y, z);
    if (side) g.rotation.y = -Math.PI / 2;
    return g;
  };

  /* =================================================================
     BODY  (chassis, top deck, everything moulded into the front)
  ================================================================= */
  const body = group('Body');
  {
    add(body, slab(W, H, FACE - SPLIT, 7.5, 2.6), m.shell, 0, H / 2, (FACE + SPLIT) / 2, 'Chassis');
    add(body, slab(53, 37, 11, 5.5, 1.6), m.shell, 0, 102, SPINE + 5.5, 'Chassis spine');
    add(body, cyl(6.9, 4, 'y', 40, 6.5), m.shell, ANT_X, H + 1.7, DECK_Z, 'Antenna socket collar');
    add(body, cyl(7.3, 1.8, 'y', 40, 6.9), m.shell, KNOB_X, H + 0.6, DECK_Z, 'Knob skirt');
    add(body, cyl(2.3, 1.2, 'y', 24), m.lens, 1.5, H + 0.2, 8.5, 'Flashlight lens');
    add(body, cyl(1, 0.8, 'y', 16), m.green, 1.5, H + 0.2, -6, 'Status LED');
    add(body, box(9, 1.6, 1.6), m.shell, -14, H - 3.5, SPINE - 0.4, 'Lanyard bar');
    // stands 0.5 mm proud of the wall, so its face never shares the wall's plane
    [-1, 1].forEach((s) => add(body, sideSlab(11, 22, 0.8, 2, 0.3), m.grip, s * (SIDE + 0.1), 27, 5, 'Grip insert'));
    // front: blank badge, key plate, speaker slots, microphone port
    add(body, slab(30, 6.5, 0.9, 1.6, 0.25), m.gloss, 0, 111, FACE + 0.25, 'Badge (blank)');
    add(body, slab(51, 58, 0.7, 5, 0.25), m.plate, 0, 35.5, FACE + 0.15, 'Key plate');
    for (let r = 0; r < 3; r++) add(body, box(40, 0.55, 0.3), m.cavity, 0, (ROWS[r] + ROWS[r + 1]) / 2, FACE + 0.42, 'Speaker slot');
    add(body, cyl(0.7, 0.3, 'z', 16), m.cavity, 22.5, 47.6, FACE + 0.42, 'Microphone port');
    add(body, cyl(4.5, 1, 'z', 40), m.cavity, 0, NAV_Y, FACE + 1, 'D-pad well');
    // -X side: bright trim round the PTT
    add(body, sideSlab(9.9, 26.3, 0.9, 3, 0.3), m.steel, -SIDE - 0.1, 82.5, 5, 'PTT trim');
    // +X side: accessory jack cover above the USB-C port
    add(body, sideSlab(8.6, 27, 1.5, 2.6, 0.5), m.rubber, SIDE + 0.35, 86, 5, 'Accessory jack cover');
    add(body, box(0.3, 0.7, 6), m.cavity, SIDE + 1.02, 73.8, 5);
    add(body, sideSlab(8.6, 11, 0.9, 2.6, 0.3), m.gloss, SIDE + 0.2, 65.5, 5, 'USB-C window');
    add(body, sideSlab(2.7, 8.5, 0.5, 1.3), m.steel, SIDE + 0.55, 65.5, 5, 'USB-C port');
    add(body, sideSlab(1.5, 7.2, 0.5, 0.7), m.cavity, SIDE + 0.62, 65.5, 5);
  }

  /* =================================================================
     DISPLAY  (160 x 128 LCD about 2.1 in, glass 43.8 x 35.4 mm: the panel fills it but for a thin black edge)
  ================================================================= */
  const disp = group('Display');
  {
    const F = SCREEN_FACE;
    add(disp, slab(F.w + 2, F.h + 2, 1.6, 2.5, 0.5), m.gloss, 0, DISPLAY_Y, FACE + 0.5, 'Bezel');
    // lip that overlaps the glass by 0.5 mm and rounds its corners
    add(disp, frame(F.w + 2, F.h + 2, 2.5, F.w - 1, F.h - 1, 1, 0.5), m.gloss, 0, DISPLAY_Y, FACE + 1.3, 'Bezel lip');
    const face = canvasTexture(F.w, F.h, 12, (g, w, h) => {
      g.fillStyle = '#050506'; g.fillRect(0, 0, w, h);
      const grad = g.createLinearGradient(F.panel.x, F.panel.y, F.panel.x + F.panel.w, F.panel.y + F.panel.h);
      grad.addColorStop(0, '#16181b'); grad.addColorStop(1, '#0b0c0e');
      g.fillStyle = grad; g.fillRect(F.panel.x, F.panel.y, F.panel.w, F.panel.h);     // the panel itself, switched off
    });
    add(disp, new THREE.PlaneGeometry(F.w, F.h), phys({ map: face, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 }), 0, DISPLAY_Y, FACE + 1.34, SCREEN_NAME);
  }

  /* =================================================================
     NAVIGATION  (call and end keys, P1 / P2, up / down rocker, OK)
  ================================================================= */
  const nav = group('Navigation');
  {
    const cap = slab(11.5, 6.2, 1.8, 1.7, 0.45);
    ([['menu', -1, 4.3], ['esc', 1, 4.3], ['p1', -1, -3.9], ['p2', 1, -3.9]] as [string, number, number][]).forEach(([id, s, dy]) => {
      const k = key(nav, id, s * 19.2, NAV_Y + dy, FACE + 0.2);
      add(k, cap, m.key, 0, 0, 0.9);
      if (id === 'menu' || id === 'esc') add(k, slab(6.2, 1.25, 0.2, 0.6), id === 'menu' ? m.green : m.red, 0, 0, 1.82);
      else legend(k, 8.4, 4.2, id.toUpperCase()).position.z = 1.83;
    });
    // the ring is two half-moons, one each way
    const half = () => {
      const s = new THREE.Shape(), a0 = 0.07, a1 = Math.PI - 0.07;
      s.absarc(0, 0, 8.2, a0, a1, false); s.absarc(0, 0, 4.7, a1, a0, true); s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: 1.3, curveSegments: 24, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelOffset: -0.25, bevelSegments: 2 });
    };
    (['up', 'down'] as const).forEach((id) => {
      const k = key(nav, id, 0, NAV_Y, FACE + 0.2), s = id === 'up' ? 1 : -1;
      add(k, id === 'up' ? half() : half().rotateZ(Math.PI), m.key, 0, 0, 0.25);
      add(k, box(4.4, 0.7, 0.12), m.white, 0, s * 6.4, 1.82);
    });
    add(key(nav, 'ok', 0, NAV_Y, FACE + 0.2), cyl(3.9, 2, 'z', 40), m.key, 0, 0, 0.9);
  }

  /* =================================================================
     KEYPAD  (4 x 3)
  ================================================================= */
  const pad = group('Keypad');
  {
    const cap = slab(13.6, 7.2, 1.8, 1.7, 0.45);
    const print: [string, string, string][] = [
      ['1', '1', '.,?'], ['2', '2', 'ABC'], ['3', '3', 'DEF'], ['4', '4', 'GHI'], ['5', '5', 'JKL'], ['6', '6', 'MNO'],
      ['7', '7', 'PQRS'], ['8', '8', 'TUV'], ['9', '9', 'WXYZ'], ['*', '∗', 'LOCK'], ['0', '0', '␣'], ['#', '#', 'FM'],
    ];
    print.forEach(([id, main, sub], i) => {
      const k = key(pad, id, COLS[i % 3], ROWS[Math.floor(i / 3)], FACE + 0.2);
      add(k, cap, m.key, 0, 0, 0.9);
      legend(k, 11.6, 5.8, main, sub).position.z = 1.83;
    });
  }

  /* =================================================================
     SIDE CONTROLS  (-X wall: PTT above two side keys)
  ================================================================= */
  const side = group('Side controls');
  {
    const ptt = key(side, 'ptt', -SIDE - 0.35, 82.5, 5, true);
    add(ptt, slab(8.8, 25.2, 2.4, 2.6, 0.9), m.rubber, 0, 0, 1.2);
    for (let i = -3; i <= 3; i++) add(ptt, box(5.2, 0.6, 0.35), m.rubber, 0, i * 2.6, 2.5);
    [['side1', 61.5], ['side2', 51]].forEach(([id, y]) =>
      add(key(side, id as string, -SIDE + 0.3, y as number, 5, true), slab(8.4, 8.6, 1.9, 2.2, 0.6), m.rubber, 0, 0, 0.75));
  }

  /* =================================================================
     KNOB  (power / volume, on the top deck)
  ================================================================= */
  const knob = group(KNOB_NAME);
  knob.position.set(KNOB_X, H + 1.5, DECK_Z);
  {
    add(knob, cyl(6.2, 8.6, 'y', 40), m.shell, 0, 4.3, 0);
    add(knob, cyl(5.4, 1, 'y', 40, 4.8), m.shell, 0, 9.1, 0);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      add(knob, box(1.05, 7.4, 0.9).rotateY(a), m.shell, Math.sin(a) * 6.2, 4.6, Math.cos(a) * 6.2);
    }
    add(knob, box(0.7, 0.12, 4.2), m.white, 0, 9.62, 2.4, 'Index line');
  }

  /* =================================================================
     BATTERY
  ================================================================= */
  const batt = group('Battery');
  {
    add(batt, slab(54, 84, 12.7, 5.5, 2.2), m.pack, 0, 43.5, BACK + 0.3 + 6.35, 'Battery pack');
    add(batt, slab(22, 5, 1.2, 1.5, 0.4), m.pack, 0, 84, BACK + 1.1, 'Release latch');
    for (let i = 0; i < 9; i++) add(batt, box(26, 0.7, 0.5), m.pack, 0, 50 + i * 3, BACK + 0.25);
    [-8.5, 0, 8.5].forEach((x) => {
      add(batt, slab(5.6, 9.6, 0.5, 1.2), m.cavity, x, 8.6, BACK + 0.4);
      add(batt, box(3.4, 5.6, 0.4), m.gold, x, 7.6, BACK + 0.25, 'Charging contact');
    });
  }

  /* =================================================================
     BELT CLIP  (mount on the chassis spine, sprung arm on a hinge pin)
  ================================================================= */
  const clip = group('Belt clip');
  {
    const [hx, hy, hz] = HINGE;
    add(clip, slab(19, 10, 3.6, 2, 0.6), m.pack, hx, hy + 1.5, SPINE - 1.4, 'Clip mount');
    [-1, 1].forEach((s) => add(clip, box(2.2, 6, 4.2), m.pack, hx + s * 8.6, hy, hz + 0.9));
    add(clip, cyl(1, 20.4, 'x', 16), m.steel, hx, hy, hz, 'Hinge pin');
    [-1, 1].forEach((s) => add(clip, cyl(1.5, 0.6, 'x', 16), m.steel, hx + s * 10.3, hy, hz));
    const arm = group(CLIP_NAME, clip);
    arm.position.set(hx, hy, hz);
    add(arm, cyl(2.3, 14.6, 'x', 20), m.pack);
    add(arm, slab(15, 56, 2.6, 3.2, 0.8), m.pack, 0, -27, -1);
    add(arm, slab(11, 30, 0.9, 2.5, 0.3), m.pack, 0, -20, -2.5);
    add(arm, slab(12.5, 9.5, 2.4, 2.5, 0.7).rotateX(-0.42), m.pack, 0, 5.2, -1.9, 'Thumb tab');
    add(arm, slab(8, 1.6, 0.5, 0.6).rotateX(-0.42), m.cavity, 0, 7.6, -4);
    add(arm, box(11, 3.2, 1.3), m.pack, 0, -52.5, 0.8);
  }

  /* =================================================================
     ANTENNA  (UHF stubby, 95.25 x 12.70 mm over the stud)
  ================================================================= */
  const ant = group(ANTENNA_NAME);
  ant.position.set(ANT_X, SEAT_Y, DECK_Z);
  {
    const R = 6.35, L = 90.25, STUD = 5, mid = 43.5, flatZ = 5.7, tip = 2.6;
    add(ant, cyl(3.1, STUD, 'y', 20), m.steel, 0, -STUD / 2, 0, 'Connector stud');
    add(ant, new THREE.CylinderGeometry(4.3, 4.3, 1.5, 6), m.steel, 0, 0.75, 0, 'Connector nut');
    const prof = [[0, 1.4], [4.7, 1.4], [5.3, 2.1], [5.3, 3.6], [5.95, 4.8], [6, 6], [6, 37.2], [5.35, 37.8], [5.35, 38.9],
      [6.2, 39.4], [6.2, 42], [5.35, 42.5], [5.35, mid + 2]].map(([r, y]) => new THREE.Vector2(r, y));
    add(ant, new THREE.LatheGeometry(prof, 48), m.antenna, 0, 0, 0, 'Lower sheath');
    // upper sheath: full 12.70 round with one flat for the marking, domed tip
    const phi = Math.acos(flatZ / R), d = new THREE.Shape();
    d.absarc(0, 0, R, -Math.PI / 2 + phi, Math.PI * 1.5 - phi, false); d.closePath();
    const upper = new THREE.ExtrudeGeometry(d, { depth: L - mid - 2 * tip, curveSegments: 40, bevelEnabled: true, bevelSize: tip, bevelThickness: tip, bevelOffset: -tip, bevelSegments: 8 });
    add(ant, upper.rotateX(-Math.PI / 2), m.antenna, 0, mid + tip, 0, 'Upper sheath');
    add(ant, cyl(2.2, 0.16, 'z', 32), m.rubber, 0, 63.5, flatZ, 'Emblem recess (blank)');
    const uhf = legend(ant, 13.5, 4.4, 'UHF', '', true);
    uhf.position.set(0, 77, flatZ + 0.04); uhf.rotation.z = Math.PI / 2;
  }

  // one mesh per material inside each component keeps the draw count low. A component is any
  // group that holds meshes directly, so every key, the knob, the clip arm and the antenna keep
  // their own pivots. Textured and see-through meshes are left as they are.
  kit.updateMatrixWorld(true);
  const components: THREE.Object3D[] = [];
  kit.traverse((o) => { if (!(o instanceof THREE.Mesh) && o.children.some((c) => c instanceof THREE.Mesh)) components.push(o); });
  components.forEach((g) => {
    const inv = g.matrixWorld.clone().invert(), buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    [...g.children].forEach((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const material = o.material as THREE.MeshPhysicalMaterial;
      if (material.map || material.transmission > 0) return;
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      Object.keys(geo.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k); });
      geo.clearGroups();
      const bucket = buckets.get(material) ?? [];
      bucket.push(geo);
      buckets.set(material, bucket);
      g.remove(o);
    });
    buckets.forEach((geos, mat) => { const mesh = new THREE.Mesh(mergeVertices(mergeGeometries(geos)), mat); mesh.name = `${g.name} (${mat.name})`; g.add(mesh); });
  });

  // where labels can attach later (mm, same axes as above)
  kit.userData.parts = [
    { name: 'Display, 160 x 128', at: [0, DISPLAY_Y, FACE + 1.5] },
    { name: 'Badge (blank)', at: [0, 111, FACE + 0.8] },
    { name: 'Navigation keys', at: [0, NAV_Y, FACE + 2.2] },
    { name: 'Keypad', at: [0, 28.5, FACE + 2.2] },
    { name: 'PTT', at: [-SIDE - 2.9, 82.5, 5] },
    { name: 'Side keys 1 and 2', at: [-SIDE - 1.8, 56, 5] },
    { name: 'Accessory jack and USB-C', at: [SIDE + 1.2, 76, 5] },
    { name: 'Power / volume knob', at: [KNOB_X, H + 11.3, DECK_Z] },
    { name: 'UHF stubby antenna', at: [ANT_X, SEAT_Y + 70, DECK_Z + 5.8] },
    { name: 'Battery pack', at: [-16, 30, BACK] },
    { name: 'Belt clip', at: [0, 60, HINGE[2] - 2.4] },
    { name: 'Flashlight', at: [1.5, H + 0.9, 8.5] },
  ];
  return kit;
}
