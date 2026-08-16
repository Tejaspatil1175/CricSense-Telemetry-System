import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { Accelerometer, Gyroscope, Magnetometer, DeviceMotion } from 'expo-sensors';

// --- Madgwick IMU sensor-fusion filter ---------------------------------
// Fuses raw gyroscope (rad/s) + accelerometer (g) into a single rotation
// quaternion [w, x, y, z]. Unlike the phone OS's alpha/beta/gamma Euler
// angles, a quaternion has no gimbal-lock singularity: holding the phone
// straight up (like a bat) is exactly the orientation where Euler angles
// blow up, and exactly where a quaternion stays perfectly stable. This is
// the standard public-domain Madgwick AHRS algorithm (gyro-driven
// integration, accelerometer-driven gradient-descent correction).
function madgwickUpdate(q, gx, gy, gz, ax, ay, az, dt, beta = 0.08) {
  let [q0, q1, q2, q3] = q;

  let norm = Math.sqrt(ax * ax + ay * ay + az * az);
  if (norm === 0 || !isFinite(norm)) {
    // No usable accelerometer reading this tick — fall back to pure
    // gyro integration so orientation doesn't freeze or blow up.
    const qDot0 = 0.5 * (-q1 * gx - q2 * gy - q3 * gz);
    const qDot1 = 0.5 * (q0 * gx + q2 * gz - q3 * gy);
    const qDot2 = 0.5 * (q0 * gy - q1 * gz + q3 * gx);
    const qDot3 = 0.5 * (q0 * gz + q1 * gy - q2 * gx);
    q0 += qDot0 * dt; q1 += qDot1 * dt; q2 += qDot2 * dt; q3 += qDot3 * dt;
    norm = Math.sqrt(q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3) || 1;
    return [q0 / norm, q1 / norm, q2 / norm, q3 / norm];
  }
  ax /= norm; ay /= norm; az /= norm;

  const _2q0 = 2 * q0, _2q1 = 2 * q1, _2q2 = 2 * q2, _2q3 = 2 * q3;
  const _4q0 = 4 * q0, _4q1 = 4 * q1, _4q2 = 4 * q2;
  const _8q1 = 8 * q1, _8q2 = 8 * q2;
  const q0q0 = q0 * q0, q1q1 = q1 * q1, q2q2 = q2 * q2, q3q3 = q3 * q3;

  let s0 = _4q0 * q2q2 + _2q2 * ax + _4q0 * q1q1 - _2q1 * ay;
  let s1 = _4q1 * q3q3 - _2q3 * ax + 4 * q0q0 * q1 - _2q0 * ay - _4q1 + _8q1 * q1q1 + _8q1 * q2q2 + _4q1 * az;
  let s2 = 4 * q0q0 * q2 + _2q0 * ax + _4q2 * q3q3 - _2q3 * ay - _4q2 + _8q2 * q1q1 + _8q2 * q2q2 + _4q2 * az;
  let s3 = 4 * q1q1 * q3 - _2q1 * ax + 4 * q2q2 * q3 - _2q2 * ay;
  let normS = Math.sqrt(s0 * s0 + s1 * s1 + s2 * s2 + s3 * s3) || 1;
  s0 /= normS; s1 /= normS; s2 /= normS; s3 /= normS;

  const qDot0 = 0.5 * (-q1 * gx - q2 * gy - q3 * gz) - beta * s0;
  const qDot1 = 0.5 * (q0 * gx + q2 * gz - q3 * gy) - beta * s1;
  const qDot2 = 0.5 * (q0 * gy - q1 * gz + q3 * gx) - beta * s2;
  const qDot3 = 0.5 * (q0 * gz + q1 * gy - q2 * gx) - beta * s3;

  q0 += qDot0 * dt; q1 += qDot1 * dt; q2 += qDot2 * dt; q3 += qDot3 * dt;
  norm = Math.sqrt(q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3) || 1;
  return [q0 / norm, q1 / norm, q2 / norm, q3 / norm];
}

