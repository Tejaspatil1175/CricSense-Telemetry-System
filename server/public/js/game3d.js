/* ========================================================================== */
/* CRICSENSE 100% 3D CRICKET MATCH ENGINE & STADIUM ARENA                      */
/* ========================================================================== */

let scene, camera, renderer, batGroup, batBlade, trailLine;
let ballMesh, bowlerStumps, batsmanStumps;
let floodlightTowers = [];
let bailsMesh = [];
let trailPoints = [];
const MAX_TRAIL_POINTS = 50;

let calibrationQuat = null;
let targetBatQuat = null;
let isWebSocketActive = false;
let lastRawMotion = { alpha: 0, beta: 0, gamma: 0 };
let lastRawQuat = { w: 1, x: 0, y: 0, z: 0 };
let lastPhysicsData = null;

// Game State & Bowling Modes
let activeCameraMode = 'broadcast'; // 'broadcast', 'batsmanEye', 'bowlerCam'
let selectedBowlingStyle = 'medium'; // 'fast', 'medium', 'offspin', 'legspin'
let isBallInFlight = false;
let ballState = 'idle'; // 'idle', 'bowling', 'hit', 'complete'
let ballPos = new THREE.Vector3(0, 1.2, -4.2);
let ballVel = new THREE.Vector3(0, 0, 0);
let hasHitCurrentBall = false;

let matchState = {
  currentBall: 0,
  maxBalls: 6,
  totalRuns: 0,
  totalWickets: 0,
  sixesCount: 0,
  foursCount: 0,
  maxSwingSpeed: 0,
  ballResults: [],
};

function initGame3D() {
  const container = document.getElementById('game3dCanvasContainer');
  if (!container) return;
  if (!window.THREE) {
    setTimeout(initGame3D, 200);
    return;
  }
  if (renderer) return;

  if (!calibrationQuat) calibrationQuat = new THREE.Quaternion();

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a14); // Dark stadium night sky

  // Camera Setup
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  setCameraMode('broadcast');

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // 1. Lighting Setup
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xfef08a, 1.6);
  dirLight1.position.set(10, 20, 10);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.0);
  dirLight2.position.set(-10, 10, -10);
  scene.add(dirLight2);

  // 2. Outfield Grass Stadium Field
  const outfieldGeo = new THREE.CylinderGeometry(18, 18, 0.15, 64);
  const outfieldMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
  const outfield = new THREE.Mesh(outfieldGeo, outfieldMat);
  outfield.position.y = -0.58;
  scene.add(outfield);

  // Yellow Boundary Rope Ring
  const boundaryGeo = new THREE.TorusGeometry(15, 0.12, 16, 64);
  const boundaryMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const boundaryRing = new THREE.Mesh(boundaryGeo, boundaryMat);
  boundaryRing.rotation.x = Math.PI / 2;
  boundaryRing.position.y = -0.49;
  scene.add(boundaryRing);

  // 3. 22-Yard Turf Clay Pitch
  const pitchGeo = new THREE.BoxGeometry(1.8, 0.08, 9.6);
  const pitchMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 });
  const pitch = new THREE.Mesh(pitchGeo, pitchMat);
  pitch.position.set(0, -0.52, 0);
  scene.add(pitch);

  // White Crease Markings
  const creaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const batCrease = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.085, 0.08), creaseMat);
  batCrease.position.set(0, -0.51, 2.8);
  scene.add(batCrease);

  const bowlCrease = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.085, 0.08), creaseMat);
  bowlCrease.position.set(0, -0.51, -3.2);
  scene.add(bowlCrease);

  // 4. Stumps & Bails
  batsmanStumps = createStumpsGroup();
  batsmanStumps.position.set(0, -0.49, 3.2);
  scene.add(batsmanStumps);

  bowlerStumps = createStumpsGroup();
  bowlerStumps.position.set(0, -0.49, -3.5);
  scene.add(bowlerStumps);

  // 5. 4 Lit Stadium Floodlight Towers
  const towerPositions = [
    { x: -14, z: -12 },
    { x: 14, z: -12 },
    { x: -14, z: 12 },
    { x: 14, z: 12 },
  ];
  towerPositions.forEach(pos => {
    const tower = createFloodlightTower(pos.x, pos.z);
    scene.add(tower);
  });

  // 6. 3D Bat Mesh Group (Pivot at Hand Grip Y = 0)
  batGroup = new THREE.Group();

  const bladeGeo = new THREE.BoxGeometry(0.22, 0.9, 0.07);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xddb885, roughness: 0.3, metalness: 0.1 });
  batBlade = new THREE.Mesh(bladeGeo, bladeMat);
  batBlade.position.y = -0.45;
  batGroup.add(batBlade);

  const faceGeo = new THREE.BoxGeometry(0.20, 0.8, 0.072);
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2 });
  const batFace = new THREE.Mesh(faceGeo, faceMat);
  batFace.position.set(0, -0.45, -0.002); // Flat face points toward Bowler (-Z)
  batGroup.add(batFace);

  const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.42, 16);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const batHandle = new THREE.Mesh(handleGeo, handleMat);
  batHandle.position.y = 0.21;
  batGroup.add(batHandle);

  const ringGeo = new THREE.TorusGeometry(0.036, 0.007, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
  const handleRing = new THREE.Mesh(ringGeo, ringMat);
  handleRing.rotation.x = Math.PI / 2;
  handleRing.position.y = 0.05;
  batGroup.add(handleRing);

  batGroup.position.set(-0.28, 0.4, 2.7);
  scene.add(batGroup);

  // 7. 3D Red Leather Cricket Ball
  const ballGeo = new THREE.SphereGeometry(0.09, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
  ballMesh = new THREE.Mesh(ballGeo, ballMat);

  const seamGeo = new THREE.TorusGeometry(0.091, 0.006, 8, 32);
  const seamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ballSeam = new THREE.Mesh(seamGeo, seamMat);
  ballSeam.rotation.x = Math.PI / 2;
  ballMesh.add(ballSeam);

  ballMesh.position.copy(ballPos);
  scene.add(ballMesh);

  // 8. Swing Trajectory Trail Line
  const trailPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeo.setDrawRange(0, 0);
  const trailMat = new THREE.LineBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.85 });
  trailLine = new THREE.Line(trailGeo, trailMat);
  scene.add(trailLine);

  // Main Render & Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    if (batGroup && targetBatQuat) {
      batGroup.quaternion.slerp(targetBatQuat, 0.85);
    } else if (batGroup && !window.hasReceivedTelemetry) {
      const t = Date.now() * 0.001;
      batGroup.rotation.y = Math.sin(t * 0.8) * 0.15;
      batGroup.rotation.z = Math.cos(t * 0.5) * 0.05;
    }

    updateGamePhysicsLoop();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    if (!container || !renderer || !camera) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Connect WebSockets
  connectGameWebSocket();
}

