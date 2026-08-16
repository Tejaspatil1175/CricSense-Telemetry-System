const http = require('http');

const payload = JSON.stringify({
  accel: { x: 0.15, y: 0.98, z: 0.05 },
  gyro: { x: 0.02, y: 0.05, z: 0.01 },
  motion: { alpha: 1.25, beta: 0.45, gamma: 0.12, orientation: 0 },
  mag: { x: 12.5, y: -4.2, z: 30.1, heading: 124.5 },
  deviceTimestamp: Date.now(),
});

const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 8080,
    path: '/telemetry',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  },
  res => {
    let data = '';
    res.on('data', chunk => (data += chunk));
    res.on('end', () => {
      console.log('Test packet response:', data);
    });
  }
);

req.on('error', err => console.error('Error sending test packet:', err.message));
req.write(payload);
req.end();
