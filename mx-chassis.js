import * as THREE from 'three';

const M = {
  shell: new THREE.MeshStandardMaterial({ color: 0x44484c, roughness: 0.42, metalness: 0.55 }),
  deep: new THREE.MeshStandardMaterial({ color: 0x1e2124, roughness: 0.62, metalness: 0.35 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.3, metalness: 0.4 }),
  board: new THREE.MeshStandardMaterial({ color: 0x2c3339, roughness: 0.72, metalness: 0.1 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xc08b62, roughness: 0.35, metalness: 0.4 }),
  led: new THREE.MeshStandardMaterial({ color: 0x5980a6, emissive: 0x5980a6, emissiveIntensity: 1.1, roughness: 0.4, metalness: 0 })
};
M.shell.name = 'anodised_black';
M.deep.name = 'anodised_deep';
M.steel.name = 'stainless_316L';
M.board.name = 'board';
M.copper.name = 'copper';
M.led.name = 'indicator';

const box = (w, h, d, mat, name) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.name = name;
  return m;
};
const cyl = (r, h, mat, name, seg = 40) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.name = name;
  return m;
};
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Extruded, bevelled plate in the xy plane, thickness along z. */
function plate(w, h, t, mat, name, r = 0.004, bevel = 0.0012) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w, h, r), {
    depth: t, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 8
  });
  g.translate(0, 0, -t / 2);
  const m = new THREE.Mesh(g, mat);
  m.name = name;
  return m;
}

/** Fin stack: thin vertical plates, spaced along z. */
function fins(count, w, h, t, pitch, mat, name) {
  const g = new THREE.Group();
  g.name = name;
  for (let i = 0; i < count; i++) {
    const f = box(w, h, t, mat, 'fin');
    f.position.z = (i - (count - 1) / 2) * pitch;
    g.add(f);
  }
  return g;
}

