import { useState, useEffect, useRef, useCallback } from 'react';
import { Accelerometer, Gyroscope, Magnetometer, DeviceMotion } from 'expo-sensors';

export function useSensorData(samplingInterval = 50, serverIp = '192.168.1.100', serverPort = '8080') {
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0, timestamp: 0, deviceTimestamp: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0, timestamp: 0, deviceTimestamp: 0 });
  const [magData, setMagData] = useState({ x: 0, y: 0, z: 0, heading: 0, timestamp: 0, deviceTimestamp: 0 });
  const [motionData, setMotionData] = useState({ alpha: 0, beta: 0, gamma: 0, orientation: 0, timestamp: 0, deviceTimestamp: 0 });

  const [connectionState, setConnectionState] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [activeMethod, setActiveMethod] = useState('wifi');

  const [status, setStatus] = useState({
    accel: 'Checking...',
    gyro: 'Checking...',
    mag: 'Checking...',
    motion: 'Checking...',
    stream: 'Disconnected',
  });

  const latestRef = useRef({ accelData, gyroData, magData, motionData, activeMethod });
  useEffect(() => {
    latestRef.current = { accelData, gyroData, magData, motionData, activeMethod };
  }, [accelData, gyroData, magData, motionData, activeMethod]);

  const disconnectFromServer = useCallback(async () => {
    setConnectionState('disconnected');
    setStatus(prev => ({ ...prev, stream: 'Disconnected' }));
    if (serverIp) {
      try {
        await fetch(`http://${serverIp}:${serverPort}/disconnect`, { method: 'POST' });
      } catch (e) {}
    }
  }, [serverIp, serverPort]);

  const connectToServer = useCallback(async (method = 'wifi') => {
    if (!serverIp) return;
    setActiveMethod(method);
    setConnectionState('connecting');
    setStatus(prev => ({ ...prev, stream: `Connecting via ${method.toUpperCase()}...` }));

    try {
      const connectEndpoint = `http://${serverIp}:${serverPort}/connect`;
      const res = await fetch(connectEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, timestamp: Date.now() }),
      });

      if (res.ok) {
        setConnectionState('connecting');
      } else {
        setConnectionState('error');
        setStatus(prev => ({ ...prev, stream: 'Server Connection Refused' }));
      }
    } catch (err) {
      setConnectionState('error');
      setStatus(prev => ({ ...prev, stream: 'Unable to Reach Server (Check IP)' }));
    }
  }, [serverIp, serverPort]);

  // Stream data to laptop server over HTTP POST only when connecting or connected
  useEffect(() => {
    if (!serverIp || (connectionState !== 'connecting' && connectionState !== 'connected')) {
      return;
    }

    const endpoint = `http://${serverIp}:${serverPort}/telemetry`;
    const transmitTimer = setInterval(async () => {
      const { accelData, gyroData, magData, motionData, activeMethod } = latestRef.current;
      const payload = {
        method: activeMethod,
        accel: accelData,
        gyro: gyroData,
        motion: motionData,
        mag: magData,
        deviceTimestamp: Date.now(),
      };

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          setConnectionState('connected');
          setStatus(prev => ({ ...prev, stream: 'Connected & Streaming' }));
        } else {
          setStatus(prev => ({ ...prev, stream: 'Server Error' }));
        }
      } catch (err) {
        setConnectionState('disconnected');
        setStatus(prev => ({ ...prev, stream: 'Disconnected (Lost Connection)' }));
      }
    }, samplingInterval);

    return () => clearInterval(transmitTimer);
  }, [serverIp, serverPort, samplingInterval, connectionState]);

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

      // 4. DeviceMotion (Rotation & Orientation)
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
