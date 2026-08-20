import * as THREE from 'three';

// Anodised aluminium is never a flat value: it carries a fine directional grain
// that breaks up every face. Without it the faces render as one single number
// (a face measured min 67 / max 73 before this) and THAT is the strongest CG
// tell in the whole render — stronger than any material colour.
function grainMaps() {
  const S = 512;
  const rc = document.createElement('canvas'); rc.width = rc.height = S;
  const rg = rc.getContext('2d');
  const rd = rg.createImageData(S, S), rp = rd.data;
  const nc = document.createElement('canvas'); nc.width = nc.height = S;
  const ng = nc.getContext('2d');
  const nd = ng.createImageData(S, S), np = nd.data;
  const rowBias = new Float32Array(S);
  for (let y = 0; y < S; y++) rowBias[y] = Math.random();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const streak = rowBias[y] * 0.6 + Math.random() * 0.4;
      const r = Math.round(120 + streak * 70);
      rp[i] = rp[i + 1] = rp[i + 2] = r; rp[i + 3] = 255;
      const dx = (Math.random() - 0.5) * 26;
      const dy = (rowBias[y] - 0.5) * 10;
      np[i] = Math.round(128 + dx);
      np[i + 1] = Math.round(128 + dy);
      np[i + 2] = 255; np[i + 3] = 255;
    }
  }
  rg.putImageData(rd, 0, 0); ng.putImageData(nd, 0, 0);
  const mk = (cv) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    t.anisotropy = 8;
    t.colorSpace = THREE.NoColorSpace;
    return t;
  };
  return { rough: mk(rc), normal: mk(nc) };
}
const G = grainMaps();

// ── materials ───────────────────────────────────────────────────────────────
// Anodised black, per the XiKii reference: near-black, low specular spread,
// real metalness now that the stage carries a procedural environment.
const M = {
  // envMapIntensity held down: the bright studio env was lifting this albedo to a
  // mid-grey ~70 on screen, which is why the case never read as anodised black.
  shell: new THREE.MeshStandardMaterial({
    name: 'anodisedBlack', color: 0x14161a, roughness: 0.66, metalness: 0.42,
    roughnessMap: G.rough, normalMap: G.normal, normalScale: new THREE.Vector2(0.35, 0.35),
    envMapIntensity: 0.55,
  }),
  shellEdge: new THREE.MeshStandardMaterial({
    name: 'anodisedEdge', color: 0x23272c, roughness: 0.5, metalness: 0.5,
    roughnessMap: G.rough, normalMap: G.normal, normalScale: new THREE.Vector2(0.25, 0.25),
    envMapIntensity: 0.85,
  }),
  bright: new THREE.MeshStandardMaterial({ name: 'machinedEdge', color: 0x8d949b, roughness: 0.32, metalness: 0.6 }),
  matte: new THREE.MeshStandardMaterial({
    name: 'matteBlack', color: 0x101215, roughness: 0.88, metalness: 0.15,
    roughnessMap: G.rough, envMapIntensity: 0.4,
  }),
  glass: new THREE.MeshStandardMaterial({ name: 'tintedGlass', color: 0x223140, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.09, envMapIntensity: 0.45 }),
  led: new THREE.MeshStandardMaterial({ name: 'accentLight', color: 0x7d8cf7, roughness: 0.4, metalness: 0.0, emissive: 0x5566f0, emissiveIntensity: 2.2 })
};

// dead code removed: 'intakeMesh' and 'cardFacet' were bound to zero meshes — the
// card's ribbed face is the photograph-derived plate below, not a procedural rib map.
M.card = new THREE.MeshStandardMaterial({ name: 'cardGraphite', color: 0x14171a, roughness: 0.58, metalness: 0.5, roughnessMap: G.rough, envMapIntensity: 0.7 });
M.gold = new THREE.MeshStandardMaterial({ name: 'cardTrim', color: 0x2c3035, roughness: 0.3, metalness: 0.8 });
M.bracket = new THREE.MeshStandardMaterial({ name: 'ioBracket', color: 0x7f868d, roughness: 0.36, metalness: 0.6 });
// black polished, not chrome: on a blacked-out card the centre facet is a change of
// FINISH, not of colour — same near-black albedo, far lower roughness.
M.facet = new THREE.MeshStandardMaterial({ name: 'blackPolished', color: 0x1a1d21, roughness: 0.12, metalness: 0.7, envMapIntensity: 1.1 });
// fan blades are moulded plastic, not machined metal: no metalness, and DoubleSide
// because a blade is a zero-thickness swept surface seen from both faces at once.
M.fanBlade = new THREE.MeshStandardMaterial({ name: 'fanBlade', color: 0x121416, roughness: 0.72, metalness: 0.08, side: THREE.DoubleSide, envMapIntensity: 0.4 });
M.fanWell = new THREE.MeshStandardMaterial({ name: 'fanWell', color: 0x090a0b, roughness: 0.92, metalness: 0, envMapIntensity: 0.2 });
// bare board: matte dark FR4, effectively no metalness
M.pcb = new THREE.MeshStandardMaterial({ name: 'pcbSubstrate', color: 0x11201a, roughness: 0.85, metalness: 0.05, roughnessMap: G.rough, envMapIntensity: 0.35 });

