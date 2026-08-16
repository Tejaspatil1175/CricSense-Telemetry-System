let scene, camera, renderer, batGroup, batBlade, trailLine;
let trailPoints = [];
let calibrationQuat = new THREE.Quaternion();
let lastRawMotion = { alpha: 0, beta: 0, gamma: 0 };
let lastRawQuat = { w: 1, x: 0, y: 0, z: 0 };

function init3DBat() {
  const container = document.getElementById('bat3dContainer');
  if (!container || !window.THREE) return;

  const width = container.clientWidth || 340;
  const height = container.clientHeight || 320;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090d16);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 0, 3.2);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xeab308, 1.2);
  dirLight1.position.set(5, 8, 5);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.7);
  dirLight2.position.set(-5, -5, -3);
  scene.add(dirLight2);

  const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b);
  grid.position.y = -1.2;
  scene.add(grid);

  // Create 3D Bat Mesh Group
  batGroup = new THREE.Group();

  // Bat Willow Blade
  const bladeGeo = new THREE.BoxGeometry(0.24, 0.95, 0.08);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xddb885,
    roughness: 0.3,
    metalness: 0.1,
  });
  batBlade = new THREE.Mesh(bladeGeo, bladeMat);
  batBlade.position.y = -0.1;
  batGroup.add(batBlade);

  // Bat Front Face Yellow Overlay
  const faceGeo = new THREE.BoxGeometry(0.22, 0.85, 0.082);
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.2,
  });
  const batFace = new THREE.Mesh(faceGeo, faceMat);
  batFace.position.y = -0.15;
  batGroup.add(batFace);

  // Bat Rubber Handle
  const handleGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.45, 16);
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
  });
  const batHandle = new THREE.Mesh(handleGeo, handleMat);
  batHandle.position.y = 0.55;
  batGroup.add(batHandle);

  // Handle Ring
  const ringGeo = new THREE.TorusGeometry(0.038, 0.008, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
  const handleRing = new THREE.Mesh(ringGeo, ringMat);
  handleRing.rotation.x = Math.PI / 2;
  handleRing.position.y = 0.35;
  batGroup.add(handleRing);

  scene.add(batGroup);

  // Swing Trajectory Line
  const trailGeo = new THREE.BufferGeometry();
  const trailMat = new THREE.LineBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.7 });
  trailLine = new THREE.Line(trailGeo, trailMat);
  scene.add(trailLine);

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    if (!container || !renderer || !camera) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

function update3DBatOrientation(alpha, beta, gamma, quat) {
  if (!batGroup) return;

  let rawQuat;
  if (quat && quat.w !== undefined) {
    // Madgwick 6-DOF Quaternion streamed from phone (Gimbal-Lock Free!)
    rawQuat = new THREE.Quaternion(quat.x || 0, quat.y || 0, quat.z || 0, quat.w || 1);
  } else {
    // Fallback Euler rotation
    const rawEuler = new THREE.Euler(beta || 0, gamma || 0, -(alpha || 0), 'XYZ');
    rawQuat = new THREE.Quaternion().setFromEuler(rawEuler);
  }

  // Apply relative to the calibration baseline
  const relativeQuat = calibrationQuat.clone().invert().multiply(rawQuat);
  batGroup.quaternion.copy(relativeQuat);

  // Add bat tip point to trajectory trail
  if (trailLine) {
    const tipPos = new THREE.Vector3(0, -0.6, 0);
    tipPos.applyMatrix4(batGroup.matrixWorld);
    trailPoints.push(tipPos);
    if (trailPoints.length > 25) trailPoints.shift();
    
    const positions = new Float32Array(trailPoints.length * 3);
    trailPoints.forEach((p, idx) => {
      positions[idx * 3] = p.x;
      positions[idx * 3 + 1] = p.y;
      positions[idx * 3 + 2] = p.z;
    });
    trailLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trailLine.geometry.needsUpdate = true;
  }
}

function calibrateBatOrientation() {
  if (lastRawQuat && lastRawQuat.w !== undefined) {
    calibrationQuat = new THREE.Quaternion(lastRawQuat.x || 0, lastRawQuat.y || 0, lastRawQuat.z || 0, lastRawQuat.w || 1);
  } else {
    const rawEuler = new THREE.Euler(
      lastRawMotion.beta || 0,
      lastRawMotion.gamma || 0,
      -(lastRawMotion.alpha || 0),
      'XYZ'
    );
    calibrationQuat = new THREE.Quaternion().setFromEuler(rawEuler);
  }
  trailPoints = [];
  const btn = document.getElementById('calibrateBtn');
  if (btn) {
    const original = btn.innerText;
    btn.innerText = '✅ Neutral Set!';
    setTimeout(() => { btn.innerText = original; }, 900);
  }
}
