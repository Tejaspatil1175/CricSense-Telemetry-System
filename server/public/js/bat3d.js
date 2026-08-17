let scene, camera, renderer, batGroup, batBlade, trailLine;
let bowlerGroup, batsmanGroup, ballMesh, bowlerStumps, batsmanStumps;
let trailPoints = [];
const MAX_TRAIL_POINTS = 40;
let calibrationQuat = null;
let lastRawMotion = { alpha: 0, beta: 0, gamma: 0 };
let lastRawQuat = { w: 1, x: 0, y: 0, z: 0 };
let lastPhysicsData = null;

// 1-Over Game Physics State
let isBallInFlight = false;
let ballState = 'idle'; // 'idle', 'bowling', 'hit', 'complete'
let ballPos = new THREE.Vector3(0, 1.2, -4.5);
let ballVel = new THREE.Vector3(0, 0, 0);
let bowlerArm = null;
let bailsMesh = [];
let hasHitCurrentBall = false;

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
  camera.position.set(0, 1.8, 4.8);
  camera.lookAt(0, 0.4, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xeab308, 1.5);
  dirLight1.position.set(5, 12, 6);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.9);
  dirLight2.position.set(-6, 4, -5);
  scene.add(dirLight2);

  // 1. 3D Stadium Circular Outfield (Green Grass)
  const outfieldGeo = new THREE.CylinderGeometry(14, 14, 0.1, 32);
  const outfieldMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
  const outfield = new THREE.Mesh(outfieldGeo, outfieldMat);
  outfield.position.y = -0.55;
  scene.add(outfield);

  // Outfield Boundary Ring
  const boundaryGeo = new THREE.TorusGeometry(12, 0.08, 16, 64);
  const boundaryMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const boundaryRing = new THREE.Mesh(boundaryGeo, boundaryMat);
  boundaryRing.rotation.x = Math.PI / 2;
  boundaryRing.position.y = -0.48;
  scene.add(boundaryRing);

  // 2. 22-Yard Clay Pitch
  const pitchGeo = new THREE.BoxGeometry(1.6, 0.06, 9.0);
  const pitchMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 });
  const pitch = new THREE.Mesh(pitchGeo, pitchMat);
  pitch.position.set(0, -0.52, 0);
  scene.add(pitch);

  // White Crease Markings
  const creaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Batsman Crease (z = 2.8)
  const batCrease = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.065, 0.08), creaseMat);
  batCrease.position.set(0, -0.51, 2.8);
  scene.add(batCrease);

  // Bowler Crease (z = -3.2)
  const bowlCrease = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.065, 0.08), creaseMat);
  bowlCrease.position.set(0, -0.51, -3.2);
  scene.add(bowlCrease);

  // 3. Wickets / Stumps at Batsman & Bowler Ends
  batsmanStumps = createStumpsGroup();
  batsmanStumps.position.set(0, -0.49, 3.2);
  scene.add(batsmanStumps);

  bowlerStumps = createStumpsGroup();
  bowlerStumps.position.set(0, -0.49, -3.5);
  scene.add(bowlerStumps);

  // 4. Create 3D Bat Group (Pivot center at hand grip Y = 0)
  batGroup = new THREE.Group();

  // Bat Willow Blade (Extending downwards from grip origin y = 0)
  const bladeGeo = new THREE.BoxGeometry(0.22, 0.9, 0.07);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xddb885, roughness: 0.3, metalness: 0.1 });
  batBlade = new THREE.Mesh(bladeGeo, bladeMat);
  batBlade.position.y = -0.45;
  batGroup.add(batBlade);

  // Bat Front Face Yellow Sticker (Extending downwards from grip origin y = 0)
  const faceGeo = new THREE.BoxGeometry(0.20, 0.8, 0.072);
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2 });
  const batFace = new THREE.Mesh(faceGeo, faceMat);
  batFace.position.y = -0.45;
  batGroup.add(batFace);

  // Bat Rubber Handle (Extending upwards from grip origin y = 0)
  const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.42, 16);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const batHandle = new THREE.Mesh(handleGeo, handleMat);
  batHandle.position.y = 0.21;
  batGroup.add(batHandle);

  // Handle Ring Accent
  const ringGeo = new THREE.TorusGeometry(0.036, 0.007, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
  const handleRing = new THREE.Mesh(ringGeo, ringMat);
  handleRing.rotation.x = Math.PI / 2;
  handleRing.position.y = 0.05;
  batGroup.add(handleRing);

  // Position 3D Bat at Right-Handed Batsman Stance Crease
  batGroup.position.set(0.3, 0.4, 2.7);
  scene.add(batGroup);

  // 5. 3D Red Cricket Ball Mesh
  const ballGeo = new THREE.SphereGeometry(0.09, 24, 24);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
  ballMesh = new THREE.Mesh(ballGeo, ballMat);

  // White seam torus
  const seamGeo = new THREE.TorusGeometry(0.091, 0.006, 8, 24);
  const seamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const seam = new THREE.Mesh(seamGeo, seamMat);
  ballMesh.add(seam);

  ballMesh.position.copy(ballPos);
  scene.add(ballMesh);

  // 6. Swing Trajectory Line
  const trailPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeo.setDrawRange(0, 0);
  const trailMat = new THREE.LineBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.85 });
  trailLine = new THREE.Line(trailGeo, trailMat);
  scene.add(trailLine);

  // Animation & Physics Loop
  function animate() {
    requestAnimationFrame(animate);

    // If no telemetry packet received yet, do a gentle subtle idle stance sway
    if (batGroup && !window.hasReceivedTelemetry) {
      const t = Date.now() * 0.001;
      batGroup.rotation.y = Math.sin(t * 0.8) * 0.15;
      batGroup.rotation.z = Math.cos(t * 0.5) * 0.05;
    }

    updateMatchPhysicsLoop();
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

// Helper: Create 3D Stumps Group
function createStumpsGroup() {
  const group = new THREE.Group();
  const stumpMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });

  for (let i = -1; i <= 1; i++) {
    const stumpGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.65, 12);
    const stump = new THREE.Mesh(stumpGeo, stumpMat);
    stump.position.set(i * 0.12, 0.325, 0);
    group.add(stump);
  }

  // Bails
  const bailGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.14, 8);
  const bailMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });
  const bail1 = new THREE.Mesh(bailGeo, bailMat);
  bail1.rotation.z = Math.PI / 2;
  bail1.position.set(-0.06, 0.66, 0);
  group.add(bail1);

  const bail2 = new THREE.Mesh(bailGeo, bailMat);
  bail2.rotation.z = Math.PI / 2;
  bail2.position.set(0.06, 0.66, 0);
  group.add(bail2);

  bailsMesh.push(bail1, bail2);
  return group;
}

