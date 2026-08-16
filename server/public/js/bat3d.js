let scene, camera, renderer, batGroup, batBlade, trailLine;
let trailPoints = [];
const MAX_TRAIL_POINTS = 40;
let calibrationQuat = null;
let lastRawMotion = { alpha: 0, beta: 0, gamma: 0 };
let lastRawQuat = { w: 1, x: 0, y: 0, z: 0 };

function init3DBat() {
  const container = document.getElementById('bat3dContainer');
  if (!container) return;
  if (!window.THREE) {
    setTimeout(init3DBat, 200);
    return;
  }
  if (renderer) return; // Already initialized

  if (!calibrationQuat) calibrationQuat = new THREE.Quaternion();

  const width = container.clientWidth || 340;
  const height = container.clientHeight || 320;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090d16);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 0, 3.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xeab308, 1.4);
  dirLight1.position.set(5, 8, 5);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8);
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

  // Swing Trajectory Line pre-allocated BufferGeometry
  const trailPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeo.setDrawRange(0, 0);
  const trailMat = new THREE.LineBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.85 });
  trailLine = new THREE.Line(trailGeo, trailMat);
  scene.add(trailLine);

  function animate() {
    requestAnimationFrame(animate);
    // If no telemetry packet received yet, do a gentle subtle idle sway so bat is visually alive
    if (batGroup && !window.hasReceivedTelemetry) {
      const t = Date.now() * 0.001;
      batGroup.rotation.y = Math.sin(t * 0.8) * 0.15;
      batGroup.rotation.z = Math.cos(t * 0.5) * 0.05;
    }
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
  if (!batGroup || !window.THREE) return;
  window.hasReceivedTelemetry = true;

  let rawQuat;
  if (quat && quat.w !== undefined) {
    // Madgwick 6-DOF Quaternion streamed from phone
    rawQuat = new THREE.Quaternion(quat.x || 0, quat.y || 0, quat.z || 0, quat.w || 1);
  } else {
    // Fallback Euler rotation
    const rawEuler = new THREE.Euler(beta || 0, gamma || 0, -(alpha || 0), 'XYZ');
    rawQuat = new THREE.Quaternion().setFromEuler(rawEuler);
  }

  if (!calibrationQuat) {
    if (window.stadiumDataset && window.stadiumDataset.bowlerDir && window.stadiumDataset.bowlerDir.quaternion) {
      const q = window.stadiumDataset.bowlerDir.quaternion;
      calibrationQuat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
    } else {
      // Default baseline from user's recorded dataset: { w: 0.032557, x: -0.502515, y: 0.863681, z: 0.021787 }
      calibrationQuat = new THREE.Quaternion(-0.5025145861231434, 0.8636807677552061, 0.021787390476834916, 0.032556593179782094);
    }
  }

  // Apply relative to the calibration baseline
  const relativeQuat = calibrationQuat.clone().invert().multiply(rawQuat);
  batGroup.quaternion.copy(relativeQuat);

  // Update bat tip trajectory trail
  if (trailLine && trailLine.geometry) {
    batGroup.updateMatrixWorld(true);
    const tipPos = new THREE.Vector3(0, -0.6, 0);
    tipPos.applyMatrix4(batGroup.matrixWorld);
    trailPoints.push(tipPos);
    if (trailPoints.length > MAX_TRAIL_POINTS) trailPoints.shift();

    const positions = trailLine.geometry.attributes.position.array;
    for (let i = 0; i < trailPoints.length; i++) {
      positions[i * 3] = trailPoints[i].x;
      positions[i * 3 + 1] = trailPoints[i].y;
      positions[i * 3 + 2] = trailPoints[i].z;
    }
    trailLine.geometry.attributes.position.needsUpdate = true;
    trailLine.geometry.setDrawRange(0, trailPoints.length);
  }
}

function calibrateBatOrientation() {
  if (!window.THREE) return;
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
  if (trailLine && trailLine.geometry) {
    trailLine.geometry.setDrawRange(0, 0);
  }
  const btn = document.getElementById('calibrateBtn');
  if (btn) {
    const original = btn.innerText;
    btn.innerText = '✅ Neutral Set!';
    setTimeout(() => { btn.innerText = original; }, 900);
  }
}

// Auto-initialize when script loads or DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(init3DBat, 100);
} else {
  document.addEventListener('DOMContentLoaded', init3DBat);
}
