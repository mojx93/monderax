import * as THREE from 'three';

const M = {
  frame: new THREE.MeshStandardMaterial({ color: 0x4b4f55, roughness: 0.4, metalness: 0.5 }),
  mesh: new THREE.MeshStandardMaterial({ color: 0x222528, roughness: 0.6, metalness: 0.4 }),
  part: new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.5, metalness: 0.45 }),
  bright: new THREE.MeshStandardMaterial({ color: 0x585d63, roughness: 0.35, metalness: 0.55 }),
  led: new THREE.MeshStandardMaterial({ color: 0x5980a6, emissive: 0x5980a6, emissiveIntensity: 1.2, roughness: 0.4 })
};
M.frame.name = 'frame_alu';
M.mesh.name = 'mesh_panel';
M.part.name = 'component';
M.bright.name = 'machined_face';
M.led.name = 'indicator';

const bar = (w, h, d, x, y, z, mat, name) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || M.frame);
  m.name = name || 'rail';
  m.position.set(x, y, z);
  return m;
};

/** Open lattice standing in for a perforated panel. */
function lattice(w, d, y, mat, name, nx = 9, nz = 7, t = 0.0022) {
  const g = new THREE.Group();
  g.name = name;
  for (let i = 0; i < nx; i++) g.add(bar(t, 0.0022, d, -w / 2 + (i * w) / (nx - 1), y, 0, mat, 'perf_rib'));
  for (let i = 0; i < nz; i++) g.add(bar(w, 0.0022, t, 0, y - 0.0005, -d / 2 + (i * d) / (nz - 1), mat, 'perf_rib'));
  return g;
}

/** A skeletal chassis frame: posts, rails, perforated tray, panel rings. */
export function buildFrame(opts = {}) {
  const W = 0.34, H = 0.24, D = 0.22, t = 0.009;
  const g = new THREE.Group();
  g.name = opts.name || 'open_frame';

  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(bar(t, H, t, sx * (W / 2 - t / 2), H / 2, sz * (D / 2 - t / 2), M.frame, 'corner_post'));
  }
  for (const sy of [t / 2, H - t / 2]) {
    for (const sz of [-1, 1]) g.add(bar(W - 2 * t, t, t, 0, sy, sz * (D / 2 - t / 2), M.frame, 'rail_x'));
    for (const sx of [-1, 1]) g.add(bar(t, t, D - 2 * t, sx * (W / 2 - t / 2), sy, 0, M.frame, 'rail_z'));
  }
  // Mid bulkhead: two posts and a cross rail
  g.add(bar(t * 0.8, H - 2 * t, t * 0.8, W * 0.12, H / 2, D / 2 - t / 2, M.frame, 'bulkhead_post'));
  g.add(bar(t * 0.8, H - 2 * t, t * 0.8, W * 0.12, H / 2, -(D / 2 - t / 2), M.frame, 'bulkhead_post'));
  g.add(bar(t * 0.8, t * 0.8, D - 2 * t, W * 0.12, H * 0.46, 0, M.frame, 'bulkhead_rail'));

  // Perforated floor tray, in two bays
  g.add(lattice(W * 0.52, D - 0.02, 0.012, M.mesh, 'tray_front', 11, 7));
  g.children[g.children.length - 1].position.x = -W * 0.21;
  g.add(lattice(W * 0.3, D - 0.02, 0.012, M.mesh, 'tray_rear', 7, 7));
  g.children[g.children.length - 1].position.x = W * 0.3;
  g.add(bar(W - 2 * t, 0.003, D - 2 * t, 0, 0.0085, 0, M.mesh, 'tray_frame'));

  // End panel rings (side walls, opened out)
  for (const sx of [-1, 1]) {
    const ring = new THREE.Group();
    ring.name = 'end_ring';
    ring.add(bar(0.004, H - 2 * t, t, 0, 0, D / 2 - t / 2, M.frame, 'ring_edge'));
    ring.add(bar(0.004, H - 2 * t, t, 0, 0, -(D / 2 - t / 2), M.frame, 'ring_edge'));
    ring.add(bar(0.004, t, D - 2 * t, 0, (H - 2 * t) / 2, 0, M.frame, 'ring_edge'));
    ring.add(bar(0.004, t, D - 2 * t, 0, -(H - 2 * t) / 2, 0, M.frame, 'ring_edge'));
    ring.position.set(sx * (W / 2 - 0.002), H / 2, 0);
    g.add(ring);
  }

  if (opts.brackets) {
    g.add(bar(W * 0.44, 0.004, D - 0.03, -W * 0.16, H * 0.52, 0, M.mesh, 'board_shelf'));
    g.add(bar(0.006, H * 0.42, D - 0.04, W * 0.12 + 0.02, H * 0.3, 0, M.frame, 'riser_bracket'));
    for (let i = 0; i < 3; i++) g.add(bar(0.05, 0.0035, 0.012, W * 0.24, H * 0.2 + i * 0.02, D * 0.32, M.frame, 'card_slot'));
    g.add(bar(0.09, 0.05, 0.11, W * 0.3, 0.04, 0, M.part, 'psu_cage'));
  }

  if (opts.populated) {
    // Radiator across the top, fins visible through the frame
    const rad = new THREE.Group(); rad.name = 'radiator';
    rad.add(bar(W * 0.62, 0.028, D * 0.62, 0, 0, 0, M.part, 'radiator_body'));
    for (let i = 0; i < 22; i++) {
      rad.add(bar(0.0035, 0.03, D * 0.6, -W * 0.3 + (i * W * 0.6) / 21, 0.001, 0, M.bright, 'radiator_fin'));
    }
    rad.position.set(-W * 0.04, H - 0.028, 0);
    g.add(rad);
    // Accelerator, mounted vertically
    const gpu = new THREE.Group(); gpu.name = 'accelerator';
    gpu.add(bar(W * 0.66, 0.05, D * 0.56, 0, 0, 0, M.part, 'card_shroud'));
    for (const sx of [-1, 1]) {
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 36), M.mesh);
      fan.name = 'card_fan';
      fan.rotation.z = Math.PI / 2;
      fan.position.set(sx * W * 0.2, 0, 0);
      gpu.add(fan);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.034, 20), M.bright);
      hub.name = 'fan_hub';
      hub.rotation.z = Math.PI / 2;
      hub.position.set(sx * W * 0.2, 0, 0);
      gpu.add(hub);
    }
    gpu.rotation.y = Math.PI / 2;
    gpu.position.set(-W * 0.06, H * 0.42, 0);
    g.add(gpu);
    g.add(bar(0.09, 0.05, 0.11, W * 0.3, 0.042, 0, M.part, 'psu'));
    g.add(bar(0.02, 0.0025, 0.003, -W / 2 + 0.03, H * 0.12, D / 2, M.led, 'indicator'));
    g.add(lattice(0.10, D * 0.7, 0.016, M.bright, 'intake_mesh', 9, 7));
    g.children[g.children.length - 1].position.set(-W * 0.32, 0, 0);
  }

  return g;
}