// Helper: Create Stylized 3D Bowler Figure
function createBowlerModel() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 });
  const jerseyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 }); // Blue jersey
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });

  // Body Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.25), jerseyMat);
  torso.position.y = 0.8;
  group.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
  head.position.y = 1.22;
  group.add(head);

  // Bowling Arm
  const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 12);
  bowlerArm = new THREE.Mesh(armGeo, skinMat);
  bowlerArm.position.set(0.25, 0.9, 0);
  group.add(bowlerArm);

  // Legs
  const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.6, 12), pantsMat);
  leg1.position.set(-0.1, 0.3, 0);
  group.add(leg1);

  const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.6, 12), pantsMat);
  leg2.position.set(0.1, 0.3, 0);
  group.add(leg2);

  return group;
}

// Helper: Create Stylized 3D Batsman Figure
function createBatsmanModel() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 });
  const jerseyMat = new THREE.MeshStandardMaterial({ color: 0x16a34a }); // Green jersey
  const padsMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White cricket pads
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.25), jerseyMat);
  torso.position.y = 0.8;
  group.add(torso);

  // Head & Helmet
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
  head.position.y = 1.22;
  group.add(head);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), helmetMat);
  helmet.position.y = 1.24;
  group.add(helmet);

  // White Pads
  const pad1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.16), padsMat);
  pad1.position.set(-0.12, 0.3, 0);
  group.add(pad1);

  const pad2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.16), padsMat);
  pad2.position.set(0.12, 0.3, 0);
  group.add(pad2);

  return group;
}

