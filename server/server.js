const http = require('http');
const fs = require('fs');
const path = require('path');

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

const { getLocalIpAddresses } = require('./src/networkUtils');
const { setupTunnel } = require('./src/tunnelManager');
const { handleHttpRequest } = require('./src/routes');
const { setupWebSocket } = require('./src/websocketHandler');

const PORT = process.env.PORT || 8080;
const publicDir = path.join(__dirname, 'public');

// 1. Create HTTP Server for Web Dashboard static files, Status API, and HTTP POST fallback
const server = http.createServer((req, res) => {
  handleHttpRequest(req, res, publicDir, PORT);
});

// 2. Attach WebSocket server for real-time Wi-Fi telemetry streaming & approval handshake
setupWebSocket(server, PORT);

// 3. Start Server - Bind explicitly to 0.0.0.0 so phone can connect via Wi-Fi IP & localhost works
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

  await setupTunnel(PORT);

  console.log('================================================================');
  console.log(' Waiting for bat controller telemetry packets...\n');
});