function setCameraMode(mode) {
  activeCameraMode = mode;
  if (!camera) return;

  if (mode === 'broadcast') {
    camera.position.set(0, 2.2, 5.5);
    camera.lookAt(0, 0.4, -1.0);
  } else if (mode === 'batsmanEye') {
    camera.position.set(-0.35, 1.25, 2.85);
    camera.lookAt(0.05, 0.55, -4.5);
  } else if (mode === 'bowlerCam') {
    camera.position.set(0, 2.0, -4.5);
    camera.lookAt(0, 0.4, 2.8);
  }
}

function setBowlingStyle(style) {
  selectedBowlingStyle = style;
  const badge = document.getElementById('bowlingStyleBadge');
  if (badge) {
    if (style === 'fast') badge.innerText = '⚡ Fast Pace (1.2s Delivery)';
    else if (style === 'offspin') badge.innerText = '🔄 Off-Spin (1.6s Delivery & Turn)';
    else if (style === 'legspin') badge.innerText = '🌀 Leg-Spin (1.6s Delivery & Turn)';
    else badge.innerText = '🎯 Medium Pace (1.5s Delivery)';
  }
}

function createStumpsGroup() {
  const group = new THREE.Group();
  const stumpMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });

  for (let i = -1; i <= 1; i++) {
    const stumpGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.65, 12);
    const stump = new THREE.Mesh(stumpGeo, stumpMat);
    stump.position.set(i * 0.12, 0.325, 0);
    group.add(stump);
  }

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

function createFloodlightTower(x, z) {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  // Tower Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 10, 16), poleMat);
  pole.position.set(x, 4.5, z);
  group.add(pole);

  // Light Head Box
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.3), lightMat);
  head.position.set(x, 9.2, z);
  head.lookAt(0, 1.0, 0);
  group.add(head);

  return group;
}

