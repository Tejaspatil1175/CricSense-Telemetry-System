const fs = require('fs');
const path = require('path');
const { state, broadcastStateChange } = require('./state');
const { getLocalIpAddresses } = require('./networkUtils');
const { analyzeBatPhysics, updateCalibrationProfile } = require('./physicsEngine');

function processTelemetry(data, clientIp, port) {
  state.packetCount++;
  state.packetWindow++;
  const analytics = analyzeBatPhysics(data);
  state.latestPayload = { ...data, physics: analytics };
  const now = Date.now();
  state.lastTelemetryTime = now;
  const latency = data.deviceTimestamp ? (now - data.deviceTimestamp) : 'N/A';

  // Broadcast live sensor frame & computed physics to Web Dashboard
  const { broadcastToWeb } = require('./state');
  broadcastToWeb({
    type: 'telemetry',
    state: state.mobileState,
    method: state.selectedMethod,
    ...data,
    physics: analytics
  });

  const accel = data.accel || { x: 0, y: 0, z: 0 };
  const gyro = data.gyro || { x: 0, y: 0, z: 0 };
  const motion = data.motion || { alpha: 0, beta: 0, gamma: 0, orientation: 0 };

  // Throttle terminal clear & console output to avoid CPU/terminal buffer latency
  if (!state.lastConsoleLogTime || (now - state.lastConsoleLogTime > 400)) {
    state.lastConsoleLogTime = now;
    process.stdout.write('\x1Bc');
    console.log('================================================================');
    console.log('            CRICSENSE PC/LAPTOP TELEMETRY RECEIVER              ');
    console.log('================================================================');
    console.log(` Status          : MOBILE CONNECTED (${state.selectedMethod.toUpperCase()})`);
    console.log(` Web Dashboard   : http://localhost:${port}`);
    console.log(` Controller IP   : ${clientIp}`);
    console.log(` Packets Received: ${state.packetCount} | Data Rate: ${state.packetsPerSecond} Hz`);
    console.log(` Packet Latency  : ${latency} ms`);
    console.log('----------------------------------------------------------------');
    console.log(` 🏏 BAT PHYSICS MOTION ENGINE`);
    console.log(`   Estimated Speed : ${analytics.speedKmh} km/h (${analytics.speedMph} mph) | Max Peak: ${analytics.maxSpeedKmh} km/h`);
    console.log(`   Bat Face        : ${analytics.faceAlignment}`);
    console.log(`   Bat Plane       : ${analytics.batPlane} (${analytics.pitchAngleDeg}°)`);
    console.log(`   Detected Shot   : ${analytics.detectedShot}`);
    console.log(`   Impact Alert    : ${analytics.isImpact ? '💥 IMPACT DETECTED!' : 'Normal Motion'}`);
    console.log('----------------------------------------------------------------');
    console.log(` ACCELEROMETER (g-force)`);
    console.log(`   X: ${(accel.x || 0).toFixed(4)} g  |  Y: ${(accel.y || 0).toFixed(4)} g  |  Z: ${(accel.z || 0).toFixed(4)} g`);
    console.log(`   Total Acceleration Magnitude: ${analytics.totalG} g`);
    console.log('----------------------------------------------------------------');
    console.log(` GYROSCOPE (rad/s)`);
    console.log(`   Pitch (X): ${(gyro.x || 0).toFixed(4)}  |  Roll (Y): ${(gyro.y || 0).toFixed(4)}  |  Yaw (Z): ${(gyro.z || 0).toFixed(4)}`);
    console.log('----------------------------------------------------------------');
    console.log(` ROTATION / ORIENTATION`);
    console.log(`   Alpha: ${(motion.alpha || 0).toFixed(4)} rad | Beta: ${(motion.beta || 0).toFixed(4)} rad | Gamma: ${(motion.gamma || 0).toFixed(4)} rad`);
    console.log('================================================================');
    console.log(' Press Ctrl+C to stop laptop receiver server.');
  }
}

function handleHttpRequest(req, res, publicDir, port) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Bypass-Tunnel-Reminder, bypass-tunnel-reminder');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Status Endpoint
  if (req.method === 'GET' && req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'active',
      localIps: getLocalIpAddresses(),
      cloudTunnelUrl: state.cloudTunnelUrl,
      mobileState: state.mobileState,
      selectedMethod: state.selectedMethod,
      packetCount: state.packetCount,
      packetsPerSecond: state.packetsPerSecond,
      latestPayload: state.latestPayload,
      serverTime: Date.now(),
    }));
    return;
  }

  // API Calibration Endpoint (GET & POST)
  if (req.method === 'GET' && req.url === '/api/calibration') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      calibrationProfile: state.calibrationProfile || {},
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/calibration') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        state.calibrationProfile = payload;
        updateCalibrationProfile(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'saved', calibrationProfile: state.calibrationProfile }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', reason: 'Invalid JSON' }));
      }
    });
    return;
  }

  // HTTP POST /connect Endpoint (Mobile HTTP Fallback)
  if (req.method === 'POST' && req.url === '/connect') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        state.selectedMethod = payload.method || 'wifi';
        state.mobileState = 'connected';
        state.lastMobileConnectTime = Date.now();
        broadcastStateChange('connected', state.selectedMethod);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'accepted' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', reason: 'Invalid JSON' }));
      }
    });
    return;
  }

  // HTTP POST /telemetry Endpoint (Mobile HTTP Fallback Stream)
  if (req.method === 'POST' && req.url === '/telemetry') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const clientIp = req.socket.remoteAddress || 'Unknown Client';
        if (state.mobileState !== 'connected') {
          state.mobileState = 'connected';
          broadcastStateChange('connected', state.selectedMethod);
        }
        processTelemetry(payload, clientIp, port);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error' }));
      }
    });
    return;
  }

  // HTTP POST /disconnect Endpoint
  if (req.method === 'POST' && req.url === '/disconnect') {
    state.mobileState = 'idle';
    state.activeMobileClient = null;
    broadcastStateChange('idle', state.selectedMethod);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Serve static files from public/
  const parsedUrl = new URL(req.url, 'http://localhost');
  let reqPath = decodeURIComponent(parsedUrl.pathname);
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(publicDir, reqPath);
  const extname = path.extname(filePath).toLowerCase();
  let contentType = 'text/html';

  if (extname === '.js') contentType = 'text/javascript';
  else if (extname === '.css') contentType = 'text/css';
  else if (extname === '.json') contentType = 'application/json';
  else if (extname === '.png') contentType = 'image/png';
  else if (extname === '.jpg' || extname === '.jpeg') contentType = 'image/jpeg';
  else if (extname === '.ico') contentType = 'image/x-icon';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

module.exports = {
  handleHttpRequest,
  processTelemetry,
};
