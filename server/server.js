const http = require('http');
const os = require('os');

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

// Update packet rate every second
setInterval(() => {
  packetsPerSecond = packetWindow;
  packetWindow = 0;
}, 1000);

// CLI Terminal Formatter
function printTelemetry(data, clientIp, protocol) {
  packetCount++;
  packetWindow++;
  const now = Date.now();
  const latency = data.deviceTimestamp ? (now - data.deviceTimestamp) : 'N/A';

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
  console.log(` Status          : ACTIVE LISTENING`);
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

// 1. Create HTTP Server for POST /telemetry requests
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

  if (req.method === 'POST' && req.url === '/telemetry') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const clientIp = req.socket.remoteAddress || 'Unknown';
        printTelemetry(payload, clientIp, 'HTTP POST');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', receivedAt: Date.now() }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('CricSense Laptop Telemetry Receiver Running. Send POST to /telemetry or connect via WebSocket.');
  }
});

// 2. Attach WebSocket server if 'ws' module is available
if (WebSocket) {
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'Unknown Mobile App';
    console.log(`\nMobile Bat Controller connected from ${clientIp}`);

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());
        printTelemetry(payload, clientIp, 'WebSocket');
      } catch (e) {
        console.error('Error parsing WebSocket message:', e.message);
      }
    });

    ws.on('close', () => {
      console.log(`\nMobile Bat Controller (${clientIp}) disconnected.`);
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
  console.log(' Use one of the following IP addresses in your mobile app settings:');
  localIps.forEach(ip => {
    console.log(`   -> http://${ip}:${PORT}/telemetry  (HTTP Stream)`);
    if (WebSocket) {
      console.log(`   -> ws://${ip}:${PORT}             (WebSocket Stream)`);
    }
  });
  console.log('================================================================');
  console.log(' Waiting for bat controller telemetry packets...\n');
});
