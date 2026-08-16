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

function updateDashboard(data) {
  if (data.accel) {
    document.getElementById('accelX').innerText = (data.accel.x || 0).toFixed(4) + ' g';
    document.getElementById('accelY').innerText = (data.accel.y || 0).toFixed(4) + ' g';
    document.getElementById('accelZ').innerText = (data.accel.z || 0).toFixed(4) + ' g';
    const totalG = Math.sqrt((data.accel.x||0)**2 + (data.accel.y||0)**2 + (data.accel.z||0)**2);
    document.getElementById('accelTotal').innerText = totalG.toFixed(2) + ' g';
  }
  if (data.gyro) {
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
});