export function parseServerUrl(inputIpOrUrl, defaultPort = '8080') {
  if (!inputIpOrUrl) return { httpUrl: '', wsUrl: '', cleanHost: '' };
  
  let raw = String(inputIpOrUrl).trim();
  if (!raw) return { httpUrl: '', wsUrl: '', cleanHost: '' };

  // Detect initial scheme (if present)
  const isHttpsOrWss = /^https:\/\/|^wss:\/\//i.test(raw);

  // Strip protocol prefixes
  raw = raw.replace(/^(https?:\/\/|wss?:\/\/)+/gi, '');
  // Strip path & query parameters
  raw = raw.replace(/[\/\?#].*$/, '');

  let host = raw;
  let port = '';

  if (raw.includes(':')) {
    const parts = raw.split(':').filter(Boolean);
    host = parts[0];
    port = parts[1] || '';
  }

  // Check if host is an IP address or localhost
  const isIpOrLocalhost = /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.toLowerCase() === 'localhost';
  const isCloudTunnel = host.includes('loca.lt') || host.includes('ngrok') || host.includes('cloudflare') || host.includes('pinggy') || host.includes('serveo') || host.includes('localtunnel');

  let httpUrl = '';
  let wsUrl = '';
  let cleanHost = '';

  if (isCloudTunnel || (!isIpOrLocalhost && port === '')) {
    // Cloud tunnel or non-IP domain: Cloud tunnels (loca.lt) expose standard 80/443 externally.
    cleanHost = host;
    httpUrl = `https://${host}`;
    wsUrl = `wss://${host}`;
  } else {
    // Local IP address (e.g. 192.168.x.x, 10.x.x.x) or explicit host:port
    const finalPort = port || defaultPort;
    cleanHost = `${host}:${finalPort}`;
    const scheme = isHttpsOrWss ? 'https' : 'http';
    const wsScheme = isHttpsOrWss ? 'wss' : 'ws';
    httpUrl = `${scheme}://${cleanHost}`;
    wsUrl = `${wsScheme}://${cleanHost}`;
  }

  return { httpUrl, wsUrl, cleanHost };
}

export function useSensorData(samplingInterval = 50, serverIp = '10.97.70.3', serverPort = '8080') {
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0, timestamp: 0, deviceTimestamp: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0, timestamp: 0, deviceTimestamp: 0 });
  const [magData, setMagData] = useState({ x: 0, y: 0, z: 0, heading: 0, timestamp: 0, deviceTimestamp: 0 });
  const [motionData, setMotionData] = useState({ alpha: 0, beta: 0, gamma: 0, orientation: 0, timestamp: 0, deviceTimestamp: 0 });
  const [quatData, setQuatData] = useState({ w: 1, x: 0, y: 0, z: 0 });

  const [connectionState, setConnectionState] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'denied' | 'error'
  const [activeMethod, setActiveMethod] = useState('wifi');
  const [activeProtocol, setActiveProtocol] = useState('ws'); // 'ws' | 'http'

  const [status, setStatus] = useState({
    accel: 'Checking...',
    gyro: 'Checking...',
    mag: 'Checking...',
    motion: 'Checking...',
    stream: 'Disconnected',
  });

  const socketRef = useRef(null);
  const activeHttpUrlRef = useRef('');
  const latestRef = useRef({ accelData, gyroData, magData, motionData, quatData, activeMethod });
  useEffect(() => {
    latestRef.current = { accelData, gyroData, magData, motionData, quatData, activeMethod };
  }, [accelData, gyroData, magData, motionData, quatData, activeMethod]);

  // Sensor-fusion working state (not React state — updated every gyro
  // sample at full rate, independent of React's render cycle).
  const fusionQuatRef = useRef([1, 0, 0, 0]);
  const latestAccelRawRef = useRef({ x: 0, y: 0, z: 0 });
  const lastFusionTimeRef = useRef(0);

  const disconnectFromServer = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'client_disconnect' }));
        socketRef.current.close();
      } catch (e) {}
      socketRef.current = null;
    }
    const httpUrl = activeHttpUrlRef.current || parseServerUrl(serverIp, serverPort).httpUrl;
    if (httpUrl) {
      try { fetch(`${httpUrl}/disconnect`, { method: 'POST' }); } catch (e) {}
    }
    setConnectionState('disconnected');
    setStatus(prev => ({ ...prev, stream: 'Disconnected' }));
  }, [serverIp, serverPort]);

  const connectToServer = useCallback(async (method = 'wifi') => {
    const primaryCandidate = parseServerUrl(serverIp, serverPort);
    const secondaryCandidate = parseServerUrl('127.0.0.1', serverPort);
    const tertiaryCandidate = parseServerUrl('10.0.2.2', serverPort);

    const candidates = [
      primaryCandidate,
      secondaryCandidate,
      tertiaryCandidate,
    ].filter(c => c.httpUrl && c.wsUrl);

    // Filter out duplicates
    const uniqueCandidates = [];
    const seen = new Set();
    for (const c of candidates) {
      if (!seen.has(c.httpUrl)) {
        seen.add(c.httpUrl);
        uniqueCandidates.push(c);
      }
    }

    if (uniqueCandidates.length === 0) {
      Alert.alert('Server Address Required', 'Please enter your Laptop Server IP or Link.');
      return;
    }

    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) {}
      socketRef.current = null;
    }

    setActiveMethod(method);
    setConnectionState('connecting');
    setStatus(prev => ({ ...prev, stream: `Connecting via ${method.toUpperCase()}...` }));

    // Test candidate endpoints sequentially
    for (const candidate of uniqueCandidates) {
      const { httpUrl, wsUrl } = candidate;

      // 1. Attempt WebSocket connection
      const wsSuccess = await new Promise((resolve) => {
        let done = false;
        try {
          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            if (!done) {
              done = true;
              socketRef.current = ws;
              activeHttpUrlRef.current = httpUrl;
              setActiveProtocol('ws');
              ws.send(JSON.stringify({
                type: 'client_request_connect',
                deviceName: 'CricSense Mobile Controller',
                method: method
              }));
              resolve(true);
            }
          };

          ws.onmessage = (event) => {
            try {
              const payload = JSON.parse(event.data);
              if (payload.type === 'connect_response' && payload.status === 'accepted') {
                setConnectionState('connected');
                setStatus(prev => ({ ...prev, stream: 'Connected & Streaming (WebSocket)' }));
              }
            } catch (e) {}
          };

          ws.onerror = () => {
            if (!done) {
              done = true;
              try { ws.close(); } catch (e) {}
              resolve(false);
            }
          };

          setTimeout(() => {
            if (!done) {
              done = true;
              try { ws.close(); } catch (e) {}
              resolve(false);
            }
          }, 2500);
        } catch (e) {
          resolve(false);
        }
      });

      if (wsSuccess) {
        setConnectionState('connected');
        setStatus(prev => ({ ...prev, stream: 'Connected & Streaming (WebSocket)' }));
        return;
      }

      // 2. Fallback to HTTP POST connection
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(`${httpUrl}/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true',
            'bypass-tunnel-reminder': 'true'
          },
          body: JSON.stringify({ method, timestamp: Date.now() }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          activeHttpUrlRef.current = httpUrl;
          setActiveProtocol('http');
          setConnectionState('connected');
          setStatus(prev => ({ ...prev, stream: 'Connected & Streaming (HTTP Fallback)' }));
          return;
        }
      } catch (e) {}
    }

    setConnectionState('error');
    setStatus(prev => ({ ...prev, stream: 'Unable to Reach Server' }));
    Alert.alert(
      'Unable to Reach PC Server',
      `Could not connect to PC server at:\n${primaryCandidate.httpUrl}\n\nTroubleshooting Steps:\n1. Ensure PC server is running (npm run dev)\n2. Ensure Phone & PC are connected to the same Wi-Fi / Hotspot\n3. Plug in USB cable with USB Debugging enabled for instant link!`
    );
  }, [serverIp, serverPort]);

  // Telemetry stream loop (uses WebSocket if active, or HTTP POST fallback)
  useEffect(() => {
    if (connectionState !== 'connected') {
      return;
    }

    const transmitTimer = setInterval(async () => {
      const { accelData, gyroData, magData, motionData, quatData, activeMethod } = latestRef.current;
      const payload = {
        type: 'sensor_data',
        method: activeMethod,
        accel: accelData,
        gyro: gyroData,
        motion: motionData,
        quat: quatData,
        mag: magData,
        deviceTimestamp: Date.now(),
      };

      if (activeProtocol === 'ws') {
        const socket = socketRef.current;
        if (socket && socket.readyState === 1) {
          try { socket.send(JSON.stringify(payload)); } catch (e) {}
        } else {
          setActiveProtocol('http');
        }
      } else {
        const httpUrl = activeHttpUrlRef.current || parseServerUrl(serverIp, serverPort).httpUrl;
        if (httpUrl) {
          try {
            await fetch(`${httpUrl}/telemetry`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true',
                'bypass-tunnel-reminder': 'true'
              },
              body: JSON.stringify(payload),
            });
            setStatus(prev => ({ ...prev, stream: 'Connected & Streaming (HTTP)' }));
          } catch (e) {
            setConnectionState('disconnected');
            setStatus(prev => ({ ...prev, stream: 'Disconnected' }));
          }
        }
      }
    }, samplingInterval);

    return () => clearInterval(transmitTimer);
  }, [samplingInterval, connectionState, activeProtocol, serverIp, serverPort]);

  // Setup Sensor Listeners
  useEffect(() => {
    let accelSub, gyroSub, magSub, motionSub;

    const setupSensors = async () => {
      // 1. Accelerometer
      try {
        const isAccelAvail = await Accelerometer.isAvailableAsync();
        setStatus(prev => ({ ...prev, accel: isAccelAvail ? 'Available (High Accuracy)' : 'Unavailable' }));
        if (isAccelAvail) {
          Accelerometer.setUpdateInterval(samplingInterval);
          accelSub = Accelerometer.addListener(data => {
            const x = data.x || 0, y = data.y || 0, z = data.z || 0;
            latestAccelRawRef.current = { x, y, z };
            setAccelData({
              x, y, z,
              timestamp: data.timestamp || 0,
              deviceTimestamp: Date.now(),
            });
          });
        }
      } catch (e) {
        setStatus(prev => ({ ...prev, accel: 'Error' }));
      }

      // 2. Gyroscope
      try {
        const isGyroAvail = await Gyroscope.isAvailableAsync();
        setStatus(prev => ({ ...prev, gyro: isGyroAvail ? 'Available (High Accuracy)' : 'Unavailable' }));
        if (isGyroAvail) {
          Gyroscope.setUpdateInterval(samplingInterval);
          gyroSub = Gyroscope.addListener(data => {
            const gx = data.x || 0;
            const gy = data.y || 0;
            const gz = data.z || 0;
            const now = Date.now();
            const dt = lastFusionTimeRef.current > 0 ? Math.min((now - lastFusionTimeRef.current) / 1000, 0.2) : (samplingInterval / 1000);
            lastFusionTimeRef.current = now;

            const accelRaw = latestAccelRawRef.current;
            const updatedQuat = madgwickUpdate(
              fusionQuatRef.current,
              gx, gy, gz,
              accelRaw.x, accelRaw.y, accelRaw.z,
              dt,
              0.08
            );
            fusionQuatRef.current = updatedQuat;
            setQuatData({ w: updatedQuat[0], x: updatedQuat[1], y: updatedQuat[2], z: updatedQuat[3] });

            setGyroData({
              x: gx,
              y: gy,
              z: gz,
              timestamp: data.timestamp || 0,
              deviceTimestamp: now,
            });
          });
        }
      } catch (e) {
        setStatus(prev => ({ ...prev, gyro: 'Error' }));
      }

      // 3. Magnetometer
      try {
        const isMagAvail = await Magnetometer.isAvailableAsync();
        setStatus(prev => ({ ...prev, mag: isMagAvail ? 'Available (Calibrated)' : 'Unavailable' }));
        if (isMagAvail) {
          Magnetometer.setUpdateInterval(samplingInterval);
          magSub = Magnetometer.addListener(data => {
            const x = data.x || 0;
            const y = data.y || 0;
            const z = data.z || 0;
            const heading = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
            setMagData({
              x,
              y,
              z,
              heading,
              timestamp: data.timestamp || 0,
              deviceTimestamp: Date.now(),
            });
          });
        }
      } catch (e) {
        setStatus(prev => ({ ...prev, mag: 'Error' }));
      }

      // 4. DeviceMotion
      try {
        const isMotionAvail = await DeviceMotion.isAvailableAsync();
        setStatus(prev => ({ ...prev, motion: isMotionAvail ? 'Available (Tracking)' : 'Unavailable' }));
        if (isMotionAvail) {
          DeviceMotion.setUpdateInterval(samplingInterval);
          motionSub = DeviceMotion.addListener(data => {
            const rot = data.rotation || { alpha: 0, beta: 0, gamma: 0 };
            setMotionData({
              alpha: rot.alpha || 0,
              beta: rot.beta || 0,
              gamma: rot.gamma || 0,
              orientation: data.orientation || 0,
              timestamp: data.timestamp || 0,
              deviceTimestamp: Date.now(),
            });
          });
        }
      } catch (e) {
        setStatus(prev => ({ ...prev, motion: 'Error' }));
      }
    };

    setupSensors();

    return () => {
      accelSub && accelSub.remove();
      gyroSub && gyroSub.remove();
      magSub && magSub.remove();
      motionSub && motionSub.remove();
    };
  }, [samplingInterval]);

  return { accelData, gyroData, magData, motionData, quatData, status, connectionState, activeMethod, connectToServer, disconnectFromServer };
}