/** The machined exterior: body, side fin stacks, front bezel, rear I/O, feet. */
export function buildShell(W = 0.30, H = 0.25, D = 0.34) {
  const g = new THREE.Group();
  g.name = 'chassis';

  const body = plate(W, H, D, M.shell, 'billet_shell', 0.009, 0.0035);
  g.add(at(body, 0, H / 2, 0));

  // Side fin stacks, machined into the walls
  const finCount = Math.max(12, Math.round((D - 0.05) / 0.0135));
  for (const side of [-1, 1]) {
    const stack = fins(finCount, 0.009, H * 0.72, 0.0055, 0.0135, M.shell, side < 0 ? 'fin_stack_left' : 'fin_stack_right');
    stack.position.set(side * (W / 2 + 0.0035), H / 2, 0);
    g.add(stack);
    const rail = box(0.011, 0.012, D - 0.02, M.shell, 'fin_rail');
    g.add(at(rail, side * (W / 2 + 0.004), H * 0.86, 0));
    const rail2 = rail.clone();
    g.add(at(rail2, side * (W / 2 + 0.004), H * 0.13, 0));
  }

  // Top: milled pocket with two vent bands
  const pocket = box(W - 0.09, 0.004, D - 0.09, M.deep, 'top_pocket');
  g.add(at(pocket, 0, H - 0.001, 0));
  for (let i = 0; i < 9; i++) {
    const slot = box(W - 0.12, 0.005, 0.006, M.deep, 'top_vent');
    g.add(at(slot, 0, H - 0.0035, -(D - 0.13) / 2 + i * ((D - 0.13) / 8)));
  }

  // Front: recessed intake on the left, machined control strip on the right
  const bezel = plate(W - 0.022, H - 0.022, 0.009, M.deep, 'front_recess', 0.005, 0.002);
  g.add(at(bezel, 0, H / 2, D / 2 - 0.001));
  const iw = (W - 0.022) * 0.63, ix = -(W - 0.022) / 2 + iw / 2 + 0.008;
  const intake = plate(iw, H - 0.05, 0.004, M.deep, 'intake_plate', 0.003, 0.0015);
  g.add(at(intake, ix, H / 2, D / 2 + 0.004));
  const slotN = Math.max(9, Math.round((H - 0.07) / 0.011));
  for (let i = 0; i < slotN; i++) {
    const s = box(iw - 0.016, 0.0055, 0.0035, M.shell, 'intake_slot');
    g.add(at(s, ix, H / 2 - (H - 0.072) / 2 + i * ((H - 0.072) / (slotN - 1)), D / 2 + 0.0065));
  }
  const strip = plate((W - 0.022) * 0.28, H - 0.05, 0.006, M.shell, 'control_strip', 0.003, 0.002);
  const sx = (W - 0.022) / 2 - (W - 0.022) * 0.28 / 2 - 0.008;
  g.add(at(strip, sx, H / 2, D / 2 + 0.004));
  const btn = cyl(0.008, 0.004, M.deep, 'power_button');
  btn.rotation.x = Math.PI / 2;
  g.add(at(btn, sx, H - 0.05, D / 2 + 0.008));
  const led = box(0.018, 0.0022, 0.003, M.led, 'indicator_bar');
  g.add(at(led, sx, H - 0.072, D / 2 + 0.0085));
  const dataPlate = box(0.03, 0.05, 0.0015, M.deep, 'data_plate');
  g.add(at(dataPlate, sx, 0.058, D / 2 + 0.0092));
  for (const dy of [0.006, -0.006]) {
    const io = box(0.014, 0.007, 0.003, M.steel, 'front_usb');
    g.add(at(io, sx, H * 0.52 + dy, D / 2 + 0.0075));
  }

  // Rear: I/O plate, exhaust, PSU inlet, card bracket
  // Rear: exhaust grille, PSU inlet, I/O shield, card bracket
  const rear = plate(W - 0.022, H - 0.022, 0.007, M.deep, 'rear_plate', 0.005, 0.002);
  g.add(at(rear, 0, H / 2, -D / 2 + 0.001));
  const zb = -D / 2 - 0.0055;
  const fanX = -W * 0.25, fanY = H - 0.078, fanR = Math.min(0.045, W * 0.16);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(fanR, 0.0035, 12, 48), M.shell);
  ring.name = 'exhaust_ring';
  g.add(at(ring, fanX, fanY, zb - 0.001));
  for (let i = 0; i < 9; i++) {
    const t = (i - 4) / 4.5;
    const bar = box(2 * fanR * Math.sqrt(Math.max(0.04, 1 - t * t)), 0.0035, 0.004, M.shell, 'exhaust_bar');
    g.add(at(bar, fanX, fanY + t * fanR * 0.92, zb - 0.002));
  }
  const inletPocket = box(0.038, 0.032, 0.004, M.deep, 'psu_inlet_pocket');
  g.add(at(inletPocket, W * 0.33, H - 0.05, zb + 0.001));
  const inlet = box(0.03, 0.024, 0.006, M.steel, 'psu_inlet');
  g.add(at(inlet, W * 0.33, H - 0.05, zb));

  const shX = W * 0.14, shY = H * 0.46;
  g.add(at(box(W * 0.52, 0.044, 0.004, M.steel, 'io_shield'), shX, shY, zb));
  for (let i = 0; i < 4; i++) {
    const usb = box(0.014, 0.0065, 0.003, M.deep, 'usb_port');
    g.add(at(usb, shX - W * 0.19 + i * 0.019, shY + 0.011, zb - 0.002));
  }
  const rj45 = box(0.016, 0.014, 0.003, M.deep, 'ethernet_port');
  g.add(at(rj45, shX + W * 0.17, shY + 0.008, zb - 0.002));
  for (let i = 0; i < 2; i++) {
    const jack = cyl(0.0045, 0.003, M.deep, 'audio_jack', 20);
    jack.rotation.x = Math.PI / 2;
    g.add(at(jack, shX - W * 0.17 + i * 0.014, shY - 0.011, zb - 0.002));
  }

  g.add(at(box(W * 0.72, 0.02, 0.004, M.steel, 'card_bracket'), W * 0.02, H * 0.24, zb));
  for (let i = 0; i < 3; i++) {
    const dp = box(0.02, 0.009, 0.003, M.deep, 'display_port');
    g.add(at(dp, -W * 0.19 + i * 0.028, H * 0.24, zb - 0.002));
  }
  for (let i = 0; i < 6; i++) {
    const v = box(0.006, 0.012, 0.003, M.deep, 'bracket_vent');
    g.add(at(v, W * 0.14 + i * 0.011, H * 0.24, zb - 0.002));
  }
  for (let i = 0; i < 7; i++) {
    const v = box(W * 0.34, 0.0045, 0.003, M.shell, 'rear_vent');
    g.add(at(v, -W * 0.24, H * 0.13 + i * 0.0085 - 0.026, zb - 0.001));
  }
  for (const [x, y] of [[-(W / 2) + 0.014, 0.014], [(W / 2) - 0.014, 0.014], [-(W / 2) + 0.014, H - 0.014], [(W / 2) - 0.014, H - 0.014]]) {
    const s = cyl(0.0045, 0.004, M.steel, 'fastener', 24);
    s.rotation.x = Math.PI / 2;
    g.add(at(s, x, y, zb - 0.001));
  }
  for (const [x, y] of [[-(W / 2) + 0.014, 0.014], [(W / 2) - 0.014, 0.014], [-(W / 2) + 0.014, H - 0.014], [(W / 2) - 0.014, H - 0.014]]) {
    const s = cyl(0.0045, 0.004, M.steel, 'fastener', 24);
    s.rotation.x = Math.PI / 2;
    g.add(at(s, x, y, -D / 2 - 0.003));
  }

  // Feet
  const feet = new THREE.Group();
  feet.name = 'feet';
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const foot = cyl(0.016, 0.01, M.shell, 'foot');
    const pad = cyl(0.014, 0.003, M.deep, 'foot_pad');
    feet.add(at(foot, sx * (W / 2 - 0.03), 0.005, sz * (D / 2 - 0.03)));
    feet.add(at(pad, sx * (W / 2 - 0.03), 0.0015, sz * (D / 2 - 0.03)));
  }
  g.add(feet);
  g.position.y = 0.01;
  const wrap = new THREE.Group();
  wrap.name = 'chassis_assembly';
  wrap.add(g);
  return wrap;
}