// Blackout card. The maps are derived from the real product photograph — its ribs,
// facet seams and logo relief survive as STRUCTURE — but every value is compressed
// into anodized-black (albedo 10–38) and the same structure drives roughness, so the
// polished facet catches a highlight while the body stays matte.
// This is lit by the scene on purpose: an unlit photo plate can't take a specular
// hit, and that missing highlight is most of what read as fake.
const texLoader = new THREE.TextureLoader();
const blackoutMap = texLoader.load('assets/gpu-blackout-albedo.png');
blackoutMap.colorSpace = THREE.SRGBColorSpace;
blackoutMap.anisotropy = 16;
const blackoutRough = texLoader.load('assets/gpu-blackout-rough.png');
blackoutRough.colorSpace = THREE.NoColorSpace;
blackoutRough.anisotropy = 16;
M.cardPhoto = new THREE.MeshStandardMaterial({
  name: 'gpuBlackout',
  map: blackoutMap,
  roughnessMap: blackoutRough,
  normalMap: G.normal,
  normalScale: new THREE.Vector2(0.3, 0.3),
  roughness: 1.0,
  metalness: 0.5,
  envMapIntensity: 0.9,
});

// chassis, in metres — 344 × 246 × 181 mm, 15.3 L
const W = 0.344, H = 0.246, D = 0.181;
const t = 0.014;