/* ========================================================================== */
/* 1-OVER MATCH PHYSICS & BALL BOWLING LOGIC                                 */
/* ========================================================================== */

function bowl3DBall(speedType = 'medium') {
  if (ballState === 'bowling' || ballState === 'hit') return;

  hasHitCurrentBall = false;
  ballState = 'bowling';
  isBallInFlight = true;

  // Initial Ball position at bowler hand
  ballPos.set(0, 1.2, -3.8);
  ballVel.set((Math.random() - 0.5) * 0.03, -0.05, 0.18); // Moving forward towards pitch
  ballMesh.position.copy(ballPos);

  // Animate Bowler Wind-up Arm
  if (bowlerArm) {
    bowlerArm.rotation.x = -Math.PI / 2;
    setTimeout(() => { bowlerArm.rotation.x = 0; }, 400);
  }
}

function updateMatchPhysicsLoop() {
  if (!isBallInFlight || !ballMesh) return;

  if (ballState === 'bowling') {
    // Move ball forward
    ballPos.add(ballVel);

    // Gravity & pitch bounce check
    ballPos.y += ballVel.y;
    ballVel.y -= 0.0015; // Gravity drop

    // Pitch Bounce around z = 0.2
    if (ballPos.y <= -0.42 && ballPos.z < 1.5) {
      ballPos.y = -0.42;
      ballVel.y = 0.045; // Bounce up towards batsman
    }

    ballMesh.position.copy(ballPos);

    // Check 3D Bat Collision with Ball
    checkBatBallCollision();

    // Check if ball passed batsman without hit
    if (ballPos.z > 3.4) {
      isBallInFlight = false;
      ballState = 'complete';

      // Check if ball hit the stumps!
      if (Math.abs(ballPos.x) < 0.22 && ballPos.y < 0.65) {
        // WICKET / BOWLED! 🎯
        bailsMesh.forEach(b => { b.position.y += 0.3; b.rotation.z += 1.0; });
        if (typeof onMatchBallResult === 'function') {
          onMatchBallResult({ outcome: 'W', label: 'BOWLED! 🎯 (Wicket)', runs: 0, isWicket: true });
        }
      } else {
        // DOT BALL (0 Runs)
        if (typeof onMatchBallResult === 'function') {
          onMatchBallResult({ outcome: '•', label: 'Dot Ball (0 Runs)', runs: 0, isWicket: false });
        }
      }
    }
  } else if (ballState === 'hit') {
    // Ball launched into stadium
    ballPos.add(ballVel);
    ballVel.y -= 0.0012; // Gravity
    ballMesh.position.copy(ballPos);

    if (ballPos.y < -0.5 || ballPos.z > 14 || Math.abs(ballPos.x) > 14) {
      isBallInFlight = false;
      ballState = 'complete';
    }
  }
}

