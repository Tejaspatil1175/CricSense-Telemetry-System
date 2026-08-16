const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

let WebSocket;
try {
  WebSocket = require('ws');
} catch (e) {
  WebSocket = null;
}

// Load .env configuration file if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  });
}

let localtunnel;
try {
  localtunnel = require('localtunnel');
} catch (e) {
  localtunnel = null;
}

const PORT = process.env.PORT || 8080;
let cloudTunnelUrl = '';

// Common mobile-hotspot subnet prefixes, so we can prefer them when a PC
// has multiple network adapters (Ethernet, VPN, virtual adapters, etc.)
const HOTSPOT_PREFIXES = [
  '192.168.137.', // Windows Mobile Hotspot (PC hosting hotspot)
  '192.168.43.',  // Android hotspot (phone hosting, PC tethered)
  '192.168.49.',  // Android Wi-Fi Direct / newer hotspot
  '172.20.10.',   // iPhone Personal Hotspot
];

function isHotspotIp(ip) {
  return HOTSPOT_PREFIXES.some(prefix => ip.startsWith(prefix));
}

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  // Put likely-hotspot IPs first so the dashboard/QR always suggests the
  // address that's actually reachable from a phone on the hotspot.
  addresses.sort((a, b) => (isHotspotIp(b) ? 1 : 0) - (isHotspotIp(a) ? 1 : 0));
  return addresses;
}

let packetCount = 0;
let packetsPerSecond = 0;
let packetWindow = 0;
let latestPayload = null;

let mobileState = 'idle'; // 'idle' | 'pending_approval' | 'connected' | 'denied'
let selectedMethod = 'wifi';
let lastMobileConnectTime = 0;
let lastTelemetryTime = 0;
let pendingMobileClient = null;
let activeMobileClient = null;
let webDashboardClients = new Set();

function broadcastToWeb(messageObj) {
  const payloadStr = JSON.stringify(messageObj);
  for (const client of webDashboardClients) {
    if (client.readyState === (WebSocket ? WebSocket.OPEN : 1)) {
      client.send(payloadStr);
    }
  }
}

function broadcastStateChange(state, method) {
  mobileState = state;
  if (method) selectedMethod = method;
  broadcastToWeb({
    type: 'connection_status',
    state: mobileState,
    method: selectedMethod,
    timestamp: Date.now()
  });
}

// Watchdog interval to update Hz rate & reset idle state on timeout
setInterval(() => {
  packetsPerSecond = packetWindow;
  packetWindow = 0;

  const now = Date.now();
  if (mobileState === 'connected' && (now - lastTelemetryTime > 3500)) {
    console.log('\n[MOBILE DISCONNECT] Real-time telemetry stream timed out.');
    mobileState = 'idle';
    activeMobileClient = null;
    broadcastStateChange('idle', selectedMethod);
  } else if (mobileState === 'pending_approval' && (now - lastMobileConnectTime > 15000)) {
    console.log('\n[APPROVAL TIMEOUT] Mobile request timed out.');
    mobileState = 'idle';
    if (pendingMobileClient && pendingMobileClient.readyState === 1) {
      pendingMobileClient.send(JSON.stringify({ type: 'connect_response', status: 'denied', reason: 'timeout' }));
    }
    pendingMobileClient = null;
    broadcastStateChange('idle', selectedMethod);
  }
}, 1000);

let maxRecordedSpeed = 0;

