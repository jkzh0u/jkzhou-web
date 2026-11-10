import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* ------------------------------------------------------------------
   The model. Everything below is in millimetres.
   X = length of the case (battery end is +X)
   Y = up when the kit stands in landscape (hinge and antenna are +Y)
   Z = depth (lid and screen face +Z, case floor is -Z); z = 0 is the lid seam
------------------------------------------------------------------- */
type P3 = [number, number, number];
type Section = { w: number; h: number; r: number; z: number };

/** Group the viewer rotates about x to open the lid; it pivots on the hinge line */
export const LID_NAME = 'Lid';
/** Group the viewer rotates about z to fold the antenna; it pivots on the knuckle. At -90 degrees
 *  the whip lies along the top of the case, pointing at the battery end */
export const WHIP_NAME = 'Whip';
/** Mesh whose material carries the screen image; its emissive intensity turns it on */
export const SCREEN_NAME = 'Screen';
/** The display's front face in mm, and the lit panel inside its bezel, as drawn in buildKit */
export const SCREEN_FACE = { w: 165, h: 102, panel: { x: 5, y: 6, w: 154, h: 86 } };
const HINGE_Y = 73;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const DRAFT = Math.atan(5 / 48);                       // taper of the base walls
const SIN = Math.sin(DRAFT), COS = Math.cos(DRAFT);
const baseHalfY = (z: number) => 62 + ((z + 49) / 48) * 5;     // outer half-width of the base at height z