/** The five service layers, for the exploded view. */
export function buildLayers(W = 0.30, H = 0.216, D = 0.30) {
  const g = new THREE.Group();
  g.name = 'exploded_assembly';

  const top = new THREE.Group(); top.name = 'layer_top_panel';
  top.add(plate(W, D, 0.012, M.shell, 'top_panel', 0.007).rotateX(-Math.PI / 2));
  const topPocket = box(W - 0.09, 0.004, D - 0.09, M.deep, 'top_pocket');
  top.add(at(topPocket, 0, 0.005, 0));
  g.add(top);

  const gpu = new THREE.Group(); gpu.name = 'layer_accelerator';
  gpu.add(at(box(W - 0.05, 0.0025, D - 0.12, M.board, 'card_pcb'), 0, 0, 0));
  gpu.add(at(box(W - 0.05, 0.04, D - 0.12, M.shell, 'card_shroud'), 0, 0.022, 0));
  for (const sz of [-1, 1]) {
    const fan = cyl(0.038, 0.012, M.deep, 'card_fan');
    gpu.add(at(fan, sz * 0.062, 0.043, 0));
    const hub = cyl(0.012, 0.014, M.steel, 'fan_hub');
    gpu.add(at(hub, sz * 0.062, 0.044, 0));
  }
  gpu.add(at(box(0.03, 0.02, 0.03, M.copper, 'vapour_chamber'), 0, 0.01, -(D - 0.12) / 2 + 0.02));
  g.add(gpu);

  const stack = fins(20, W - 0.06, 0.055, 0.0055, 0.0125, M.shell, 'layer_fin_stack');
  stack.rotation.y = Math.PI / 2;
  g.add(stack);

  const board = new THREE.Group(); board.name = 'layer_board';
  board.add(box(W - 0.04, 0.0025, D - 0.06, M.board, 'mainboard'));
  board.add(at(box(0.07, 0.008, 0.07, M.steel, 'socket'), -0.02, 0.005, 0.02));
  for (let i = 0; i < 4; i++) {
    board.add(at(box(0.006, 0.03, 0.115, M.board, 'dimm'), 0.05 + i * 0.012, 0.016, -0.01));
  }
  board.add(at(box(0.024, 0.004, 0.08, M.deep, 'nvme'), -0.06, 0.004, -0.06));
  g.add(board);

  const base = new THREE.Group(); base.name = 'layer_base';
  base.add(plate(W, D, 0.012, M.shell, 'base_plate', 0.007).rotateX(-Math.PI / 2));
  base.add(at(box(0.14, 0.06, 0.13, M.steel, 'psu'), -(W / 2) + 0.085, 0.036, -(D / 2) + 0.08));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const foot = cyl(0.016, 0.01, M.shell, 'foot');
    base.add(at(foot, sx * (W / 2 - 0.03), -0.012, sz * (D / 2 - 0.03)));
  }
  g.add(base);

  g.userData.layers = [top, gpu, stack, board, base];
  return g;
}