function analyzeBatPhysics(data) {
  const accel = data.accel || { x: 0, y: 0, z: 0 };
  const gyro = data.gyro || { x: 0, y: 0, z: 0 };
  const motion = data.motion || { alpha: 0, beta: 0, gamma: 0 };
  const mag = data.mag || { heading: 0 };

  const ax = accel.x || 0;
  const ay = accel.y || 0;
  const az = accel.z || 0;
  const totalG = Math.sqrt(ax * ax + ay * ay + az * az);

  const gx = gyro.x || 0;
  const gy = gyro.y || 0;
  const gz = gyro.z || 0;
  const gyroMag = Math.sqrt(gx * gx + gy * gy + gz * gz); // rad/s

  const BAT_RADIUS_METERS = 0.85;
  const tipSpeedMs = gyroMag * BAT_RADIUS_METERS;
  const speedKmh = tipSpeedMs * 3.6;
  const speedMph = tipSpeedMs * 2.23694;

  if (speedKmh > maxRecordedSpeed) {
    maxRecordedSpeed = speedKmh;
  }

  const betaDeg = (motion.beta || 0) * (180 / Math.PI);
  const gammaDeg = (motion.gamma || 0) * (180 / Math.PI);
  const alphaDeg = (motion.alpha || 0) * (180 / Math.PI);

  let faceAlignment = 'Square Face (Straight)';
  if (gammaDeg > 12) {
    faceAlignment = `Open Face (+${gammaDeg.toFixed(1)}°)`;
  } else if (gammaDeg < -12) {
    faceAlignment = `Closed Face (${gammaDeg.toFixed(1)}°)`;
  } else {
    faceAlignment = `Square Face (${gammaDeg.toFixed(1)}°)`;
  }

  let batPlane = 'Vertical Bat';
  if (Math.abs(betaDeg) < 35) {
    batPlane = 'Horizontal (Cross-Bat)';
  } else if (Math.abs(betaDeg) < 65) {
    batPlane = 'Angled Bat';
  }

  const isImpact = totalG > 2.2 || (gyroMag > 4.0 && totalG > 1.8);
  let detectedShot = 'Stance / Ready';

  if (speedKmh > 10 || gyroMag > 2.0) {
    if (batPlane === 'Horizontal (Cross-Bat)') {
      if (gz > 2.0 || Math.abs(alphaDeg) > 40) {
        detectedShot = 'Pull / Hook Shot 💥';
      } else {
        detectedShot = 'Square Cut 🔪';
      }
    } else {
      if (gammaDeg > 15) {
        detectedShot = 'Cover Drive 🚀';
      } else if (gammaDeg < -15) {
        detectedShot = 'On Drive / Flick 🏏';
      } else if (totalG > 3.0) {
        detectedShot = 'Lofted Power Hit ⚡';
      } else {
        detectedShot = 'Straight Drive 🎯';
      }
    }
  } else if (totalG > 1.8) {
    detectedShot = 'Defensive Block / Push 🛡️';
  }

  return {
    accel,
    gyro,
    motion,
    mag,
    totalG: parseFloat(totalG.toFixed(2)),
    gyroMag: parseFloat(gyroMag.toFixed(3)),
    speedKmh: parseFloat(speedKmh.toFixed(1)),
    speedMph: parseFloat(speedMph.toFixed(1)),
    maxSpeedKmh: parseFloat(maxRecordedSpeed.toFixed(1)),
    faceAlignment,
    faceAngleDeg: parseFloat(gammaDeg.toFixed(1)),
    pitchAngleDeg: parseFloat(betaDeg.toFixed(1)),
    batPlane,
    isImpact,
    detectedShot,
  };
}