/* ========================================================================== */
/* REALISTIC BOWLING PHYSICS & COLLISION TIMING ENGINE                        */
/* ========================================================================== */

function bowlNextBall() {
  if (ballState === 'bowling' || ballState === 'hit') return;
  if (matchState.currentBall >= matchState.maxBalls) {
    showMatchSummaryModal();
    return;
  }

  hasHitCurrentBall = false;
  ballState = 'bowling';
  isBallInFlight = true;

  // Sound cue whistle
  if (typeof playWhistleSound === 'function') playWhistleSound();

  // Reset ball position to bowler crease
  ballPos.set(0, 1.1, -3.8);

  // Delivery Velocity based on selected style (~1.5s flight time!)
  let speedZ = 0.085; // Medium Pace (~1.5 seconds)
  let spinX = 0;

  if (selectedBowlingStyle === 'fast') {
    speedZ = 0.11; // Fast pace (~1.2s)
  } else if (selectedBowlingStyle === 'offspin') {
    speedZ = 0.075; // Off-spin (~1.6s)
    spinX = 0.008; // Spins to right after bounce
  } else if (selectedBowlingStyle === 'legspin') {
    speedZ = 0.075; // Leg-spin (~1.6s)
    spinX = -0.008; // Spins to left after bounce
  }

  ballVel.set((Math.random() - 0.5) * 0.015, -0.03, speedZ);
  ballMesh.position.copy(ballPos);
}

function updateGamePhysicsLoop() {
  if (!isBallInFlight || !ballMesh) return;

  if (ballState === 'bowling') {
    ballPos.add(ballVel);
    ballPos.y += ballVel.y;
    ballVel.y -= 0.0006; // Realistic gravity

    // Pitch Bounce around z = 0.4
    if (ballPos.y <= -0.44 && ballPos.z < 1.6) {
      ballPos.y = -0.44;
      ballVel.y = 0.028; // Rise toward batsman belt line

      // Apply spin drift after bounce
      if (selectedBowlingStyle === 'offspin') ballVel.x = 0.008;
      else if (selectedBowlingStyle === 'legspin') ballVel.x = -0.008;
    }

    ballMesh.position.copy(ballPos);

    // Collision Check
    checkBatBallCollision();

    // Check if ball passed batsman without hit
    if (ballPos.z > 3.4) {
      isBallInFlight = false;
      ballState = 'complete';

      // Check Stumps Hit!
      if (Math.abs(ballPos.x) < 0.22 && ballPos.y < 0.65) {
        bailsMesh.forEach(b => { b.position.y += 0.3; b.rotation.z += 1.0; });
        if (typeof playStumpsHitSound === 'function') playStumpsHitSound();
        handleBallResult({ outcome: 'W', label: 'BOWLED! 🎯 (Wicket)', runs: 0, isWicket: true });
      } else {
        handleBallResult({ outcome: '•', label: 'Dot Ball (0 Runs)', runs: 0, isWicket: false });
      }
    }
  } else if (ballState === 'hit') {
    ballPos.add(ballVel);
    ballVel.y -= 0.0008; // Gravity
    ballMesh.position.copy(ballPos);

    if (ballPos.y < -0.5 || ballPos.z > 16 || Math.abs(ballPos.x) > 16) {
      isBallInFlight = false;
      ballState = 'complete';
    }
  }
}

