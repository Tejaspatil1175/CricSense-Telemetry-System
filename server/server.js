const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Try requiring 'ws', fallback to HTTP server if not yet installed
let WebSocket;
try {
  WebSocket = require('ws');
} catch (e) {
  WebSocket = null;
}

const PORT = process.env.PORT || 8080;

// Helper to get local IP addresses for easy mobile pairing
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
let lastPacketTime = Date.now();
let packetsPerSecond = 0;
let packetWindow = 0;
let latestPayload = null;
let activeClients = new Set();

let mobileState = 'idle'; // 'idle' | 'connecting' | 'connected'
let selectedMethod = 'wifi'; // 'wifi' | 'usb' | 'bluetooth'
let lastMobileConnectTime = 0;
let lastTelemetryTime = 0;

function broadcastStateChange(state, method) {
  mobileState = state;
  if (method) selectedMethod = method;
  const msg = JSON.stringify({
    type: 'connection_status',
    state: mobileState,
    method: selectedMethod,
    timestamp: Date.now()
  });
  for (const client of activeClients) {
    if (client.readyState === (WebSocket ? WebSocket.OPEN : 1)) {
      client.send(msg);
    }
  }
}

// Update packet rate & check mobile status watchdog every second
setInterval(() => {
  packetsPerSecond = packetWindow;
  packetWindow = 0;

  const now = Date.now();
  if (mobileState === 'connected' && (now - lastTelemetryTime > 3500)) {
    console.log('\n[MOBILE DISCONNECT] Telemetry stream timed out.');
    broadcastStateChange('idle', selectedMethod);
  } else if (mobileState === 'connecting' && (now - lastMobileConnectTime > 6000)) {
    console.log('\n[MOBILE CONNECT TIMEOUT] Mobile connect handshake timed out before streaming.');
    broadcastStateChange('idle', selectedMethod);
  }
}, 1000);

// CLI Terminal Formatter & Web Broadcaster
function processTelemetry(data, clientIp, protocol) {
  packetCount++;
  packetWindow++;
  latestPayload = data;
  const now = Date.now();
  lastTelemetryTime = now;
  const latency = data.deviceTimestamp ? (now - data.deviceTimestamp) : 'N/A';

  if (mobileState !== 'connected') {
    mobileState = 'connected';
    if (data.method) selectedMethod = data.method;
    broadcastStateChange('connected', selectedMethod);
  }

  // Broadcast to Web Dashboard clients
  const payloadStr = JSON.stringify({
    type: 'telemetry',
    state: 'connected',
    method: selectedMethod,
    ...data
  });
  for (const client of activeClients) {
    if (client.readyState === (WebSocket ? WebSocket.OPEN : 1)) {
      client.send(payloadStr);
    }
  }

  const accel = data.accel || { x: 0, y: 0, z: 0 };
  const gyro = data.gyro || { x: 0, y: 0, z: 0 };
  const motion = data.motion || { alpha: 0, beta: 0, gamma: 0, orientation: 0 };
  const mag = data.mag || { x: 0, y: 0, z: 0, heading: 0 };

  const totalG = Math.sqrt((accel.x || 0) ** 2 + (accel.y || 0) ** 2 + (accel.z || 0) ** 2).toFixed(2);

  // Clear terminal screen and move cursor to top for smooth live dashboard output
  process.stdout.write('\x1Bc');

  console.log('================================================================');
  console.log('            CRICSENSE PC/LAPTOP TELEMETRY RECEIVER              ');
  console.log('================================================================');
  console.log(` Status          : MOBILE CONNECTED (${selectedMethod.toUpperCase()})`);
  console.log(` Web Dashboard   : http://localhost:${PORT}`);
  console.log(` Protocol        : ${protocol}`);
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
  console.log(`   Screen Orientation: ${motion.orientation || 0}°`);
  console.log('----------------------------------------------------------------');
  console.log(` MAGNETOMETER & COMPASS`);
  console.log(`   X: ${(mag.x || 0).toFixed(2)} uT  |  Y: ${(mag.y || 0).toFixed(2)} uT  |  Z: ${(mag.z || 0).toFixed(2)} uT`);
  console.log(`   Heading Angle: ${(mag.heading || 0).toFixed(1)}°`);
  console.log('================================================================');
  console.log(' Press Ctrl+C to stop laptop receiver server.');
}

// 1. Create HTTP Server for Web Dashboard & Telemetry POST requests
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle Mobile Connection Handshake Endpoint
  if (req.method === 'POST' && req.url === '/connect') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const method = payload.method || 'wifi';
        lastMobileConnectTime = Date.now();
        broadcastStateChange('connecting', method);
        console.log(`\n[CONNECT REQUEST] Mobile initiated connection via ${method}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'connecting', method, serverTime: Date.now() }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
    return;
  }

  // Handle Mobile Disconnect Endpoint
  if (req.method === 'POST' && req.url === '/disconnect') {
    broadcastStateChange('idle', selectedMethod);
    console.log('\n[DISCONNECT REQUEST] Mobile disconnected.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'disconnected' }));
    return;
  }

  // Handle Telemetry POST endpoint
  if (req.method === 'POST' && req.url === '/telemetry') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const clientIp = req.socket.remoteAddress || 'Unknown';
        processTelemetry(payload, clientIp, 'HTTP POST');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', receivedAt: Date.now() }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // API Status Endpoint
  if (req.method === 'GET' && req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'active',
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

  // Fallback for unknown routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// 2. Attach WebSocket server if 'ws' module is available
if (WebSocket) {
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'Unknown Client';
    activeClients.add(ws);
    console.log(`\nClient connected from ${clientIp}`);

    // Send current mobile connection status to newly connected Web Dashboard
    ws.send(JSON.stringify({
      type: 'connection_status',
      state: mobileState,
      method: selectedMethod,
      timestamp: Date.now()
    }));

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());
        processTelemetry(payload, clientIp, 'WebSocket');
      } catch (e) {
        console.error('Error parsing WebSocket message:', e.message);
      }
    });

    ws.on('close', () => {
      activeClients.delete(ws);
      console.log(`\nClient (${clientIp}) disconnected.`);
    });
  });
}

// Start Server
server.listen(PORT, () => {
  const localIps = getLocalIpAddresses();
  console.log('================================================================');
  console.log('            CRICSENSE LAPTOP TELEMETRY RECEIVER                 ');
  console.log('================================================================');
  console.log(` Server is running on port ${PORT}`);
  console.log(` Web Home Page  : http://localhost:${PORT}`);
  console.log(' Mobile app pairing endpoints:');
  localIps.forEach(ip => {
    console.log(`   -> http://${ip}:${PORT}/telemetry  (HTTP Stream)`);
    if (WebSocket) {
      console.log(`   -> ws://${ip}:${PORT}             (WebSocket Stream)`);
    }
  });
  console.log('================================================================');
  console.log(' Waiting for bat controller telemetry packets...\n');
});