// CLI Terminal Formatter
function processTelemetry(data, clientIp) {
  packetCount++;
  packetWindow++;
  const analytics = analyzeBatPhysics(data);
  latestPayload = { ...data, physics: analytics };
  const now = Date.now();
  lastTelemetryTime = now;
  const latency = data.deviceTimestamp ? (now - data.deviceTimestamp) : 'N/A';

  // Broadcast live sensor frame & computed physics to Web Dashboard
  broadcastToWeb({
    type: 'telemetry',
    state: 'connected',
    method: selectedMethod,
    ...data,
    physics: analytics
  });

  const accel = data.accel || { x: 0, y: 0, z: 0 };
  const gyro = data.gyro || { x: 0, y: 0, z: 0 };
  const motion = data.motion || { alpha: 0, beta: 0, gamma: 0, orientation: 0 };

  process.stdout.write('\x1Bc');
  console.log('================================================================');
  console.log('            CRICSENSE PC/LAPTOP TELEMETRY RECEIVER              ');
  console.log('================================================================');
  console.log(` Status          : MOBILE CONNECTED (${selectedMethod.toUpperCase()})`);
  console.log(` Web Dashboard   : http://localhost:${PORT}`);
  console.log(` Controller IP   : ${clientIp}`);
  console.log(` Packets Received: ${packetCount} | Data Rate: ${packetsPerSecond} Hz`);
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

const server = http.createServer((req, res) => {
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
      cloudTunnelUrl,
      mobileState,
      selectedMethod,
      packetCount,
      packetsPerSecond,
      latestPayload,
      serverTime: Date.now(),
    }));
    return;
  }

  // HTTP POST /connect Endpoint (Mobile HTTP Fallback)
  if (req.method === 'POST' && req.url === '/connect') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        selectedMethod = payload.method || 'wifi';
        mobileState = 'connected';
        lastMobileConnectTime = Date.now();
        broadcastStateChange('connected', selectedMethod);
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
        if (mobileState !== 'connected') {
          mobileState = 'connected';
          broadcastStateChange('connected', selectedMethod);
        }
        processTelemetry(payload, clientIp);
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
    mobileState = 'idle';
    activeMobileClient = null;
    broadcastStateChange('idle', selectedMethod);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Serve Web Home Page (index.html)
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(indexPath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: Unable to load home page UI.');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// 2. Attach WebSocket server for real-time Wi-Fi telemetry streaming & approval handshake
if (WebSocket) {
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'Unknown Client';
    let isWebDashboard = false;

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());

        // A) Web Dashboard Registration
        if (payload.type === 'web_dashboard_register') {
          isWebDashboard = true;
          webDashboardClients.add(ws);
          ws.send(JSON.stringify({
            type: 'connection_status',
            state: mobileState,
            method: selectedMethod,
            timestamp: Date.now()
          }));
          return;
        }

        // B) Web Dashboard Approval Response (Accept / Deny)
        if (payload.type === 'respond_connect') {
          if (payload.action === 'accept') {
            console.log(`\n[PC ACTION] Connection ACCEPTED for mobile client`);
            mobileState = 'connected';
            activeMobileClient = pendingMobileClient;
            if (pendingMobileClient && pendingMobileClient.readyState === 1) {
              pendingMobileClient.send(JSON.stringify({
                type: 'connect_response',
                status: 'accepted'
              }));
            }
            pendingMobileClient = null;
            broadcastStateChange('connected', selectedMethod);
          } else {
            console.log(`\n[PC ACTION] Connection DENIED for mobile client`);
            mobileState = 'idle';
            if (pendingMobileClient && pendingMobileClient.readyState === 1) {
              pendingMobileClient.send(JSON.stringify({
                type: 'connect_response',
                status: 'denied',
                reason: 'Server denied connection'
              }));
            }
            pendingMobileClient = null;
            broadcastStateChange('idle', selectedMethod);
          }
          return;
        }

        // C) Mobile Client Connection Request (Auto-Accept)
        if (payload.type === 'client_request_connect') {
          console.log(`\n[MOBILE CONNECT REQUEST] Auto-accepting connection via ${payload.method || 'wifi'}`);
          selectedMethod = payload.method || 'wifi';
          mobileState = 'connected';
          activeMobileClient = ws;
          lastMobileConnectTime = Date.now();

          // Immediately respond with 'accepted' to start streaming
          ws.send(JSON.stringify({
            type: 'connect_response',
            status: 'accepted'
          }));

          // Notify Web Dashboard that mobile is connected & active
          broadcastStateChange('connected', selectedMethod);
          return;
        }

        // D) Mobile Disconnect Request
        if (payload.type === 'client_disconnect') {
          console.log(`\n[MOBILE DISCONNECT] Mobile client requested disconnect`);
          mobileState = 'idle';
          activeMobileClient = null;
          pendingMobileClient = null;
          broadcastStateChange('idle', selectedMethod);
          return;
        }

        // E) Real-Time Sensor Telemetry Stream (over Wi-Fi WebSocket)
        if (payload.type === 'sensor_data' || payload.accel) {
          if (mobileState === 'connected') {
            processTelemetry(payload, clientIp);
          }
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e.message);
      }
    });

    ws.on('close', () => {
      if (isWebDashboard) {
        webDashboardClients.delete(ws);
      } else {
        if (ws === pendingMobileClient) {
          pendingMobileClient = null;
          mobileState = 'idle';
          broadcastStateChange('idle', selectedMethod);
        } else if (ws === activeMobileClient) {
          activeMobileClient = null;
          mobileState = 'idle';
          broadcastStateChange('idle', selectedMethod);
        }
      }
    });
  });
}

// Start Server - Bind explicitly to 0.0.0.0 so phone can connect via Wi-Fi IP & localhost works
server.listen(PORT, '0.0.0.0', async () => {
  const localIps = getLocalIpAddresses();
  console.log('================================================================');
  console.log('            CRICSENSE LAPTOP TELEMETRY RECEIVER                 ');
  console.log('================================================================');
  console.log(` Server is running on port ${PORT} (0.0.0.0)`);
  console.log(` Web Home Page  : http://localhost:${PORT}`);
  console.log(' Mobile app pairing endpoints:');
  localIps.forEach(ip => {
    console.log(`   -> ws://${ip}:${PORT}             (Local Wi-Fi)`);
  });

  async function setupTunnel() {
    if (!localtunnel) return;
    try {
      const tunnel = await localtunnel({ port: PORT, ...(process.env.SUBDOMAIN ? { subdomain: process.env.SUBDOMAIN } : {}) });
      cloudTunnelUrl = tunnel.url;
      console.log(`   -> ${cloudTunnelUrl.replace('https://', 'wss://')}   (Public Cloud Tunnel - No Firewall!)`);
      console.log(`   -> ${cloudTunnelUrl}           (Public Web URL)`);
      tunnel.on('close', () => {
        console.log('   [TUNNEL CLOSED] Reconnecting cloud tunnel in 5 seconds...');
        cloudTunnelUrl = '';
        setTimeout(setupTunnel, 5000);
      });
      tunnel.on('error', (err) => {
        console.log('   [TUNNEL ERROR]', err ? err.message : 'Disconnected');
      });
    } catch (e) {
      console.log('   (Cloud tunnel unavailable - using local network)');
    }
  }

  await setupTunnel();

  console.log('================================================================');
  console.log(' Waiting for bat controller telemetry packets...\n');
});
