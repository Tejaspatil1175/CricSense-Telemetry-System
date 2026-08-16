let activeMethod = 'wifi';
let webSocketClient = null;
let shotHistory = [];
let lastLogTime = 0;

function selectMethod(method) {
  activeMethod = method;
  const pills = ['Usb', 'Wifi', 'Bt'];
  const cards = ['cardUsb', 'cardWifi', 'cardBt'];
  
  pills.forEach(p => {
    const el = document.getElementById('pill' + p);
    if (el) el.classList.remove('active');
  });

  cards.forEach(c => {
    const el = document.getElementById(c);
    if (el) {
      el.classList.remove('selected');
      const tag = el.querySelector('.active-tag');
      if (tag) tag.remove();
    }
  });

  if (method === 'usb') {
    document.getElementById('pillUsb')?.classList.add('active');
    const card = document.getElementById('cardUsb');
    if (card) {
      card.classList.add('selected');
      card.insertAdjacentHTML('afterbegin', '<div class="active-tag">ACTIVE METHOD</div>');
    }
  } else if (method === 'wifi') {
    document.getElementById('pillWifi')?.classList.add('active');
    const card = document.getElementById('cardWifi');
    if (card) {
      card.classList.add('selected');
      card.insertAdjacentHTML('afterbegin', '<div class="active-tag">ACTIVE METHOD</div>');
    }
  } else if (method === 'bt') {
    document.getElementById('pillBt')?.classList.add('active');
    const card = document.getElementById('cardBt');
    if (card) {
      card.classList.add('selected');
      card.insertAdjacentHTML('afterbegin', '<div class="active-tag">ACTIVE METHOD</div>');
    }
  }
}

function setConnectionUIState(state, method) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const mName = method ? method.toUpperCase() : 'WIFI';

  if (method) {
    selectMethod(method.toLowerCase());
  }

  if (dot) dot.classList.remove('connecting', 'connected');

  if (state === 'pending_approval' || state === 'connecting') {
    if (dot) dot.classList.add('connecting');
    if (text) text.innerText = `Connecting via ${mName}...`;
  } else if (state === 'connected') {
    if (dot) dot.classList.add('connected');
    if (text) text.innerText = `Mobile Connected & Streaming (${mName})`;
  } else if (state === 'denied') {
    if (text) text.innerText = 'Connection Denied by PC User';
  } else {
    if (text) text.innerText = 'Waiting for Mobile Connection...';
  }
}

function showApprovalModal(deviceName, method) {
  const modalDev = document.getElementById('modalDeviceName');
  const modalMeth = document.getElementById('modalMethod');
  const modalBack = document.getElementById('approvalModal');
  if (modalDev) modalDev.innerText = deviceName || 'Mobile Bat Controller';
  if (modalMeth) modalMeth.innerText = (method || 'wifi').toUpperCase();
  if (modalBack) modalBack.style.display = 'flex';
  setConnectionUIState('pending_approval', method);
}

function hideApprovalModal() {
  const modalBack = document.getElementById('approvalModal');
  if (modalBack) modalBack.style.display = 'none';
}

function respondConnection(isAccept) {
  if (webSocketClient && webSocketClient.readyState === WebSocket.OPEN) {
    webSocketClient.send(JSON.stringify({
      type: 'respond_connect',
      action: isAccept ? 'accept' : 'deny'
    }));
  }
  hideApprovalModal();
  if (!isAccept) {
    setConnectionUIState('idle');
  }
}

function connectTelemetryStream() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = wsProtocol + '//' + window.location.host;

  try {
    webSocketClient = new WebSocket(wsUrl);

    webSocketClient.onopen = () => {
      webSocketClient.send(JSON.stringify({ type: 'web_dashboard_register' }));
    };

    webSocketClient.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'incoming_connection_request') {
          showApprovalModal(data.deviceName, data.method);
        } else if (data.type === 'connection_status') {
          if (data.state !== 'pending_approval') {
            hideApprovalModal();
          }
          setConnectionUIState(data.state, data.method);
        } else if (data.type === 'telemetry' || data.accel) {
          hideApprovalModal();
          setConnectionUIState('connected', data.method);
          updateDashboard(data);
        }
      } catch (e) {}
    };

    webSocketClient.onclose = () => {
      setConnectionUIState('idle');
      setTimeout(connectTelemetryStream, 3000);
    };
  } catch (e) {
    setInterval(pollStatus, 1000);
  }
}

