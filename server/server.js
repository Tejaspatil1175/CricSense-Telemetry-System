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

// CLI Terminal Formatter
function processTelemetry(data, clientIp) {
  packetCount++;
  packetWindow++;
  latestPayload = data;
  const now = Date.now();
  lastTelemetryTime = now;
  const latency = data.deviceTimestamp ? (now - data.deviceTimestamp) : 'N/A';

  // Broadcast live sensor frame to Web Dashboard
  broadcastToWeb({
    type: 'telemetry',
    state: 'connected',
    method: selectedMethod,
    ...data
  });

  const accel = data.accel || { x: 0, y: 0, z: 0 };
  const gyro = data.gyro || { x: 0, y: 0, z: 0 };
  const motion = data.motion || { alpha: 0, beta: 0, gamma: 0, orientation: 0 };
  const mag = data.mag || { x: 0, y: 0, z: 0, heading: 0 };
  const totalG = Math.sqrt((accel.x || 0) ** 2 + (accel.y || 0) ** 2 + (accel.z || 0) ** 2).toFixed(2);

  process.stdout.write('\x1Bc');
  console.log('================================================================');
  console.log('            CRICSENSE PC/LAPTOP TELEMETRY RECEIVER              ');
  console.log('================================================================');
  console.log(` Status          : MOBILE CONNECTED (REALTIME WI-FI)`);
  console.log(` Web Dashboard   : http://localhost:${PORT}`);
  console.log(` Controller IP   : ${clientIp}`);
  console.log(` Packets Received: ${packetCount} | Data Rate: ${packetsPerSecond} Hz`);
  console.log(` Packet Latency  : ${latency} ms`);
  console.log('----------------------------------------------------------------');
  console.log(` ACCELEROMETER (g-force)`);
  console.log(`   X: ${(accel.x || 0).toFixed(4)} g  |  Y: ${(accel.y || 0).toFixed(4)} g  |  Z: ${(accel.z || 0).toFixed(4)} g`);
  console.log(`   Total Acceleration Magnitude: ${totalG} g`);
  console.log('----------------------------------------------------------------');
  console.log(` GYROSCOPE (rad/s)`);
  console.log(`   Pitch (X): ${(gyro.x || 0).toFixed(4)}  |  Roll (Y): ${(gyro.y || 0).toFixed(4)}  |  Yaw (Z): ${(gyro.z || 0).toFixed(4)}`);
  console.log('----------------------------------------------------------------');
  console.log(` ROTATION / ORIENTATION`);
  console.log(`   Alpha: ${(motion.alpha || 0).toFixed(4)} rad | Beta: ${(motion.beta || 0).toFixed(4)} rad | Gamma: ${(motion.gamma || 0).toFixed(4)} rad`);
  console.log('================================================================');
  console.log(' Press Ctrl+C to stop laptop receiver server.');
}

// 1. Create HTTP Server for Web Dashboard static files and status API
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

  if (localtunnel) {
    try {
      const tunnel = await localtunnel({ port: PORT });
      cloudTunnelUrl = tunnel.url;
      console.log(`   -> ${cloudTunnelUrl.replace('https://', 'wss://')}   (Public Cloud Tunnel - No Firewall!)`);
      console.log(`   -> ${cloudTunnelUrl}           (Public Web URL)`);
      tunnel.on('close', () => {
        cloudTunnelUrl = '';
      });
    } catch (e) {
      console.log('   (Cloud tunnel unavailable - using local network)');
    }
  }

  console.log('================================================================');
  console.log(' Waiting for bat controller telemetry packets...\n');
});