// chamfered box: the silhouette is what makes it read as machined metal
// The bevel grows the outline by bevelSize on x/y and by bevelThickness on
// both z ends, so the shape is inset by one bevel first — the finished mesh
// then measures exactly w × h × d, centred on its origin.
function chamfer(name, w, h, d, mat, x = 0, y = 0, z = 0, bevel = 0.0022) {
  const b = Math.min(bevel, w / 6, h / 6, d / 3);
  const s = new THREE.Shape();
  const hw = w / 2 - 2 * b, hh = h / 2 - 2 * b;
  s.moveTo(-hw - b, -hh);
  s.lineTo(-hw - b, hh);
  s.quadraticCurveTo(-hw - b, hh + b, -hw, hh + b);
  s.lineTo(hw, hh + b);
  s.quadraticCurveTo(hw + b, hh + b, hw + b, hh);
  s.lineTo(hw + b, -hh);
  s.quadraticCurveTo(hw + b, -hh - b, hw, -hh - b);
  s.lineTo(-hw, -hh - b);
  s.quadraticCurveTo(-hw - b, -hh - b, -hw - b, -hh);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 3
  });
  geo.translate(0, 0, -(d - 2 * b) / 2);
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function box(name, w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Five service layers, named as the configurator numbers them. Parts go into these
// groups rather than straight onto the model so an exploded view can lift each one
// without rebuilding — setExplode() below just translates them.
export const LAYER_LABELS = [
  ['01', 'Base and supply — Corsair SF1000L, 1000 W SFX-L'],
  ['02', 'ASUS ROG Strix X870-I with Ryzen 9 9950X'],
  ['03', 'NVIDIA RTX PRO 6000 Blackwell, 96 GB — shrouded, flow-through'],
  ['04', 'Noctua NH-L12S over the processor, 70 mm'],
  ['05', 'Top panel — perforated, magnet-held'],
];

export function buildCase() {
  const model = new THREE.Group();
  model.name = 'MX15';

  const L = {};
  ['base', 'board', 'card', 'cooler', 'top', 'panel'].forEach((k) => {
    L[k] = new THREE.Group();
    L[k].name = 'layer_' + k;
    model.add(L[k]);
  });
  model.userData.layers = L;

  // ── shell: open toward +z so the interior reads through the glass ────────
  L.base.add(chamfer('base', W, t, D, M.shell, 0, t / 2, 0));
  L.top.add(chamfer('lid', W, 0.016, D, M.shell, 0, H - 0.008, 0));
  L.base.add(chamfer('endLeft', t, H, D, M.shell, -(W - t) / 2, H / 2, 0));
  L.base.add(chamfer('endRight', t, H, D, M.shell, (W - t) / 2, H / 2, 0));
  L.base.add(chamfer('backPanel', W - 2 * t, H - 2 * t, t, M.shell, 0, H / 2, -(D - t) / 2));

  const px = W / 2 - 0.009, pz = D / 2 - 0.009;
  [[-px, -pz], [px, -pz], [-px, pz], [px, pz]].forEach(([x, z], i) => {
    L.base.add(chamfer('cornerPost' + (i + 1), 0.021, H + 0.002, 0.021, M.shellEdge, x, H / 2, z, 0.003));
  });

  // ── supply bay ───────────────────────────────────────────────────────────
  L.base.add(chamfer('psuShroud', W - 2.4 * t, 0.054, 0.088, M.shell, 0, 0.041, -0.016));
  L.base.add(box('psuFace', 0.128, 0.046, 0.006, M.matte, -(W / 2 - 0.090), 0.041, 0.029));

  // ── ASUS ROG Strix X870-I, mini-ITX 170 × 170, upright on the back wall ──
  // On its machined tray, which is what gives layer 02 a full-footprint slab like
  // every other layer instead of a small board floating in the gap.
  const BX = -0.058, BY = 0.132, BZ = -0.078;
  L.board.add(chamfer('boardTray', W - 2 * t - 0.004, H - 2 * t - 0.004, 0.003, M.shell, 0, H / 2, BZ - 0.004, 0.002));
  L.board.add(box('motherboard', 0.170, 0.170, 0.0016, M.pcb, BX, BY, BZ));
  L.board.add(box('mb_ioShield', 0.044, 0.158, 0.004, M.bracket, BX - 0.061, BY, BZ + 0.003));
  L.board.add(box('mb_chipsetHeatsink', 0.052, 0.030, 0.008, M.shellEdge, BX + 0.048, BY - 0.052, BZ + 0.005));
  L.board.add(box('mb_m2Heatsink', 0.062, 0.022, 0.006, M.shellEdge, BX - 0.030, BY - 0.058, BZ + 0.004));
  L.board.add(box('mb_vrmHeatsink', 0.020, 0.058, 0.009, M.shellEdge, BX - 0.070, BY + 0.030, BZ + 0.006));
  L.board.add(box('mb_socketFrame', 0.048, 0.048, 0.005, M.shellEdge, BX, BY + 0.014, BZ + 0.003));
  L.board.add(box('mb_pcieSlot', 0.090, 0.008, 0.010, M.matte, BX + 0.030, BY - 0.076, BZ + 0.006));
  for (let i = 0; i < 2; i++) {
    L.board.add(box('mb_dimm' + (i + 1), 0.0075, 0.032, 0.104, M.pcb, BX + 0.062 + i * 0.011, BY + 0.048, BZ + 0.053));
  }

  // ── NVIDIA RTX PRO 6000 Blackwell Workstation Edition ───────────────────
  // 304.8 × 137.2 × 40 mm. Two open axial fans in raised bezels over the fin
  // stack, the shroud plate between and around them.
  const CL = 0.3048, CH = 0.1372, CY = 0.068 + 0.0686;
  L.card.add(chamfer('rtxPro6000_backplate', CL, CH, 0.008, M.card, 0, CY, -0.006, 0.003));
  L.card.add(box('rtxPro6000_finStack', CL - 0.03, CH - 0.018, 0.026, M.matte, 0, CY, 0.014));
  // Body top lowered to the channel floor (spans 0.0250–0.0335) so the plate at 0.0335
  // IS the floor and the ribs stand a full 3.7 mm proud. Card thickness unchanged.
  L.card.add(chamfer('rtxPro6000_shroud', CL, CH, 0.0085, M.card, 0, CY, 0.02925, 0.004));

  const shroudFace = new THREE.Mesh(new THREE.PlaneGeometry(CL - 0.004, CH - 0.004), M.cardPhoto);
  shroudFace.name = 'rtxPro6000_shroudFace';
  // recessed to the channel floor: the ribs above occupy the shroud's own depth, so
  // the card's overall 40 mm thickness is unchanged
  shroudFace.position.set(0, CY, 0.0335);
  shroudFace.receiveShadow = true;
  L.card.add(shroudFace);

  // Two 109 mm axial fans, as on the shipping card. Real geometry rather than mapped
  // detail for the same reason the ribs were: at render scale the photographic plate
  // averages flat, while nine swept blades per fan self-shadow and take the rake light
  // at nine different angles. The plate stays underneath as the shroud's surface.
  const fanR = 0.0545, ringW = 0.0044, ringH = 0.0042, bladeCount = 9;
  const bladeGeo = (() => {
    // parametric swept blade: radius t, chord s. Chordwise offset times `rake` is the
    // pitch (so the twist grows with radius, as on a real blade), plus a little camber.
    const rIn = 0.0198, rOut = fanR - 0.0026, NT = 10, NS = 6, curl = 0.66, rake = 0.42;
    const pos = [], idx = [];
    for (let i = 0; i <= NT; i++) {
      const t = i / NT, r = rIn + t * (rOut - rIn), w = 0.30 - 0.13 * t, ca = t * curl;
      for (let j = 0; j <= NS; j++) {
        const s = j / NS - 0.5, a = ca + s * w, d = s * w * r;
        pos.push(r * Math.cos(a), r * Math.sin(a), d * rake + 0.0024 * (0.25 - s * s) * (0.4 + 0.6 * t));
      }
    }
    for (let i = 0; i < NT; i++) {
      for (let j = 0; j < NS; j++) {
        const a = i * (NS + 1) + j, b = a + NS + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();
  const ringShape = new THREE.Shape();
  ringShape.absarc(0, 0, fanR + ringW, 0, Math.PI * 2, false);
  const ringHole = new THREE.Path();
  ringHole.absarc(0, 0, fanR, 0, Math.PI * 2, true);
  ringShape.holes.push(ringHole);
  const ringGeo = new THREE.ExtrudeGeometry(ringShape, { depth: ringH, bevelEnabled: true, bevelSize: 0.0006, bevelThickness: 0.0005, bevelSegments: 1, curveSegments: 64 });
  const wellGeo = new THREE.CircleGeometry(fanR + 0.0006, 64);
  const hubGeo = new THREE.CylinderGeometry(0.0192, 0.0206, 0.0046, 40);
  const capGeo = new THREE.CircleGeometry(0.0178, 40);
  [-1, 1].forEach((side) => {
    const tag = side > 0 ? 'R' : 'L';
    const fan = new THREE.Group();
    fan.name = 'gpuFan' + tag;
    fan.position.set(side * 0.0778, CY, 0.0335);
    const bezel = new THREE.Mesh(ringGeo, M.card);
    bezel.name = 'gpuFan' + tag + '_bezel';
    bezel.castShadow = true; bezel.receiveShadow = true;
    fan.add(bezel);
    const well = new THREE.Mesh(wellGeo, M.fanWell);
    well.name = 'gpuFan' + tag + '_well';
    well.position.z = 0.0007; well.receiveShadow = true;
    fan.add(well);
    for (let i = 0; i < bladeCount; i++) {
      const blade = new THREE.Mesh(bladeGeo, M.fanBlade);
      blade.name = 'gpuFan' + tag + '_blade' + (i + 1);
      blade.rotation.z = (i / bladeCount) * Math.PI * 2 + side * 0.21;
      blade.position.z = 0.0018;
      blade.castShadow = true; blade.receiveShadow = true;
      fan.add(blade);
    }
    const hub = new THREE.Mesh(hubGeo, M.card);
    hub.name = 'gpuFan' + tag + '_hub';
    hub.rotation.x = Math.PI / 2; hub.position.z = 0.0023;
    hub.castShadow = true; hub.receiveShadow = true;
    fan.add(hub);
    const cap = new THREE.Mesh(capGeo, M.facet);
    cap.name = 'gpuFan' + tag + '_hubCap';
    cap.position.z = 0.00475;
    fan.add(cap);
    L.card.add(fan);
  });
  // gold nvidia wordmark, where it actually is — the long side wall, not the top
  L.card.add(box('rtxPro6000_nvidiaLogo', 0.030, 0.0022, 0.007, M.gold, 0.074, CY - CH / 2 - 0.0005, 0.030));
  L.card.add(chamfer('rtxPro6000_ioBracket', 0.006, CH - 0.006, 0.030, M.bracket, -(CL / 2 + 0.002), CY, 0.020, 0.002));
  L.card.add(box('rtxPro6000_pcb', CL - 0.05, 0.034, 0.004, M.pcb, -0.012, CY - CH / 2 + 0.019, -0.012));
  L.card.add(box('rtxPro6000_16pin', 0.028, 0.011, 0.016, M.matte, 0, CY + CH / 2 + 0.0055, 0.010));
  for (let i = 0; i < 4; i++) {
    L.card.add(box('displayPort' + (i + 1), 0.005, 0.008, 0.019, M.matte, -(W / 2 - 0.004), CY - 0.026 + i * 0.017, 0.028));
  }

  // ── Noctua NH-L12S, fan plane parallel to the board ─────────────────────
  L.cooler.add(box('cpuCooler_fins', 0.108, 0.098, 0.030, M.shellEdge, -0.058, 0.148, -0.058));
  const cpuFan = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.025, 40), M.matte);
  cpuFan.name = 'cpuCooler_fan';
  cpuFan.rotation.x = Math.PI / 2;
  cpuFan.position.set(-0.058, 0.146, -0.028);
  cpuFan.castShadow = true;
  L.cooler.add(cpuFan);

  // ── glass wall in a machined frame ──────────────────────────────────────
  // Its own group: it is the panel you take off to reach the five layers, so on the
  // exploded view it slides out toward the viewer instead of lifting with the stack.
  const gz = D / 2 - 0.004;
  L.panel.add(box('window', W - 2.8 * t, H - 2.8 * t, 0.003, M.glass, 0, H / 2, gz));
  const fw = 0.011;
  L.panel.add(chamfer('frameTop', W - 2 * t, fw, 0.008, M.shellEdge, 0, H - t - fw / 2, gz, 0.0018));
  L.panel.add(chamfer('frameBottom', W - 2 * t, fw, 0.008, M.shellEdge, 0, t + fw / 2, gz, 0.0018));
  L.panel.add(chamfer('frameLeft', fw, H - 2 * t, 0.008, M.shellEdge, -(W / 2 - t - fw / 2), H / 2, gz, 0.0018));
  L.panel.add(chamfer('frameRight', fw, H - 2 * t, 0.008, M.shellEdge, (W / 2 - t - fw / 2), H / 2, gz, 0.0018));

  // ── lid: recessed fin grille, two 120 mm fans beneath, accent light ─────
  L.top.add(box('lidRecess', W - 0.052, 0.004, D - 0.036, M.matte, 0, H - 0.0005, 0));
  const finCount = 32;
  for (let i = 0; i < finCount; i++) {
    const x = -(W - 0.072) / 2 + (i * (W - 0.072)) / (finCount - 1);
    L.top.add(box('lidFin' + (i + 1), 0.0038, 0.007, D - 0.048, M.shellEdge, x, H + 0.0015, 0));
  }
  L.top.add(box('accentLight', W - 0.086, 0.0035, 0.007, M.led, 0, H + 0.0035, D / 2 - 0.030));

  // ── right end: recessed vent with machined ribs ─────────────────────────
  L.base.add(box('endRecess', 0.005, 0.106, 0.118, M.matte, W / 2 - 0.0035, H * 0.56, 0));
  for (let i = 0; i < 13; i++) {
    L.base.add(box('endRib' + (i + 1), 0.007, 0.104, 0.0042, M.shellEdge, W / 2 - 0.0025, H * 0.56, -0.054 + i * 0.009));
  }
  L.base.add(box('endBadge', 0.004, 0.010, 0.046, M.shellEdge, W / 2 - 0.004, 0.036, 0.030));

  // ── front-bottom I/O bar ────────────────────────────────────────────────
  const iy = 0.028;
  const power = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.004, 28), M.bright);
  power.name = 'powerButton';
  power.rotation.x = Math.PI / 2;
  power.position.set(W / 2 - 0.052, iy, D / 2 + 0.001);
  L.base.add(power);
  L.base.add(box('usbC1', 0.0095, 0.0042, 0.004, M.matte, W / 2 - 0.080, iy, D / 2));
  L.base.add(box('usbC2', 0.0095, 0.0042, 0.004, M.matte, W / 2 - 0.098, iy, D / 2));
  const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.004, 20), M.matte);
  jack.name = 'audioJack';
  jack.rotation.x = Math.PI / 2;
  jack.position.set(W / 2 - 0.118, iy, D / 2);
  L.base.add(jack);

  // ── feet ────────────────────────────────────────────────────────────────
  [[-W / 2 + 0.038, -D / 2 + 0.034], [W / 2 - 0.038, -D / 2 + 0.034], [-W / 2 + 0.038, D / 2 - 0.034], [W / 2 - 0.038, D / 2 - 0.034]]
    .forEach(([x, z], i) => L.base.add(chamfer('foot' + (i + 1), 0.032, 0.010, 0.028, M.matte, x, -0.005, z, 0.0015)));

  model.position.y = 0.010;

  // Interior lighting. The stage's rims sit BEHIND the object and never reach inside
  // the case, so the card needs its own — but gently. At intensity 3.2 with decay 2
  // and a 0.62 m range, sitting ~0.06 m off the card face, these blew the shroud out
  // to a clipped white rectangle (mean 239). decay 1 over a longer range keeps the
  // falloff across the card face gradual instead of a hotspot.
  // Rib tops and the channel floor share a +z normal, so no light direction alone can
  // separate them — only occlusion can. This one casts, so the channels actually
  // darken between the ribs; the grazing x offset lights one rib wall and shades the other.
  const rake = new THREE.PointLight(0xdfe9f5, 0.34, 1.4, 1);
  rake.name = 'interiorRake';
  rake.position.set(-0.20, CY + 0.075, 0.115);
  rake.castShadow = true;
  rake.shadow.mapSize.set(1024, 1024);
  rake.shadow.camera.near = 0.01;
  rake.shadow.camera.far = 0.6;
  rake.shadow.bias = -0.0004;
  // rides in the card group so it keeps raking the shroud when the layer lifts
  L.card.add(rake);
  const fillIn = new THREE.PointLight(0xbcd0e6, 0.16, 1.2, 1);
  fillIn.name = 'interiorFill';
  fillIn.position.set(0.15, CY - 0.05, 0.11);
  model.add(fillIn);
  return model;
}

