import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { Accelerometer, Gyroscope, Magnetometer, DeviceMotion } from 'expo-sensors';

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
  const latestRef = useRef({ accelData, gyroData, magData, motionData, activeMethod });
  useEffect(() => {
    latestRef.current = { accelData, gyroData, magData, motionData, activeMethod };
  }, [accelData, gyroData, magData, motionData, activeMethod]);

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
      const { accelData, gyroData, magData, motionData, activeMethod } = latestRef.current;
      const payload = {
        type: 'sensor_data',
        method: activeMethod,
        accel: accelData,
        gyro: gyroData,
        motion: motionData,
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
            setAccelData({
              x: data.x || 0,
              y: data.y || 0,
              z: data.z || 0,
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
            setGyroData({
              x: data.x || 0,
              y: data.y || 0,
              z: data.z || 0,
              timestamp: data.timestamp || 0,
              deviceTimestamp: Date.now(),
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

  return { accelData, gyroData, magData, motionData, status, connectionState, activeMethod, connectToServer, disconnectFromServer };
}