/** A side panel, floated off the frame like a service drawing. */
export function buildSidePanel() {
  const H = 0.24, D = 0.22;
  const g = new THREE.Group();
  g.name = 'side_panel';
  g.add(bar(0.004, H, D, 0, H / 2, 0, M.mesh, 'panel_skin'));
  g.add(bar(0.007, H, 0.008, 0.004, H / 2, D / 2 - 0.004, M.frame, 'panel_edge'));
  g.add(bar(0.007, H, 0.008, 0.004, H / 2, -(D / 2 - 0.004), M.frame, 'panel_edge'));
  g.add(bar(0.007, 0.008, D, 0.004, H - 0.004, 0, M.frame, 'panel_edge'));
  g.add(bar(0.007, 0.008, D, 0.004, 0.004, 0, M.frame, 'panel_edge'));
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 18), M.bright);
    s.name = 'panel_stud';
    s.rotation.z = Math.PI / 2;
    s.position.set(0.006, i < 2 ? 0.03 : H - 0.03, (i % 2 ? 1 : -1) * (D / 2 - 0.03));
    g.add(s);
  }
  return g;
}

/** The reference row: panel · frame · populated frame · frame · panel.
 *  Items are offset along the camera's screen-right vector so they read as a
 *  flat row at one isometric angle, like a service illustration. */
export function buildFrameRow(right = [0.85, 0, -0.527]) {
  const row = new THREE.Group();
  row.name = 'frame_row';
  const items = [
    buildSidePanel(),
    buildFrame({ name: 'frame_bare' }),
    buildFrame({ name: 'frame_built', populated: true, brackets: true }),
    buildFrame({ name: 'frame_fitted', brackets: true }),
    buildSidePanel()
  ];
  items[4].rotation.y = Math.PI;
  const xs = [-1.06, -0.53, 0, 0.53, 1.06];
  items.forEach((it, i) => {
    it.position.x += right[0] * xs[i];
    it.position.z += right[2] * xs[i];
    row.add(it);
  });
  return row;
}