function checkBatBallCollision() {
  if (!batBlade || hasHitCurrentBall) return;

  // Get 3D Bat World Position
  batBlade.updateMatrixWorld(true);
  const batWorldPos = new THREE.Vector3();
  batBlade.getWorldPosition(batWorldPos);

  const dist = batWorldPos.distanceTo(ballPos);
  const swingSpeed = (lastPhysicsData && lastPhysicsData.speedKmh) ? lastPhysicsData.speedKmh : 0;
  const totalG = (lastPhysicsData && lastPhysicsData.totalG) ? lastPhysicsData.totalG : 1.0;

  // Hit Trigger: Ball in hitting zone (z > 2.0 and z < 3.2) AND distance < 0.55m AND swing active
  if (dist < 0.55 && (swingSpeed > 8.0 || totalG > 1.8 || window.hasReceivedTelemetry)) {
    hasHitCurrentBall = true;
    ballState = 'hit';

    // Calculate Hit Trajectory Vector based on Swing Dynamics
    const relHeading = lastPhysicsData ? (lastPhysicsData.relHeadingDeg || 0) : 0;
    const faceAngle = lastPhysicsData ? (lastPhysicsData.faceAngleDeg || 0) : 0;

    // Direction angle
    const hitRad = (relHeading + faceAngle) * (Math.PI / 180);
    const speedFactor = Math.min(Math.max(swingSpeed / 20.0, 0.8), 2.2);

    ballVel.x = -Math.sin(hitRad) * 0.22 * speedFactor;
    ballVel.z = -Math.cos(hitRad) * 0.28 * speedFactor;
    ballVel.y = 0.12 * speedFactor; // Loft upward

    // Trigger visual hit glow
    const glowEl = document.getElementById('impactGlow');
    if (glowEl) {
      glowEl.style.opacity = '1';
      setTimeout(() => { glowEl.style.opacity = '0'; }, 300);
    }

    // Determine Runs Outcome
    let outcome = '1';
    let label = '1 Run';
    let runs = 1;

    if (swingSpeed > 22 || speedFactor > 1.4) {
      outcome = '6';
      label = 'SIX! 💥 (High Stadium Loft)';
      runs = 6;
    } else if (swingSpeed > 14 || speedFactor > 1.1) {
      outcome = '4';
      label = 'FOUR! 🚀 (Driven to Boundary)';
      runs = 4;
    } else if (swingSpeed > 10) {
      outcome = '2';
      label = '2 Runs (Placement)';
      runs = 2;
    }

    if (typeof onMatchBallResult === 'function') {
      onMatchBallResult({ outcome, label, runs, speedKmh: swingSpeed.toFixed(1), isWicket: false });
    }
  }
}

function update3DBatOrientation(alpha, beta, gamma, quat) {
  if (!batGroup || !window.THREE) return;
  window.hasReceivedTelemetry = true;

  let rawQuat;
  if (quat && quat.w !== undefined) {
    rawQuat = new THREE.Quaternion(quat.x || 0, quat.y || 0, quat.z || 0, quat.w || 1);
  } else {
    const rawEuler = new THREE.Euler(beta || 0, gamma || 0, -(alpha || 0), 'XYZ');
    rawQuat = new THREE.Quaternion().setFromEuler(rawEuler);
  }

  if (!calibrationQuat) {
    if (window.stadiumDataset && window.stadiumDataset.bowlerDir && window.stadiumDataset.bowlerDir.quaternion) {
      const q = window.stadiumDataset.bowlerDir.quaternion;
      calibrationQuat = new THREE.Quaternion(q.x || 0, q.y || 0, q.z || 0, q.w || 1);
    } else {
      calibrationQuat = new THREE.Quaternion(-0.5025145861231434, 0.8636807677552061, 0.021787390476834916, 0.032556593179782094);
    }
  }

  // Apply relative orientation to 3D Bat Group
  const relativeQuat = calibrationQuat.clone().invert().multiply(rawQuat);
  batGroup.quaternion.copy(relativeQuat);

  // Update Bat Trajectory Trail
  if (trailLine && trailLine.geometry) {
    batGroup.updateMatrixWorld(true);
    const tipPos = new THREE.Vector3(0, -0.5, 0);
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
      beta || 0,
      gamma || 0,
      -(alpha || 0),
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

function toggle3DFullscreen() {
  const container = document.getElementById('bat3dContainer');
  if (!container) return;

  const isFull = container.classList.toggle('fullscreen-3d-active');
  const btn = document.getElementById('fullscreen3dBtn');
  if (btn) {
    btn.innerText = isFull ? '✕ Exit Fullscreen' : '⛶ Fullscreen View';
  }

  setTimeout(() => {
    if (!renderer || !camera || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }, 100);
}

// Auto-initialize when DOM ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(init3DBat, 100);
} else {
  document.addEventListener('DOMContentLoaded', init3DBat);
}