function checkBatBallCollision() {
  if (!batBlade || hasHitCurrentBall) return;

  batBlade.updateMatrixWorld(true);
  const batWorldPos = new THREE.Vector3();
  batBlade.getWorldPosition(batWorldPos);

  const dist = batWorldPos.distanceTo(ballPos);
  const swingSpeed = (lastPhysicsData && lastPhysicsData.speedKmh) ? lastPhysicsData.speedKmh : 0;
  const totalG = (lastPhysicsData && lastPhysicsData.totalG) ? lastPhysicsData.totalG : 1.0;

  // Collision trigger zone (z between 2.0 and 3.2 meters)
  if (dist < 0.58 && (swingSpeed > 6.0 || totalG > 1.6 || window.hasReceivedTelemetry)) {
    hasHitCurrentBall = true;
    ballState = 'hit';

    // Calculate Swing Timing (PERFECT / EARLY / LATE)
    let timingLabel = 'PERFECT ⚡';
    let timingBadgeClass = 'timing-perfect';
    if (ballPos.z < 2.3) {
      timingLabel = 'EARLY ⏱️';
      timingBadgeClass = 'timing-early';
    } else if (ballPos.z > 3.0) {
      timingLabel = 'LATE ⌛';
      timingBadgeClass = 'timing-late';
    }

    showTimingBadge(timingLabel, timingBadgeClass);

    // Play Sound FX
    if (typeof playBatHitSound === 'function') playBatHitSound(1.0);

    const relHeading = lastPhysicsData ? (lastPhysicsData.relHeadingDeg || 0) : 0;
    const faceAngle = lastPhysicsData ? (lastPhysicsData.faceAngleDeg || 0) : 0;
    const hitRad = (relHeading + faceAngle) * (Math.PI / 180);
    const speedFactor = Math.min(Math.max(swingSpeed / 18.0, 0.9), 2.4);

    ballVel.x = -Math.sin(hitRad) * 0.18 * speedFactor;
    ballVel.z = -Math.cos(hitRad) * 0.22 * speedFactor;
    ballVel.y = 0.09 * speedFactor;

    // Trigger visual hit glow
    const glowEl = document.getElementById('impactGlow');
    if (glowEl) {
      glowEl.style.opacity = '1';
      setTimeout(() => { glowEl.style.opacity = '0'; }, 300);
    }

    let outcome = '1';
    let label = '1 Run (Single)';
    let runs = 1;

    if (swingSpeed > 22 || speedFactor > 1.4) {
      outcome = '6';
      label = 'SIX! 💥 (High Stadium Loft)';
      runs = 6;
      if (typeof playCrowdCheerSound === 'function') playCrowdCheerSound(true);
    } else if (swingSpeed > 13 || speedFactor > 1.1) {
      outcome = '4';
      label = 'FOUR! 🚀 (Boundary Drive)';
      runs = 4;
      if (typeof playCrowdCheerSound === 'function') playCrowdCheerSound(false);
    } else if (swingSpeed > 9) {
      outcome = '2';
      label = '2 Runs (Placement)';
      runs = 2;
    }

    handleBallResult({ outcome, label, runs, speedKmh: swingSpeed.toFixed(1), isWicket: false });
  }
}

/* ========================================================================== */
/* SCORECARD HUD & MATCH STATE MANAGER                                       */
/* ========================================================================== */

function handleBallResult(data) {
  if (matchState.currentBall >= matchState.maxBalls) return;

  matchState.currentBall++;
  matchState.totalRuns += data.runs || 0;
  if (data.isWicket) matchState.totalWickets++;

  if (data.outcome === '6') matchState.sixesCount++;
  if (data.outcome === '4') matchState.foursCount++;

  const speedVal = parseFloat(data.speedKmh || 0);
  if (speedVal > matchState.maxSwingSpeed) matchState.maxSwingSpeed = speedVal;

  matchState.ballResults.push(data.outcome);

  // Update Score HUD
  const hudScore = document.getElementById('hudMatchScore');
  if (hudScore) {
    hudScore.innerHTML = `SCORE: <span style="color: #00e699;">${matchState.totalRuns}/${matchState.totalWickets}</span> <span style="font-size: 12px; color: #94a3b8;">(0.${matchState.currentBall} Overs)</span>`;
  }

  // Update Ball Pills
  const pill = document.getElementById(`bPill${matchState.currentBall}`);
  if (pill) {
    pill.innerText = data.outcome;
    pill.classList.remove('active');
    if (data.outcome === '6') pill.classList.add('six');
    else if (data.outcome === '4') pill.classList.add('four');
    else if (data.isWicket) pill.classList.add('wicket');
    else pill.classList.add('active');
  }

  // Show Announcer Banner
  showMatchAnnouncer(data.label || `${data.runs} Runs!`);

  // Check Over Completion (6 Balls)
  if (matchState.currentBall >= matchState.maxBalls) {
    setTimeout(showMatchSummaryModal, 2200);
  }
}

function showTimingBadge(text, className) {
  const badge = document.getElementById('swingTimingBadge');
  if (badge) {
    badge.innerText = text;
    badge.className = `timing-badge ${className} show`;
    setTimeout(() => { badge.classList.remove('show'); }, 1800);
  }
}