export function buildKit() {
  const kit = new THREE.Group();
  kit.name = 'SDR field kit';

  /* ---------- materials ---------- */
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  const m = {
    clear: phys({ color: 0xffffff, roughness: 0, transmission: 1, ior: 1.5, thickness: 2.5, envMapIntensity: 1.7,
      attenuationColor: new THREE.Color(0xd2dcdf), attenuationDistance: 0.0085, side: THREE.DoubleSide }),
    acrylic: phys({ color: 0xffffff, roughness: 0, transmission: 1, ior: 1.49, thickness: 3, envMapIntensity: 1.5,
      attenuationColor: new THREE.Color(0xbfe0e0), attenuationDistance: 0.006, side: THREE.DoubleSide }),
    rubber: std({ color: 0x0e0e10, roughness: 0.82 }),
    blackPlastic: std({ color: 0x151517, roughness: 0.55 }),
    velcro: std({ color: 0x0a0a0b, roughness: 1 }),
    pcbBlack: std({ color: 0x0c0d0f, roughness: 0.5 }),
    pcbGreen: std({ color: 0x1d6a3c, roughness: 0.55 }),
    pcbNavy: std({ color: 0x121a3c, roughness: 0.5 }),
    steel: std({ color: 0xc9ccd1, metalness: 1, roughness: 0.32 }),
    nickel: std({ color: 0xd4d2cc, metalness: 1, roughness: 0.25 }),
    alu: std({ color: 0xb4b8be, metalness: 0.95, roughness: 0.42 }),
    darkSteel: std({ color: 0x3a3c40, metalness: 0.9, roughness: 0.4 }),
    brass: std({ color: 0xc9a13f, metalness: 1, roughness: 0.3 }),
    gold: std({ color: 0xd9b24c, metalness: 1, roughness: 0.22 }),
    ffc: std({ color: 0xc8843a, metalness: 0.55, roughness: 0.38, side: THREE.DoubleSide }),
    cell: phys({ color: 0xe2a3cb, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    white: std({ color: 0xe9e6dc, roughness: 0.7 }),
    paper: std({ color: 0xf2f2ee, roughness: 0.85 }),
    usbBlue: std({ color: 0x2f74d8, roughness: 0.5 }),
    inductor: std({ color: 0x9f9b90, metalness: 0.4, roughness: 0.6 }),
    chip: std({ color: 0x18181a, roughness: 0.4 }),
    glassBlack: phys({ color: 0x050506, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 }),
    fan: std({ color: 0x1b1b1d, roughness: 0.45 }),
    blueCable: std({ color: 0x16357d, roughness: 0.55 }),
    blueConn: std({ color: 0x10214b, roughness: 0.5 }),
    coax: std({ color: 0xb58463, roughness: 0.4 }),
    led: std({ color: 0x330000, emissive: 0xff2a1a, emissiveIntensity: 2.5 }),
  };
  Object.entries(m).forEach(([k, mat]) => { mat.name = k; });
  const wires = new Map<number, THREE.MeshStandardMaterial>();
  const wire = (hex: number) => { let w = wires.get(hex); if (!w) { w = std({ color: hex, roughness: 0.5 }); w.name = 'wire-' + hex.toString(16); wires.set(hex, w); } return w; };

  /* ---------- small helpers ---------- */
  const add = (parent: THREE.Object3D, geom: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0, name?: string) => {
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  const group = (name: string, parent: THREE.Object3D = kit) => { const g = new THREE.Group(); g.name = name; parent.add(g); return g; };
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r);
  const cyl = (r: number, len: number, axis: 'x' | 'y' | 'z' = 'y', seg = 20, rEnd = r) => {
    const g = new THREE.CylinderGeometry(rEnd, r, len, seg);
    if (axis === 'x') g.rotateZ(-Math.PI / 2);
    if (axis === 'z') g.rotateX(Math.PI / 2);
    return g;
  };
  const setBasis = (obj: THREE.Object3D, x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3) => obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(
    V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(1, 1, 1));

  // rounded-rectangle outline, counter-clockwise
  const rrPoints = (w: number, h: number, r: number, k = 10) => {
    const hw = w / 2, hh = h / 2; r = Math.min(r, hw, hh);
    const pts: [number, number][] = [];
    [[hw - r, hh - r, 0], [-(hw - r), hh - r, 0.5], [-(hw - r), -(hh - r), 1], [hw - r, -(hh - r), 1.5]]
      .forEach(([cx, cy, q]) => { for (let i = 0; i <= k; i++) { const a = (q + i / k / 2) * Math.PI; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } });
    return pts;
  };
  const rrShape = (w: number, h: number, r: number, cx = 0, cy = 0) => new THREE.Shape(rrPoints(w, h, r).map(([x, y]) => new THREE.Vector2(x + cx, y + cy)));
  const rrPath = (w: number, h: number, r: number, cx = 0, cy = 0) => new THREE.Path(rrPoints(w, h, r, 6).reverse().map(([x, y]) => new THREE.Vector2(x + cx, y + cy)));
  const frame = (ow: number, oh: number, or: number, iw: number, ih: number, ir: number, depth: number) => {
    const s = rrShape(ow, oh, or); s.holes.push(rrPath(iw, ih, ir));
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 });
  };
  // skin stretched over a stack of rounded rectangles (sections listed bottom to top)
  const loft = (sections: Section[], capBottom: boolean, capTop: boolean) => {
    const rings = sections.map((s) => rrPoints(s.w, s.h, s.r).map(([x, y]) => [x, y, s.z]));
    const n = rings[0].length, pos: number[] = [], idx: number[] = [];
    rings.forEach((ring) => ring.forEach((p) => pos.push(...p)));
    for (let s = 0; s < rings.length - 1; s++) for (let i = 0; i < n; i++) {
      const a = s * n + i, b = s * n + ((i + 1) % n), c = (s + 1) * n + i, d = (s + 1) * n + ((i + 1) % n);
      idx.push(a, b, d, a, d, c);
    }
    const cap = (ringIndex: number, flip: boolean) => {
      const c = pos.length / 3; pos.push(0, 0, sections[ringIndex].z);
      for (let i = 0; i < n; i++) { const a = ringIndex * n + i, b = ringIndex * n + ((i + 1) % n); flip ? idx.push(c, b, a) : idx.push(c, a, b); }
    };
    if (capBottom) cap(0, true);
    if (capTop) cap(rings.length - 1, false);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  };
  const tube = (parent: THREE.Object3D, pts: P3[], r: number, mat: THREE.Material, seg = 64, name?: string) =>
    add(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V(...p))), seg, r, 8, false), mat, 0, 0, 0, name);
  // several thin wires running side by side along one path
  const ribbonCable = (parent: THREE.Object3D, pts: P3[], colours: number[], r: number, pitch: number, side0 = V(1, 0, 0)) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)));
    const N = 48, up = V(0, 0, 1), samples: [THREE.Vector3, THREE.Vector3][] = [];
    let prev = side0.clone();
    for (let i = 0; i <= N; i++) {
      const t = i / N, tan = curve.getTangent(t), side = new THREE.Vector3().crossVectors(tan, up);
      if (side.length() < 0.35) side.copy(prev); else { side.normalize(); if (side.dot(prev) < 0) side.negate(); }
      prev = side.clone(); samples.push([curve.getPoint(t), side]);
    }
    colours.forEach((hex, k) => {
      const off = (k - (colours.length - 1) / 2) * pitch;
      const c = new THREE.CatmullRomCurve3(samples.map(([p, s]) => p.clone().addScaledVector(s, off)));
      add(parent, new THREE.TubeGeometry(c, 56, r, 6, false), wire(hex));
    });
  };
  // flat ribbon (display cable)
  const flatRibbon = (pts: P3[], width: number) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)));
    const N = 60, up = V(0, 0, 1), pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = curve.getPoint(t), s = new THREE.Vector3().crossVectors(curve.getTangent(t), up).normalize().multiplyScalar(width / 2);
      pos.push(p.x + s.x, p.y + s.y, p.z + s.z, p.x - s.x, p.y - s.y, p.z - s.z);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  };
  // drawing surface measured in millimetres
  const canvasTexture = (wmm: number, hmm: number, ppm: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const c = document.createElement('canvas');
    c.width = Math.round(wmm * ppm); c.height = Math.round(hmm * ppm);
    const g = c.getContext('2d')!; g.scale(ppm, ppm); draw(g, wmm, hmm);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  };
  const FONT = 'Arial, Helvetica, "Liberation Sans", sans-serif';
  const roundRect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
  const fitText = (g: CanvasRenderingContext2D, text: string, weightStyle: string, size: number, maxWidth: number) => {
    g.font = `${weightStyle} ${size}px ${FONT}`;
    const w = g.measureText(text).width;
    if (w > maxWidth) g.font = `${weightStyle} ${(size * maxWidth) / w}px ${FONT}`;
  };
  const warnTriangle = (g: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
    g.save(); g.lineJoin = 'round'; g.lineWidth = s * 0.11; g.strokeStyle = g.fillStyle = '#141414';
    g.beginPath(); g.moveTo(cx, cy - s * 0.58); g.lineTo(cx + s * 0.6, cy + s * 0.46); g.lineTo(cx - s * 0.6, cy + s * 0.46); g.closePath(); g.stroke();
    g.fillRect(cx - s * 0.055, cy - s * 0.2, s * 0.11, s * 0.36);
    g.beginPath(); g.arc(cx, cy + s * 0.3, s * 0.065, 0, 7); g.fill(); g.restore();
  };
  // a printed label: thin slab, artwork on the front, plain paper on the back
  const label = (parent: THREE.Object3D, w: number, h: number, tex: THREE.Texture, name: string, faceMat?: THREE.Material) => {
    const front = faceMat || std({ map: tex, roughness: 0.75, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.28 });
    const mesh = new THREE.Mesh(box(w, h, 0.16), [m.paper, m.paper, m.paper, m.paper, front, m.paper]);
    mesh.name = name; parent.add(mesh);
    return mesh;
  };

  /* =================================================================
     CASE  (clear micro case, 236 x 152 x 81 mm outside)
  ================================================================= */
  const caseG = group('Case');
  const clear = { lid: [] as THREE.BufferGeometry[], base: [] as THREE.BufferGeometry[] };
  const addClear = (which: keyof typeof clear, geom: THREE.BufferGeometry, matrix?: THREE.Matrix4) => {
    const g = geom.index ? geom.toNonIndexed() : geom;
    if (matrix) g.applyMatrix4(matrix);
    g.deleteAttribute('uv'); g.clearGroups();
    clear[which].push(g);
  };

  // base tub: rounded floor edge, tapered walls, open top
  const baseSections: Section[] = [];
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2, inset = 6 * (1 - Math.sin(a)); baseSections.push({ w: 216 - 2 * inset, h: 124 - 2 * inset, r: 20 - inset, z: -55 + 6 * (1 - Math.cos(a)) }); }
  baseSections.push({ w: 226, h: 134, r: 22, z: -1 });
  addClear('base', loft(baseSections, true, false));
  addClear('base', frame(233, 141, 25.5, 224, 132, 21, 6), at(0, 0, -7));               // rim flange
  // lid: open bottom, rounded top edge
  const lidSections = [{ w: 228, h: 138, r: 22, z: 0 }];
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2, inset = 5 * (1 - Math.cos(a)); lidSections.push({ w: 225 - 2 * inset, h: 135 - 2 * inset, r: 21 - inset, z: 21 + 5 * Math.sin(a) }); }
  addClear('lid', loft(lidSections, false, true));
  addClear('lid', frame(235, 143, 26.5, 226, 136, 21, 6), at(0, 0, 0));                 // rim flange
  // moulded panels on the lid: a centre window and two strap bands
  addClear('lid', frame(104, 122, 9, 98, 116, 6, 1), at(0, 0, 26));
  [-74, 74].forEach((x) => addClear('lid', frame(37, 122, 7, 31.5, 116.5, 4.5, 1), at(x, 0, 26)));
  // strap ribs carried down the long walls and across the floor
  [-92, -56, 56, 92].forEach((x) => {
    addClear('base', box(1.8, 110, 1.2), at(x, 0, -55.4));
    [-1, 1].forEach((s) => addClear('base', box(1.8, 2.2, 44), at(x, s * (baseHalfY(-26) + 0.6), -26, -s * DRAFT)));
    [-1, 1].forEach((s) => addClear('lid', box(1.8, 2, 19), at(x, s * 69.2, 10.5)));
  });
  // hinges on the +Y long side
  [-74, 74].forEach((x) => {
    for (let k = 0; k < 5; k++) addClear(k % 2 ? 'base' : 'lid', cyl(4, 11.6, 'x', 16), at(x - 24.8 + k * 12.4, 73, 0));
    addClear('lid', box(62, 6, 5), at(x, 70, 3));
    addClear('base', box(62, 6, 5), at(x, 69.5, -4));
  });
  // latches on the -Y long side
  [-74, 74].forEach((x) => {
    addClear('lid', rbox(36, 4, 46, 1.4), at(x, -73.2, -7));
    addClear('lid', rbox(22, 2.2, 22, 0.9), at(x, -75.9, -6));
    addClear('lid', cyl(3, 36, 'x', 14), at(x, -72.4, 14));
    addClear('lid', box(40, 5, 6), at(x, -70.2, 13));
    addClear('base', box(30, 7, 4), at(x, -67.8, -24));
  });
  // padlock tab, end loop, pressure valve body
  {
    const tab = new THREE.Shape(); tab.absarc(0, 0, 6, 0, Math.PI * 2);
    const hole = new THREE.Path(); hole.absarc(0, 0, 2.6, 0, Math.PI * 2, true); tab.holes.push(hole);
    addClear('base', new THREE.ExtrudeGeometry(tab, { depth: 4, bevelEnabled: false, curveSegments: 10 }), at(0, -75, -5.5));
    addClear('base', box(11, 5, 4), at(0, -69.5, -3.5));
    addClear('base', frame(13, 44, 2.5, 7.5, 38.5, 1.2, 4), at(116.5, 0, -8.5, 0, Math.PI / 2, 0));
    [-18, 18].forEach((y) => addClear('base', box(5, 3, 6), at(115.5, y, -8.5)));
    addClear('base', cyl(8.5, 3, 'y', 28), at(0, -baseHalfY(-19) - 1.2, -19, DRAFT));
  }
  const baseMesh = add(caseG, mergeVertices(mergeGeometries(clear.base)), m.clear, 0, 0, 0, 'Case base');
  // The lid is its own top-level group, pivoting on the hinge line (y = HINGE_Y, z = 0), so the
  // viewer can swing it open by rotating the group about x. Negative angles open it.
  const lid = group(LID_NAME);
  lid.position.set(0, HINGE_Y, 0);
  const lidMesh = add(lid, mergeVertices(mergeGeometries(clear.lid)), m.clear, 0, -HINGE_Y, 0, 'Case lid');
  baseMesh.renderOrder = 1; lidMesh.renderOrder = 2;
  add(caseG, frame(230, 138, 24, 225.6, 133.6, 21.8, 1.6), std({ color: 0x1b1c1e, roughness: 0.8 }), 0, 0, -1.2, 'O-ring seal');
  // valve insert
  {
    const v = group('Pressure valve', caseG);
    v.position.set(0, -baseHalfY(-19) - 2.8, -19); setBasis(v, V(1, 0, 0), V(0, -SIN, COS), V(0, -COS, -SIN));
    add(v, new THREE.TorusGeometry(5.6, 0.8, 8, 28), m.rubber);
    add(v, cyl(3.4, 1.2, 'z', 20), m.white, 0, 0, 0.3);
  }

  /* ---------- labels on the case ---------- */
  const INK = '#151515', PAPER = '#f4f4f1';
  const texName = canvasTexture(27.5, 12.6, 18, (g, w, h) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, w, h); g.fillStyle = INK;
    g.font = `400 2.75px ${FONT}`; g.letterSpacing = '0.12px'; g.fillText('jackson zhou', 3.3, 4.7);
    g.font = `400 4.35px ${FONT}`; g.letterSpacing = '0.1px'; g.fillText('19.02.2026', 3.3, 10.3);
  });
  const texDanger = canvasTexture(42, 13, 16, (g, w, h) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, w, h); g.textAlign = 'center';
    fitText(g, 'DANGER!', 'italic 900', 9.6, w - 7);
    const cx = w / 2 + 0.9, cy = 9.9; g.fillStyle = INK;
    for (let i = 9; i >= 1; i--) g.fillText('DANGER!', cx - i * 0.17, cy + i * 0.13);
    g.lineJoin = 'round'; g.lineWidth = 0.85; g.strokeStyle = PAPER; g.strokeText('DANGER!', cx, cy);
    g.fillText('DANGER!', cx, cy);
  });
  const texEats = canvasTexture(78, 13, 16, (g, w, h) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, w, h); g.fillStyle = g.strokeStyle = INK;
    warnTriangle(g, 7.4, 6.6, 7.6);
    g.font = `400 9.3px ${FONT}`; g.letterSpacing = '0.5px'; g.fillText('EATS RF', 15.5, 9.95);
    // small dish pictogram
    g.save(); g.translate(69.6, 6.3); g.rotate(-0.62);
    g.beginPath(); g.ellipse(0, 0, 4.3, 1.85, 0, 0, Math.PI); g.fill();
    g.lineWidth = 0.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -3.3); g.stroke();
    g.beginPath(); g.arc(0, -3.6, 0.6, 0, 7); g.fill(); g.restore();
    g.lineWidth = 0.75; g.lineCap = 'round'; g.beginPath(); g.moveTo(70.9, 8.3); g.lineTo(72.9, 11); g.stroke();
  });
  const texCaution = canvasTexture(46, 13, 16, (g, w, h) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, w, h); g.strokeStyle = g.fillStyle = INK;
    g.lineWidth = 0.42;
    [[1.0, 2.3], [10.7, 12.0]].forEach(([y0, y1]) => { for (let x = 1.2; x < w - 1.6; x += 1.15) { g.beginPath(); g.moveTo(x, y1); g.lineTo(x + 0.75, y0); g.stroke(); } });
    warnTriangle(g, 5.3, 6.6, 5.4); warnTriangle(g, w - 5.3, 6.6, 5.4);
    g.textAlign = 'center'; fitText(g, 'Caution!', '700', 7.0, w - 20);
    g.lineJoin = 'round'; g.lineWidth = 0.8; g.strokeText('Caution!', w / 2, 9.1);
    g.fillStyle = PAPER; g.fillText('Caution!', w / 2, 9.1);
  });
  // maker's plate on the lid (plain version, no manufacturer artwork)
  const texPlate = canvasTexture(92, 29, 12, (g, w, h) => {
    g.fillStyle = '#c4c4c0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#101011'; roundRect(g, 1.5, 1.5, w - 3, h - 3, 1.2); g.fill();
    g.strokeStyle = '#e9e9e6'; g.lineWidth = 0.35;
    g.beginPath(); g.moveTo(1.5, 16.4); g.lineTo(w - 1.5, 16.4); g.moveTo(68, 1.5); g.lineTo(68, 16.4); g.stroke();
    g.fillStyle = '#f1f1ee';
    g.font = `700 9.2px ${FONT}`; g.letterSpacing = '0.6px'; g.fillText('M60', 6, 12.4);
    g.font = `400 5px ${FONT}`; g.letterSpacing = '0.9px'; g.fillText('MICRO CASE', 6, 24.3);
    g.font = `400 2.4px ${FONT}`; g.letterSpacing = '0.5px'; g.fillText('MADE IN', 72, 7.2);
    roundRect(g, 72, 9, 14.5, 4.6, 0.9); g.stroke();
    g.font = `700 2.8px ${FONT}`; g.letterSpacing = '1.6px'; g.fillText('USA', 74.3, 12.35);
  });
  const stickers = group('Stickers', caseG);
  {
    // these two sit on the lid, so they ride on the lid group
    const s = label(lid, 27.5, 12.6, texName, 'Name and date sticker');
    s.position.set(74.5, -51.5 - HINGE_Y, 26.12);
    const p = label(lid, 92, 29, texPlate, 'Lid plate', std({ map: texPlate, roughness: 0.38, metalness: 0.25 }));
    p.position.set(74, 3 - HINGE_Y, 26.12); setBasis(p, V(0, -1, 0), V(1, 0, 0), V(0, 0, 1));
    const onLatchWall = (mesh: THREE.Object3D, x: number, z: number) => {
      mesh.position.set(x, -baseHalfY(z) - 0.25 * COS, z - 0.25 * SIN);
      setBasis(mesh, V(1, 0, 0), V(0, -SIN, COS), V(0, -COS, -SIN));
    };
    onLatchWall(label(stickers, 42, 13, texDanger, 'DANGER! sticker'), -34, -15.5);
    onLatchWall(label(stickers, 46, 13, texCaution, 'Caution! sticker'), 32, -15.5);
    onLatchWall(label(stickers, 78, 13, texEats, 'EATS RF sticker'), -1, -36.5);
  }

  /* =================================================================
     DISPLAY  (7-inch DSI touchscreen, glass 165 x 102 mm)
  ================================================================= */
  const disp = group('Touchscreen');
  const DX0 = -101, DX1 = 64, DY0 = -46, DY1 = 56, DCX = (DX0 + DX1) / 2, DCY = (DY0 + DY1) / 2;
  {
    add(disp, box(165, 102, 1.2), m.glassBlack, DCX, DCY, -2.6, 'Cover glass');
    const face = canvasTexture(165, 102, 5, (g, w, h) => {
      g.fillStyle = '#050506'; g.fillRect(0, 0, w, h);
      const grad = g.createLinearGradient(5, 6, 159, 92); grad.addColorStop(0, '#1b1e22'); grad.addColorStop(1, '#0e1012');
      g.fillStyle = grad; g.fillRect(5, 6, 154, 86);     // the panel itself, switched off
    });
    add(disp, new THREE.PlaneGeometry(165, 102), phys({ map: face, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.03 }), DCX, DCY, -1.98, 'Screen');
    add(disp, box(162, 99, 4), std({ color: 0x8d9095, metalness: 0.8, roughness: 0.45 }), DCX, DCY, -5.2, 'LCD frame');
    add(disp, box(165, 102, 1.6), m.pcbNavy, DCX, DCY, -8, 'Display board');
    const back = canvasTexture(165, 102, 6, (g, w, h) => {
      const X = (x: number) => DX1 - x, Y = (y: number) => DY1 - y;       // model mm -> canvas mm (seen from behind)
      g.fillStyle = '#121a3c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#17214a';
      [[8, 8, 60, 30], [90, 50, 62, 40], [20, 62, 50, 30]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
      g.fillStyle = '#c9b46a';
      [[-64, -29.5], [-6, -29.5], [-64, 19.5], [-6, 19.5]].forEach(([x, y]) => { g.beginPath(); g.arc(X(x), Y(y), 3.1, 0, 7); g.fill(); });
      g.fillStyle = '#e8eaf2';
      g.font = `700 2.9px ${FONT}`; g.fillText('7inch DSI Display', X(-8), Y(-40));
      g.save(); g.translate(X(-80.5), Y(10)); g.rotate(-Math.PI / 2);
      g.font = `700 2px ${FONT}`; g.fillText('Be careful:', 0, 0);
      g.font = `400 1.8px ${FONT}`; g.fillText('1. Ease the latch open', 0, 3); g.fillText('2. No twisting', 0, 5.8); g.fillText('3. Fragile, handle with care', 0, 8.6);
      g.restore();
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 70; i++) { const x = 6 + rnd() * 153, y = 5 + rnd() * 92; g.fillStyle = '#b9bcc4'; g.fillRect(x, y, 0.5, 1.1); g.fillRect(x + 1.5, y, 0.5, 1.1); g.fillStyle = '#0a0d1c'; g.fillRect(x + 0.5, y, 1, 1.1); }
    });
    const bp = add(disp, new THREE.PlaneGeometry(165, 102), std({ map: back, roughness: 0.5 }), DCX, DCY, -8.82, 'Display board silkscreen');
    bp.rotation.y = Math.PI;
    add(disp, box(4, 13, 2.4), m.white, -87, -1.5, -10, 'Display ribbon socket');
    add(disp, box(6, 6, 1.2), m.chip, 40, 44, -9.4);
  }

  /* =================================================================
     RASPBERRY PI 5  (85 x 56 mm, on the back of the display)
  ================================================================= */
  const pi = group('Raspberry Pi 5');
  const HOLES = [[-64, -29.5], [-6, -29.5], [-64, 19.5], [-6, 19.5]];
  {
    add(pi, box(85, 56, 1.4), m.pcbGreen, -25, -5, -15.7, 'Pi board');
    const hex = (len: number) => new THREE.CylinderGeometry(2.6, 2.6, len, 6).rotateX(Math.PI / 2);
    HOLES.forEach(([x, y]) => {
      add(pi, hex(6.2), m.brass, x, y, -11.9);            // display -> Pi
      add(pi, hex(19.6), m.brass, x, y, -26.2);           // Pi -> cover plate
      add(pi, cyl(2.5, 1.6, 'z', 14), m.steel, x, y, -39.8);
    });
    // ports along the +X edge
    [-24, -6.1].forEach((y, i) => {
      add(pi, box(17.5, 13.3, 16), m.steel, 10.75, y, -24.4, 'USB ports');
      add(pi, box(0.4, 11.6, 13.6), m.chip, 19.6, y, -24.4);
      [-20.6, -28.4].forEach((z) => add(pi, box(0.5, 10.4, 1.8), i ? m.usbBlue : m.chip, 19.75, y, z));
    });
    add(pi, box(21, 16, 13.5), m.steel, 9, 12.75, -23.15, 'Ethernet');
    add(pi, box(0.4, 13, 10.5), m.chip, 19.6, 12.75, -23.4);
    // ports along the +Y edge
    add(pi, box(9, 7.5, 3.2), m.steel, -56.3, 20.25, -18, 'USB-C power');
    [-41.7, -28.3].forEach((x) => add(pi, box(6.5, 7.5, 3), m.steel, x, 20.25, -17.9, 'Micro HDMI'));
    add(pi, box(1.6, 1, 0.8), m.led, -21, 21.6, -16.8, 'Status LED');
    // GPIO header and the display connector
    add(pi, box(51, 5, 8.5), m.blackPlastic, -35, -30.5, -20.65, 'GPIO header');
    add(pi, box(3, 12, 5), m.white, -15.5, 13.5, -18.9, 'DISP connector');
    add(pi, box(10, 10, 1.2), m.chip, -3, -15, -17, 'RP1');
    // cooler: finned block with a fan at the port end
    const cooler = group('Cooler', pi);
    add(cooler, rbox(47, 27, 3, 0.8), m.alu, -32, -9, -20.5);
    for (let i = 0; i < 9; i++) add(cooler, box(22, 1.3, 6.5), m.alu, -44, -20.6 + i * 2.9, -25.2);
    add(cooler, cyl(12.6, 6.5, 'z', 32), m.alu, -21, -9, -25.2);
    add(cooler, cyl(10.8, 0.6, 'z', 32), m.fan, -21, -9, -28.6);
    for (let i = 0; i < 7; i++) {
      const blade = add(cooler, box(8, 2.6, 0.5), m.chip, 0, 0, 0); const a = (i / 7) * Math.PI * 2;
      blade.position.set(-21 + Math.cos(a) * 6.2, -9 + Math.sin(a) * 6.2, -29); blade.rotation.z = a + 0.5;
    }
    add(cooler, cyl(4, 1, 'z', 20), m.alu, -21, -9, -29.2);
    // clear cover plate with access slots
    const PCX = -24.45, PCY = -5;
    const plate = rrShape(94.5, 65, 5);
    const slot = (x: number, y: number, w: number, h: number, r: number) => plate.holes.push(rrPath(w, h, r, x - PCX, y - PCY));
    HOLES.forEach(([x, y]) => slot(x, y, 3.2, 3.2, 1.6));
    [-53, -40, -27, -14].forEach((x) => { slot(x, -32, 9, 4.4, 0.8); slot(x, 22, 9, 4.4, 0.8); });
    [-15.5, -26.5].forEach((x) => [-15, -11, -7, -3].forEach((y) => slot(x, y, 9, 2.8, 1.4)));
    [-17, 7].forEach((y) => slot(-66.5, y, 3.6, 11, 0.8));
    {
      const c = new THREE.Path(), x = -48 - PCX, y = 9 - PCY, a = 1.4, b = 5.5;
      [[-a, -b], [-a, -a], [-b, -a], [-b, a], [-a, a], [-a, b], [a, b], [a, a], [b, a], [b, -a], [a, -a], [a, -b]]
        .forEach(([px, py], i) => (i ? c.lineTo(x + px, y + py) : c.moveTo(x + px, y + py)));
      c.closePath(); plate.holes.push(c);
    }
    const plateMesh = add(pi, new THREE.ExtrudeGeometry(plate, { depth: 3, bevelEnabled: false, curveSegments: 8 }), m.acrylic, PCX, PCY, -39, 'Acrylic cover plate');
    plateMesh.renderOrder = 0;
    // display ribbon
    add(pi, flatRibbon([[-17, 13.5, -20.5], [-20, 13.3, -24], [-28, 12.5, -25.5], [-45, 10.8, -25], [-62, 9, -24], [-70, 8, -21], [-75, 6, -15], [-79, 3, -11.5], [-84, 0, -9.9], [-87, -1.5, -9.5]], 11), m.ffc, 0, 0, 0, 'Display ribbon');
  }

  /* =================================================================
     UPS BOARD + 4 x 18650
  ================================================================= */
  const ups = group('UPS board');
  const UX1 = 104, UY1 = 50, UCX = 67, UCY = -0.5;      // board spans x 30..104, y -51..50
  const CELLS_Y = [-28.6, -10, 10, 28.6];
  {
    add(ups, box(74, 101, 1.6), m.pcbBlack, UCX, UCY, -41.2, 'UPS board');
    const silk = canvasTexture(74, 101, 10, (g, w, h) => {
      const X = (x: number) => UX1 - x, Y = (y: number) => UY1 - y;
      g.fillStyle = '#0c0d0f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#121418'; [[6, 10, 30, 36], [40, 52, 28, 40], [8, 60, 24, 30]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
      let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      // via fields
      g.fillStyle = '#d7d8d4';
      [[10, 12, 9, 5], [28, 22, 6, 4], [14, 44, 5, 8], [46, 20, 7, 6], [52, 62, 6, 5], [22, 78, 8, 4], [58, 86, 4, 6]].forEach(([x0, y0, nx, ny]) => {
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { g.beginPath(); g.arc(x0 + i * 1.5, y0 + j * 1.5, 0.3, 0, 7); g.fill(); }
      });
      // surface-mount parts
      for (let i = 0; i < 95; i++) {
        const x = 5 + rnd() * 62, y = 6 + rnd() * 88, v = rnd() > 0.5;
        g.fillStyle = '#b5b6b0'; v ? (g.fillRect(x, y, 1.1, 0.55), g.fillRect(x, y + 1.6, 1.1, 0.55)) : (g.fillRect(x, y, 0.55, 1.1), g.fillRect(x + 1.6, y, 0.55, 1.1));
        g.fillStyle = rnd() > 0.6 ? '#2a2420' : '#17181a'; v ? g.fillRect(x, y + 0.55, 1.1, 1.05) : g.fillRect(x + 0.55, y, 1.05, 1.1);
      }
      // mounting pads and holder rivets
      g.fillStyle = '#c6c7c2';
      [[34, -47], [100, -47], [34, 46], [100, 46]].forEach(([x, y]) => { g.beginPath(); g.arc(X(x), Y(y), 2.7, 0, 7); g.fill(); });
      CELLS_Y.forEach((y) => [32.6, 101.4].forEach((x) => { g.beginPath(); g.arc(X(x), Y(y), 1.15, 0, 7); g.fill(); }));
      // silkscreen
      g.fillStyle = '#eceeea';
      g.save(); g.translate(X(93.5), Y(-8)); g.rotate(Math.PI / 2); g.font = `700 3.4px ${FONT}`; g.letterSpacing = '0.3px'; g.fillText('X-UPS1', 0, 0); g.restore();
      ['GND', '5V0', 'LBAT', 'PLD'].forEach((t, i) => { g.save(); g.translate(X(54.6 - i * 2.1), Y(-43.5)); g.rotate(-Math.PI / 2); g.font = `700 1.5px ${FONT}`; g.fillText(t, 0, 0); g.restore(); });
      g.font = `700 2.3px ${FONT}`; g.fillText('WARNING', X(47.5), Y(-27));
      g.font = `400 1.3px ${FONT}`; ['B4', 'B3', 'B2', 'B1'].forEach((t, i) => g.fillText(t, X(47) + i * 3, Y(-31.5)));
    });
    const sp = add(ups, new THREE.PlaneGeometry(74, 101), std({ map: silk, roughness: 0.5 }), UCX, UCY, -42.02, 'UPS silkscreen');
    sp.rotation.y = Math.PI;
    // underside parts (seen through the case floor)
    [[77.8, -5.1], [69.4, 10.8], [72.7, 27.2], [55.3, -2.3]].forEach(([x, y]) => {
      add(ups, rbox(10, 10, 4.4, 0.8), m.inductor, x, y, -44.2, 'Inductor');
      add(ups, box(10.6, 3, 1), m.steel, x, y, -42.5);
    });
    [[82, 11, 4.5], [60, -17, 5], [88, -22, 4], [50, 24, 4], [62, 38, 3.5], [92, 34, 3.5]].forEach(([x, y, s]) => add(ups, box(s, s, 1), m.chip, x, y, -42.5));
    [93.3, 70.3].forEach((x) => {
      add(ups, box(13.2, 14, 5.8), m.steel, x, -46, -44.9, 'USB-A output');
      add(ups, box(11.6, 0.4, 4.4), m.chip, x, -53.05, -44.9);
      add(ups, box(10, 0.5, 1.6), m.white, x, -53.15, -44.2);
    });
    add(ups, box(10, 5.5, 6), m.white, 51, -49.2, -45, 'Signal connector');
    // mounting: standoffs to the case floor, screw heads outside
    [[34, -47], [100, -47], [34, 46], [100, 46]].forEach(([x, y]) => {
      add(ups, new THREE.CylinderGeometry(2.6, 2.6, 10, 6).rotateX(Math.PI / 2), m.brass, x, y, -47, 'Standoff');
      add(ups, cyl(2.9, 1.8, 'z', 16), m.darkSteel, x, y, -55.9, 'Mounting screw');
    });
    // lid-side parts
    add(ups, box(8, 5, 5), m.white, 64, -45.5, -37.9);
    [76, 85].forEach((x) => add(ups, box(7.5, 5.8, 7), m.white, x, -45.5, -36.9, 'Power output'));
    add(ups, box(9, 9, 10), m.white, 97, -45.8, -35.4, '12 V output');
    add(ups, box(14, 9, 11), m.blackPlastic, 98, 45, -34.9, 'DC input jack');
    add(ups, cyl(3.2, 0.5, 'x', 18), m.chip, 105.05, 45, -34.4);
    add(ups, cyl(0.9, 1.2, 'x', 10), m.steel, 105, 45, -34.4);
    add(ups, box(13, 5, 8.5), m.blackPlastic, 71, 45, -36.15, 'Signal header');
    add(ups, box(10.6, 2.8, 12), m.blackPlastic, 71, 45, -26, 'Jumper plug');
    // battery holder
    const holder = group('Battery holder', ups);
    add(holder, box(74, 80, 2.5), m.blackPlastic, UCX, 0, -39.15);
    [31.75, 102.25].forEach((x) => add(holder, box(3.5, 80, 13.9), m.blackPlastic, x, 0, -30.95));
    [-39.3, 0, 39.3].forEach((y) => add(holder, box(67, 1.4, y ? 7 : 11), m.blackPlastic, UCX, y, y ? -34.4 : -32.4));
    CELLS_Y.forEach((y) => [29.85, 104.15].forEach((x) => { add(holder, box(0.5, 6.5, 9), m.steel, x, y, -31); add(holder, box(0.5, 12, 3.2), m.steel, x, y, -33.4); }));
    // cells
    const cells = group('18650 cells');
    const profile = [[0, -32.5], [7.6, -32.5], [9.2, -31.1], [9.2, 31.1], [7.6, 32.5], [0, 32.5]].map(([r, y]) => new THREE.Vector2(r, y));
    const cellGeom = new THREE.LatheGeometry(profile, 32).rotateZ(-Math.PI / 2);
    CELLS_Y.forEach((y, i) => {
      add(cells, cellGeom, m.cell, 67.25, y, -28.1, `Cell ${i + 1}`);
      const s = i % 2 ? -1 : 1;
      add(cells, cyl(7.3, 0.4, 'x', 24), m.white, 67.25 + s * 32.55, y, -28.1);
      add(cells, cyl(4.2, 0.9, 'x', 20), m.steel, 67.25 + s * 32.9, y, -28.1);
      add(cells, cyl(7.3, 0.4, 'x', 24), m.steel, 67.25 - s * 32.55, y, -28.1);
    });
  }

  /* =================================================================
     USB HUB  (on edge against the latch wall, ports facing the lid)
  ================================================================= */
  const hub = group('USB hub');
  {
    add(hub, rbox(111, 12, 27, 1.6), m.blackPlastic, -15.5, -55.5, -16.5, 'Hub body');
    [-39.8, -20.1, -0.4, 19.3].forEach((x) => {
      add(hub, box(13.6, 6, 0.5), m.steel, x, -55.5, -2.95, 'USB-A port');
      add(hub, box(12.4, 4.8, 0.5), m.chip, x, -55.5, -2.85);
      add(hub, box(10.6, 1.9, 0.6), m.usbBlue, x, -54.4, -2.8);
    });
    add(hub, box(108, 1.4, 20), m.velcro, -15.5, -62.1, -16, 'Hook-and-loop strip');
    add(hub, cyl(2.9, 7, 'x', 14, 2.1), m.blackPlastic, -74.5, -55.5, -14).rotation.y = Math.PI;
  }

  /* =================================================================
     AIRSPY MINI  (on edge under the hub) + USB extension + SMA elbow
  ================================================================= */
  const sdr = group('Airspy Mini SDR');
  {
    add(sdr, rbox(57, 8, 21, 2.2), m.alu, -55.5, -53, -40.6, 'SDR body');
    add(sdr, box(60, 2, 16), m.velcro, -55.5, -58.2, -40);
    add(sdr, box(4, 4.5, 12), m.steel, -25.5, -53, -40, 'USB plug');
    add(sdr, rbox(22, 8.4, 16, 1.6), m.blueConn, -14, -53, -40, 'USB extension socket');
    add(sdr, cyl(3.4, 9, 'x', 14, 2.2), m.blueConn, 1.5, -53, -40);
    // RF side
    add(sdr, new THREE.CylinderGeometry(4.3, 4.3, 2.2, 6).rotateZ(Math.PI / 2), m.gold, -85.1, -53, -40);
    add(sdr, cyl(3.1, 6, 'x', 16), m.gold, -88, -53, -40, 'SMA jack');
    add(sdr, new THREE.CylinderGeometry(4.5, 4.5, 5.5, 6).rotateZ(Math.PI / 2), m.gold, -89.2, -53, -40);
    add(sdr, box(8.6, 8.6, 8.6), m.gold, -95.6, -53, -40, 'Right-angle SMA adapter');
    add(sdr, cyl(3.1, 7, 'y', 16), m.gold, -95.6, -45.5, -40);
    add(sdr, new THREE.CylinderGeometry(4.5, 4.5, 7, 6), m.gold, -95.6, -41, -40, 'SMA plug');
    add(sdr, cyl(2.8, 9, 'y', 14), m.gold, -95.6, -33.2, -40);
    add(sdr, cyl(2.1, 5, 'y', 12), m.rubber, -95.6, -26.5, -40);
  }

  /* =================================================================
     ANTENNA  (BNC bulkhead through the hinge-side wall, 210 mm whip)
  ================================================================= */
  const ant = group('Antenna');
  {
    const bz = -28.5, by = baseHalfY(bz);
    const bnc = group('BNC bulkhead', ant);
    bnc.position.set(-65, by, bz); setBasis(bnc, V(1, 0, 0), V(0, COS, -SIN), V(0, SIN, COS));   // local +Y points out of the wall
    add(bnc, rbox(30, 2.2, 30, 1), m.nickel, 0, 1.1, 0, 'Flange plate');
    [[-10.5, 10.5], [10.5, -10.5]].forEach(([x, z]) => add(bnc, cyl(2.7, 1.3, 'y', 14), m.darkSteel, x, 2.8, z));
    add(bnc, cyl(9.5, 2.2, 'y', 28), m.nickel, 0, 3.2, 0);
    add(bnc, cyl(4.8, 11, 'y', 20), m.nickel, 0, 9.5, 0, 'BNC jack');
    add(bnc, new THREE.CylinderGeometry(9.6, 9.6, 3, 6), m.nickel, 0, -4.6, 0, 'Lock nut');
    add(bnc, cyl(7.6, 6.5, 'y', 26), m.nickel, 0, -9.3, 0);
    add(bnc, cyl(6, 18, 'y', 22), m.nickel, 0, -21, 0, 'BNC body');
    add(bnc, cyl(3.2, 6, 'y', 14), m.nickel, 0, -33, 0);
    add(bnc, cyl(7.3, 11.5, 'y', 26), m.nickel, 0, 13.6, 0, 'BNC plug');
    add(bnc, cyl(6.7, 8.5, 'y', 22), m.rubber, 0, 23.4, 0);
    add(bnc, rbox(13.4, 11, 13.2, 2), m.rubber, 0, 31, 0, 'Antenna elbow');
    // whip stands straight up from the elbow. It is its own top-level group, pivoting on the
    // knuckle, so the per-group merge below keeps it movable. The knuckle's axis is the fold axis.
    const hinge = V(0, 33, 0).applyQuaternion(bnc.quaternion).add(bnc.position);
    add(ant, cyl(6.6, 13.6, 'z', 22), m.rubber, hinge.x, hinge.y, hinge.z, 'Antenna knuckle');
    const whip = group(WHIP_NAME); whip.position.copy(hinge);
    const prof = [[0, 0], [6.5, 0], [6.5, 3], [6.1, 3.6], [6.1, 5], [6.5, 5.6], [6.5, 9], [6.1, 9.6], [6.1, 11], [6.5, 11.6], [6.5, 42],
      [6.2, 47], [5.4, 80], [4.5, 130], [3.7, 176], [3.5, 180.5], [2.6, 183.2], [0, 184]].map(([r, y]) => new THREE.Vector2(r, y));
    add(whip, new THREE.LatheGeometry(prof, 28), m.rubber, 0, 0, 0, 'Whip antenna');
  }

  /* =================================================================
     CABLES
  ================================================================= */
  const cables = group('Cables');
  {
    // coax: BNC bulkhead -> along the end wall -> SMA at the SDR
    tube(cables, [[-65, 28.3, -24.8], [-67, 22.5, -28], [-74, 20, -35], [-84, 20, -42], [-93, 14, -46], [-99, 2, -46.5], [-99, -10, -44.5], [-97, -19, -41.5], [-95.6, -24.5, -40]], 1.3, m.coax, 80, 'Coax pigtail');
    // hub lead: round the end of the case, up the hinge wall, into the Pi
    tube(cables, [[-77, -55.5, -14], [-81, -56, -19], [-84.5, -55, -33], [-85, -47, -47], [-92, -28, -49.6], [-99, -5, -49.6], [-99, 20, -49.2], [-92, 42, -48], [-70, 55, -46], [-40, 57, -44], [-10, 57, -42], [10, 55, -38], [22, 46, -33], [25.8, 30, -28], [27, 8, -22], [27, -12, -20.6], [26.5, -19, -20.6]], 1.9, m.rubber, 140, 'Hub lead');
    add(cables, rbox(9, 13, 6.4, 1), m.blackPlastic, 24.2, -24, -20.6);
    // lead that runs over the cooler
    add(cables, rbox(9, 13, 6.6, 1), m.blackPlastic, 24.2, -6.1, -27);
    tube(cables, [[26.5, -6.1, -30.2], [24, -6.1, -33.6], [18, -6.3, -34.2], [2, -6.5, -34.2], [-8, -6, -32.4], [-30, -5, -31.4], [-55, -4, -31.2], [-70, -3, -30.6], [-77, -2, -25], [-79.5, -1, -16], [-80, 0, -10.5]], 1.7, m.rubber, 90, 'USB lead');
    // blue USB extension from the SDR to the Pi
    tube(cables, [[6, -53, -40], [14, -53.3, -40], [21, -51.5, -37.5], [25.5, -45, -32.5], [27, -36, -29.3], [26.6, -30, -28.6]], 2, m.blueCable, 60, 'USB extension lead');
    add(cables, rbox(9, 13, 6.4, 1), m.blueConn, 24.2, -24, -28.5);
    // 4-way lead from the UPS signal connector to the Pi's GPIO pins
    ribbonCable(cables, [[51, -53, -45], [40, -51.5, -46], [22, -46, -45], [0, -43.5, -42.5], [-25, -42.5, -41.5], [-42, -40, -42.2], [-50, -35.5, -42.5], [-53, -31.8, -41.6], [-53, -31.5, -39.6]], [0xc8102e, 0xf2c417, 0x1f4fbf, 0x141414], 0.55, 1.25, V(0, 1, 0));
    add(cables, box(8.4, 2.7, 14.5), m.blackPlastic, -53, -31.6, -32.2, 'GPIO jumper plug');
    // thin 4-way lead that arcs across the underside of the UPS board
    ribbonCable(cables, [[51, -47, -48.2], [43, -38, -49.2], [38, -20, -49.8], [37.5, -3, -50], [40, 18, -50], [45, 34, -49.6], [56, 48, -48.6], [66, 53.5, -46], [71, 54.8, -42], [72, 53.5, -36], [71.5, 49, -31.4], [71, 46.5, -30.6]], [0x141414, 0x7a4a22, 0xe2731c, 0xf2c417], 0.45, 1.0, V(1, 0, 0));
    // 4-way lead over the cells
    ribbonCable(cables, [[71, 45, -19.5], [74, 44, -16.4], [86, 39, -15.6], [86, 24, -16.8], [72, 9, -17.2], [57, -3, -16.4], [47, -13, -14.4], [38, -22, -12.8]], [0x1f4fbf, 0xf2c417, 0xc8102e, 0x141414], 0.6, 1.3, V(0, 1, 0));
  }

  // one mesh per material inside each component keeps the draw count low
  kit.updateMatrixWorld(true);
  [...kit.children].forEach((g) => {
    const inv = g.matrixWorld.clone().invert(), keep: THREE.Mesh[] = [], buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    g.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const material = o.material as THREE.MeshPhysicalMaterial | THREE.Material[];
      if (Array.isArray(material) || material.map || material.transmission > 0) { keep.push(o); return; }
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      Object.keys(geo.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k); });
      geo.clearGroups();
      const bucket = buckets.get(material) ?? [];
      bucket.push(geo);
      buckets.set(material, bucket);
    });
    keep.forEach((o) => g.attach(o));
    [...g.children].forEach((c) => { if (!keep.includes(c as THREE.Mesh)) g.remove(c); });
    buckets.forEach((geos, mat) => { const mesh = new THREE.Mesh(mergeVertices(mergeGeometries(geos)), mat); mesh.name = `${g.name} (${mat.name})`; g.add(mesh); });
  });

  // where labels can attach later (mm, same axes as above)
  kit.userData.parts = [
    { name: 'Clear micro case', at: [-100, 40, 27] },
    { name: '7-inch touchscreen', at: [-30, 10, -2] },
    { name: 'Raspberry Pi 5', at: [-32, -9, -30] },
    { name: 'UPS board', at: [72, 20, -45] },
    { name: '4 x 18650 cells', at: [84, 0, -19] },
    { name: 'USB hub', at: [-10, -55, -3] },
    { name: 'Airspy Mini SDR', at: [-55, -57, -40] },
    { name: 'UHF antenna', at: [-65, 200, -32] },
  ];
  return kit;
}