// Lift each layer along +Y by amount ∈ 0..1. The lifts are MEASURED, not authored:
// the base group keeps the full-height shell walls (top y ≈ 0.257), so hand-written
// offsets sized to the base tray left the motherboard buried inside the case and the
// card interpenetrating the cooler. Each layer is stacked to clear the one below it by
// a constant gap, computed from real bounding boxes, so it stays correct if the
// geometry changes.
const STACK = ['base', 'board', 'card', 'cooler', 'top'];
const GAP = 0.030;
// Fanned on X and Z as well as lifted, so the assembly is not a 2.5:1 column. The
// stage auto-frames a bounding SPHERE, whose radius follows the tall axis — a thin
// column therefore shrinks to ~23% of canvas width with dead margins either side.
// Stepping each layer diagonally fills the frame, and matches how the reference
// drawing steps its slabs.
const FAN = {
  base:   [0, 0],
  board:  [-0.050, -0.028],
  card:   [-0.100, 0.004],
  cooler: [-0.150, 0.032],
  top:    [-0.200, 0.060],
};
function computeLifts(model) {
  const L = model.userData.layers;
  const bb = new THREE.Box3();
  const lifts = {};
  let prevTop = null;
  STACK.forEach((k) => {
    const saved = L[k].position.y;
    L[k].position.y = 0;
    L[k].updateMatrixWorld(true);
    bb.setFromObject(L[k]);
    L[k].position.y = saved;
    const min = bb.min.y, max = bb.max.y;
    if (prevTop === null) {
      lifts[k] = 0;
      prevTop = max;
    } else {
      lifts[k] = (prevTop + GAP) - min;
      prevTop = max + lifts[k];
    }
  });
  return lifts;
}

export function setExplode(model, amount) {
  const L = model.userData.layers;
  if (!L) return;
  if (!model.userData.lifts) model.userData.lifts = computeLifts(model);
  const lifts = model.userData.lifts;
  STACK.forEach((k) => {
    L[k].position.y = lifts[k] * amount;
    L[k].position.x = FAN[k][0] * amount;
    L[k].position.z = FAN[k][1] * amount;
  });
  L.panel.position.z = 0.26 * amount;
  // stays smoked, never a mirror: on a blacked-out machine the removed panel is dark
  // glass, and at 0xa8bccf it measured 148 mean against 31–38 for every metal layer
  M.glass.opacity = 0.09 + 0.11 * amount;
}

export function buildExploded(amount = 1) {
  const m = buildCase();
  m.name = 'MX15_exploded';
  setExplode(m, amount);
  return m;
}