function showMatchAnnouncer(text) {
  const banner = document.getElementById('matchAnnouncerBanner');
  const txtEl = document.getElementById('matchAnnouncerText');
  if (banner && txtEl) {
    txtEl.innerText = text;
    banner.classList.add('show');
    setTimeout(() => { banner.classList.remove('show'); }, 2200);
  }
}

function showMatchSummaryModal() {
  const modal = document.getElementById('matchSummaryModal');
  if (!modal) return;

  document.getElementById('sumTotalScore').innerText = `${matchState.totalRuns} / ${matchState.totalWickets}`;
  document.getElementById('sumOverBreakdown').innerText = `Overs: 1.0 (${matchState.maxBalls} Balls) | Strike Rate: ${((matchState.totalRuns / matchState.maxBalls) * 100).toFixed(1)}`;
  document.getElementById('sumMaxSpeed').innerText = `${matchState.maxSwingSpeed.toFixed(1)} km/h`;
  document.getElementById('sumSixes').innerText = matchState.sixesCount;
  document.getElementById('sumFours').innerText = matchState.foursCount;

  modal.style.display = 'flex';
}

function closeMatchSummaryModal() {
  const modal = document.getElementById('matchSummaryModal');
  if (modal) modal.style.display = 'none';
}

function restartOneOverMatch() {
  matchState = {
    currentBall: 0,
    maxBalls: 6,
    totalRuns: 0,
    totalWickets: 0,
    sixesCount: 0,
    foursCount: 0,
    maxSwingSpeed: 0,
    ballResults: [],
  };

  const hudScore = document.getElementById('hudMatchScore');
  if (hudScore) {
    hudScore.innerHTML = `SCORE: <span style="color: #00e699;">0/0</span> <span style="font-size: 12px; color: #94a3b8;">(0.0 Overs)</span>`;
  }

  for (let i = 1; i <= 6; i++) {
    const pill = document.getElementById(`bPill${i}`);
    if (pill) {
      pill.innerText = i;
      pill.className = 'ball-pill';
    }
  }

  closeMatchSummaryModal();
}

function setMatchFormat(balls, formatLabel) {
  matchState.maxBalls = balls;
  restartOneOverMatch();
  const el = document.getElementById('matchFormatBadge');
  if (el) el.innerText = formatLabel;
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

  const relativeQuat = calibrationQuat.clone().invert().multiply(rawQuat);
  if (!targetBatQuat) targetBatQuat = new THREE.Quaternion();
  targetBatQuat.copy(relativeQuat);
  batGroup.quaternion.copy(relativeQuat);

  // Update Swing Trail
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
  if (typeof showTimingBadge === 'function') {
    showTimingBadge('🎯 Bat Neutral Orientation Calibrated!', 'timing-perfect');
  }
}

function connectGameWebSocket() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = wsProtocol + '//' + window.location.host;

  try {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      isWebSocketActive = true;
      ws.send(JSON.stringify({ type: 'web_dashboard_register' }));
    };
    ws.onmessage = (event) => {
      try {
        isWebSocketActive = true;
        const data = JSON.parse(event.data);
        if (data.type === 'telemetry' || data.accel) {
          if (data.physics) lastPhysicsData = data.physics;
          if (data.motion) {
            lastRawMotion = data.motion;
            update3DBatOrientation(data.motion.alpha, data.motion.beta, data.motion.gamma, data.quat);
          }
          if (data.quat) lastRawQuat = data.quat;
        }
      } catch (e) { }
    };
    ws.onclose = () => { isWebSocketActive = false; };
    ws.onerror = () => { isWebSocketActive = false; };
  } catch (e) { }

  // Fallback Polling (Only runs if WebSockets are inactive)
  setInterval(() => {
    if (isWebSocketActive) return;
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        if (data.latestPayload) {
          const payload = data.latestPayload;
          if (payload.physics) lastPhysicsData = payload.physics;
          if (payload.motion) {
            lastRawMotion = payload.motion;
            update3DBatOrientation(payload.motion.alpha, payload.motion.beta, payload.motion.gamma, payload.quat);
          }
          if (payload.quat) lastRawQuat = payload.quat;
        }
      })
      .catch(() => { });
  }, 300);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initGame3D, 100);
} else {
  document.addEventListener('DOMContentLoaded', initGame3D);
}