let lastQrUrl = '';
function renderQRCode(url) {
  if (url === lastQrUrl) return;
  lastQrUrl = url;
  const container = document.getElementById('qrcodeBox');
  if (!container) return;
  container.innerHTML = '';
  if (window.QRCode) {
    new QRCode(container, {
      text: url,
      width: 120,
      height: 120,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }
}

function pollStatus() {
  fetch('/api/status')
    .then(res => res.json())
    .then(data => {
      const activeUrl = (data.localIps && data.localIps.length > 0 ? `http://${data.localIps[0]}:8080` : data.cloudTunnelUrl || '');
      if (activeUrl) {
        const epVal = document.getElementById('endpointVal');
        if (epVal) epVal.innerText = activeUrl;
        renderQRCode(activeUrl);
      }
      setConnectionUIState(data.mobileState || 'idle', data.selectedMethod);
      if (data.latestPayload && data.mobileState === 'connected') {
        updateDashboard(data.latestPayload);
      }
    })
    .catch(() => {});
}

/* ========================================================================== */
/* FAST PRE-GAME 4-STEP SENSOR CALIBRATION WIZARD                             */
/* ========================================================================== */

let currentQuickStep = 1;
let lastRawAccel = { x: 0, y: 1, z: 0 };
let lastRawGyro = { x: 0, y: 0, z: 0 };

let quickDataset = {
  bowlerDir: null,
  groundTap: null,
  fullUpLeft: null,
  fullUpRight: null,
  metadata: {
    recordedAt: null,
    totalPoses: 4,
    system: "CricSense Fast Pre-Game Calibration Test Suite",
    isApplied: true,
  }
};

function openQuickCalibrationModal() {
  currentQuickStep = 1;
  updateQuickStepUI(1);
  const modal = document.getElementById('quickCalibModal');
  if (modal) modal.style.display = 'flex';
}

function closeQuickCalibrationModal() {
  const modal = document.getElementById('quickCalibModal');
  if (modal) modal.style.display = 'none';
}

function updateQuickStepUI(stepNum) {
  currentQuickStep = stepNum;

  // Update Progress Fill
  const fill = document.getElementById('quickProgressFill');
  if (fill) {
    if (stepNum === 'success') fill.style.width = '100%';
    else fill.style.width = `${(stepNum / 4) * 100}%`;
  }

  // Update Pills
  for (let i = 1; i <= 4; i++) {
    const pill = document.getElementById(`pillStep${i}`);
    const view = document.getElementById(`quickStepView${i}`);
    if (pill) {
      pill.classList.remove('active', 'completed');
      if (i === stepNum) pill.classList.add('active');
      else if (i < stepNum || stepNum === 'success') pill.classList.add('completed');
    }
    if (view) {
      view.style.display = (i === stepNum) ? 'block' : 'none';
    }
  }

  const successView = document.getElementById('quickStepViewSuccess');
  if (successView) {
    successView.style.display = (stepNum === 'success') ? 'block' : 'none';
  }
}

function recordQuickStep(poseKey) {
  const pitchDeg = parseFloat((((lastRawMotion ? lastRawMotion.beta : 0) || 0) * (180 / Math.PI)).toFixed(1));
  const rollDeg = parseFloat((((lastRawMotion ? lastRawMotion.gamma : 0) || 0) * (180 / Math.PI)).toFixed(1));
  const alphaRad = (lastRawMotion ? lastRawMotion.alpha : 0) || 0;
  const alphaDeg = parseFloat((alphaRad * (180 / Math.PI)).toFixed(1));

  const accel = lastRawAccel || { x: 0, y: 1, z: 0 };
  const gyro = lastRawGyro || { x: 0, y: 0, z: 0 };
  const quat = lastRawQuat || { w: 1, x: 0, y: 0, z: 0 };

  quickDataset[poseKey] = {
    poseKey,
    timestamp: Date.now(),
    angles: { pitchDeg, rollDeg, beta: lastRawMotion ? lastRawMotion.beta : 0, gamma: lastRawMotion ? lastRawMotion.gamma : 0, alpha: alphaRad },
    accel: { x: parseFloat((accel.x||0).toFixed(4)), y: parseFloat((accel.y||0).toFixed(4)), z: parseFloat((accel.z||0).toFixed(4)) },
    gyro: { x: parseFloat((gyro.x||0).toFixed(4)), y: parseFloat((gyro.y||0).toFixed(4)), z: parseFloat((gyro.z||0).toFixed(4)) },
    quaternion: quat,
  };
  quickDataset.metadata.recordedAt = new Date().toISOString();

  if (poseKey === 'groundTap') {
    updateQuickStepUI(2);
  } else if (poseKey === 'bowlerDir') {
    updateQuickStepUI(3);
  } else if (poseKey === 'fullUpLeft') {
    updateQuickStepUI(4);
  } else if (poseKey === 'fullUpRight') {
    saveQuickCalibrationProfile();
  }
}

function saveQuickCalibrationProfile() {
  fetch('/api/calibration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quickDataset),
  })
    .then(res => res.json())
    .then(data => {
      // Auto-calibrate 3D bat engine baseline using recorded Bowler Axis
      if (quickDataset.bowlerDir && quickDataset.bowlerDir.quaternion) {
        const q = quickDataset.bowlerDir.quaternion;
        if (window.THREE && typeof calibrateBatOrientation === 'function') {
          calibrationQuat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
        }
      }
      updateQuickStepUI('success');
    })
    .catch(() => {
      updateQuickStepUI('success');
    });
}

/* ========================================================================== */
/* 1-OVER CRICKET MATCH HUD & GAME STATE MANAGER                             */
/* ========================================================================== */

let matchState = {
  currentBall: 0,
  totalRuns: 0,
  totalWickets: 0,
  sixesCount: 0,
  foursCount: 0,
  maxSwingSpeed: 0,
  ballResults: [],
};

function triggerBowlBall() {
  if (matchState.currentBall >= 6) {
    showMatchSummaryReport();
    return;
  }
  if (typeof bowl3DBall === 'function') {
    bowl3DBall('medium');
  }
}

function onMatchBallResult(data) {
  if (matchState.currentBall >= 6) return;

  matchState.currentBall++;
  matchState.totalRuns += data.runs || 0;
  if (data.isWicket) matchState.totalWickets++;

  if (data.outcome === '6') matchState.sixesCount++;
  if (data.outcome === '4') matchState.foursCount++;

  const speedVal = parseFloat(data.speedKmh || 0);
  if (speedVal > matchState.maxSwingSpeed) matchState.maxSwingSpeed = speedVal;

  matchState.ballResults.push(data.outcome);

  // Update HUD Scorecard
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

  // Log shot to table
  addShotToLog(data.label || 'Cricket Delivery', data.speedKmh || '0.0', 'Normal Face', 2.0);

  // Check Over Completion (6 Balls)
  if (matchState.currentBall >= 6) {
    setTimeout(showMatchSummaryReport, 2000);
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

function showMatchSummaryReport() {
  const modal = document.getElementById('matchSummaryModal');
  if (!modal) return;

  document.getElementById('sumTotalScore').innerText = `${matchState.totalRuns} / ${matchState.totalWickets}`;
  document.getElementById('sumOverBreakdown').innerText = `Overs: 1.0 (6 Balls) | Strike Rate: ${((matchState.totalRuns / 6) * 100).toFixed(1)}`;
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

function updateDashboard(data) {
  if (data.physics) {
    lastPhysicsData = data.physics;
  }
  if (data.accel) {
    lastRawAccel = data.accel;
    document.getElementById('accelX').innerText = (data.accel.x || 0).toFixed(4) + ' g';
    document.getElementById('accelY').innerText = (data.accel.y || 0).toFixed(4) + ' g';
    document.getElementById('accelZ').innerText = (data.accel.z || 0).toFixed(4) + ' g';
    const totalG = Math.sqrt((data.accel.x||0)**2 + (data.accel.y||0)**2 + (data.accel.z||0)**2);
    document.getElementById('accelTotal').innerText = totalG.toFixed(2) + ' g';

    // Update Quick Calibration Modal Live Badges
    const badge1 = document.getElementById('quickLiveGroundVal');
    if (badge1) badge1.innerText = `Pitch: ${((data.motion?.beta||0)*(180/Math.PI)).toFixed(1)}° | Accel Y: ${(data.accel.y||0).toFixed(2)} g`;

    const badge3 = document.getElementById('quickLiveLeftVal');
    if (badge3) badge3.innerText = `Accel X: ${(data.accel.x||0).toFixed(2)} g | Accel Y: ${(data.accel.y||0).toFixed(2)} g`;

    const badge4 = document.getElementById('quickLiveRightVal');
    if (badge4) badge4.innerText = `Accel X: ${(data.accel.x||0).toFixed(2)} g | Accel Y: ${(data.accel.y||0).toFixed(2)} g`;
  }
  if (data.gyro) {
    lastRawGyro = data.gyro;
    document.getElementById('gyroX').innerText = (data.gyro.x || 0).toFixed(4);
    document.getElementById('gyroY').innerText = (data.gyro.y || 0).toFixed(4);
    document.getElementById('gyroZ').innerText = (data.gyro.z || 0).toFixed(4);
  }
  if (data.quat) {
    lastRawQuat = data.quat;
  }
  if (data.motion) {
    document.getElementById('motionAlpha').innerText = (data.motion.alpha || 0).toFixed(4) + ' rad';
    document.getElementById('motionBeta').innerText = (data.motion.beta || 0).toFixed(4) + ' rad';
    document.getElementById('motionGamma').innerText = (data.motion.gamma || 0).toFixed(4) + ' rad';

    const alphaDeg = ((data.motion.alpha || 0) * (180 / Math.PI)).toFixed(1);
    const badge2 = document.getElementById('quickLiveBowlerVal');
    if (badge2) badge2.innerText = `Heading (Alpha): ${alphaDeg}° | Pitch: ${((data.motion.beta||0)*(180/Math.PI)).toFixed(1)}°`;

    lastRawMotion = data.motion;
    if (typeof update3DBatOrientation === 'function') {
      update3DBatOrientation(data.motion.alpha, data.motion.beta, data.motion.gamma, data.quat);
    }
  }
  if (data.mag) {
    document.getElementById('magHeading').innerText = (data.mag.heading || 0).toFixed(1) + '°';
  }

  // Physics Motion Engine Updates
  if (data.physics) {
    const p = data.physics;
    document.getElementById('batSpeedVal').innerText = p.speedKmh || '0.0';
    document.getElementById('peakSpeedVal').innerText = (p.maxSpeedKmh || '0.0') + ' km/h';
    document.getElementById('speedMphVal').innerText = (p.speedMph || '0.0') + ' mph';
    document.getElementById('batFaceVal').innerText = p.faceAlignment || 'Square Face (0.0°)';
    document.getElementById('batPlaneVal').innerText = `${p.batPlane} (${p.pitchAngleDeg}°)`;
    document.getElementById('detectedShotVal').innerText = p.detectedShot || 'Stance / Ready';
    document.getElementById('impactVal').innerText = p.isImpact ? `💥 IMPACT DETECTED! (${p.totalG} g)` : `Normal Motion (${p.totalG} g)`;

    const glowEl = document.getElementById('impactGlow');
    if (p.isImpact && glowEl) {
      glowEl.style.opacity = '1';
      setTimeout(() => { glowEl.style.opacity = '0'; }, 300);
    }

    const now = Date.now();
    if (p.speedKmh > 12 && (now - lastLogTime > 1500) && p.detectedShot !== 'Stance / Ready') {
      lastLogTime = now;
      addShotToLog(p.detectedShot, p.speedKmh, p.faceAlignment, p.totalG);
    }
  }
}

function addShotToLog(shotName, speedKmh, faceAlign, impactG) {
  const tbody = document.getElementById('shotLogBody');
  if (!tbody) return;

  const timeStr = new Date().toLocaleTimeString();
  const rowHtml = `
    <tr style="border-bottom: 1px solid var(--border-color);">
      <td style="padding: 10px; font-family: monospace; color: var(--text-muted);">${timeStr}</td>
      <td style="padding: 10px; font-weight: 800; color: #16a34a;">${shotName}</td>
      <td style="padding: 10px; font-weight: 700; color: var(--yellow-primary);">${speedKmh} km/h</td>
      <td style="padding: 10px; color: var(--text-main);">${faceAlign}</td>
      <td style="padding: 10px; font-weight: 700; color: ${impactG > 2.5 ? '#ef4444' : '#38bdf8'};">${impactG} g</td>
    </tr>
  `;

  if (shotHistory.length === 0) {
    tbody.innerHTML = '';
  }
  shotHistory.unshift(rowHtml);
  if (shotHistory.length > 10) shotHistory.pop();
  tbody.innerHTML = shotHistory.join('');
}

window.addEventListener('DOMContentLoaded', () => {
  pollStatus();
  connectTelemetryStream();
  if (typeof init3DBat === 'function') {
    init3DBat();
  }

  // Auto-open Quick Calibration Modal if requested via URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('openQuickCalib') === '1') {
    setTimeout(openQuickCalibrationModal, 500);
  }
});

