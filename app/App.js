import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Accelerometer, Gyroscope, Magnetometer, DeviceMotion } from 'expo-sensors';

export default function App() {
  // Accelerometer Telemetry
  const [accelData, setAccelData] = useState({
    x: 0,
    y: 0,
    z: 0,
    timestamp: 0,
    deviceTimestamp: 0,
  });

  // Gyroscope Telemetry
  const [gyroData, setGyroData] = useState({
    x: 0,
    y: 0,
    z: 0,
    timestamp: 0,
    deviceTimestamp: 0,
  });

  // Rotation / Orientation Sensor Telemetry (DeviceMotion)
  const [motionData, setMotionData] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
    orientation: 0,
    timestamp: 0,
    deviceTimestamp: 0,
  });

  // Magnetometer Telemetry
  const [magData, setMagData] = useState({
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    timestamp: 0,
    deviceTimestamp: 0,
  });

  // Sensor Accuracy & Availability Status
  const [status, setStatus] = useState({
    accel: 'Checking...',
    gyro: 'Checking...',
    mag: 'Checking...',
    motion: 'Checking...',
  });

  useEffect(() => {
    let accelSub, gyroSub, magSub, motionSub;

    const setupSensors = async () => {
      // 1. Accelerometer Setup
      try {
        const isAccelAvail = await Accelerometer.isAvailableAsync();
        setStatus(prev => ({ ...prev, accel: isAccelAvail ? 'Available (High Accuracy)' : 'Unavailable' }));
        if (isAccelAvail) {
          Accelerometer.setUpdateInterval(50);
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
      } catch (err) {
        setStatus(prev => ({ ...prev, accel: 'Error' }));
      }

      // 2. Gyroscope Setup
      try {
        const isGyroAvail = await Gyroscope.isAvailableAsync();
        setStatus(prev => ({ ...prev, gyro: isGyroAvail ? 'Available (High Accuracy)' : 'Unavailable' }));
        if (isGyroAvail) {
          Gyroscope.setUpdateInterval(50);
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
      } catch (err) {
        setStatus(prev => ({ ...prev, gyro: 'Error' }));
      }

      // 3. Magnetometer Setup
      try {
        const isMagAvail = await Magnetometer.isAvailableAsync();
        setStatus(prev => ({ ...prev, mag: isMagAvail ? 'Available (Calibrated)' : 'Unavailable' }));
        if (isMagAvail) {
          Magnetometer.setUpdateInterval(50);
          magSub = Magnetometer.addListener(data => {
            const x = data.x || 0;
            const y = data.y || 0;
            const z = data.z || 0;
            const headingAngle = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
            setMagData({
              x,
              y,
              z,
              heading: headingAngle,
              timestamp: data.timestamp || 0,
              deviceTimestamp: Date.now(),
            });
          });
        }
      } catch (err) {
        setStatus(prev => ({ ...prev, mag: 'Error' }));
      }

      // 4. DeviceMotion (Rotation & Orientation) Setup
      try {
        const isMotionAvail = await DeviceMotion.isAvailableAsync();
        setStatus(prev => ({ ...prev, motion: isMotionAvail ? 'Available (Tracking)' : 'Unavailable' }));
        if (isMotionAvail) {
          DeviceMotion.setUpdateInterval(50);
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
      } catch (err) {
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
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CricSense Bat Controller</Text>
        <Text style={styles.headerSubtitle}>Multi-Sensor Real-Time Telemetry Collector</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Accelerometer Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeader}>ACCELEROMETER</Text>
            <Text style={styles.badge}>{status.accel}</Text>
          </View>
          <Text style={styles.value}>X: {accelData.x.toFixed(4)} g</Text>
          <Text style={styles.value}>Y: {accelData.y.toFixed(4)} g</Text>
          <Text style={styles.value}>Z: {accelData.z.toFixed(4)} g</Text>
          <View style={styles.divider} />
          <Text style={styles.meta}>Sensor TS: {accelData.timestamp.toFixed(0)}</Text>
          <Text style={styles.meta}>Device TS: {accelData.deviceTimestamp} ms</Text>
        </View>

        {/* Gyroscope Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeader}>GYROSCOPE</Text>
            <Text style={styles.badge}>{status.gyro}</Text>
          </View>
          <Text style={styles.value}>X (Pitch): {gyroData.x.toFixed(4)} rad/s</Text>
          <Text style={styles.value}>Y (Roll): {gyroData.y.toFixed(4)} rad/s</Text>
          <Text style={styles.value}>Z (Yaw): {gyroData.z.toFixed(4)} rad/s</Text>
          <View style={styles.divider} />
          <Text style={styles.meta}>Sensor TS: {gyroData.timestamp.toFixed(0)}</Text>
          <Text style={styles.meta}>Device TS: {gyroData.deviceTimestamp} ms</Text>
        </View>

        {/* Rotation / Orientation Sensor Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeader}>ROTATION / ORIENTATION</Text>
            <Text style={styles.badge}>{status.motion}</Text>
          </View>
          <Text style={styles.value}>Alpha (Z-rot): {motionData.alpha.toFixed(4)} rad</Text>
          <Text style={styles.value}>Beta (X-rot): {motionData.beta.toFixed(4)} rad</Text>
          <Text style={styles.value}>Gamma (Y-rot): {motionData.gamma.toFixed(4)} rad</Text>
          <Text style={styles.value}>Orientation: {motionData.orientation}°</Text>
          <View style={styles.divider} />
          <Text style={styles.meta}>Sensor TS: {motionData.timestamp.toFixed(0)}</Text>
          <Text style={styles.meta}>Device TS: {motionData.deviceTimestamp} ms</Text>
        </View>

        {/* Magnetometer Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeader}>MAGNETOMETER</Text>
            <Text style={styles.badge}>{status.mag}</Text>
          </View>
          <Text style={styles.value}>X: {magData.x.toFixed(2)} µT</Text>
          <Text style={styles.value}>Y: {magData.y.toFixed(2)} µT</Text>
          <Text style={styles.value}>Z: {magData.z.toFixed(2)} µT</Text>
          <Text style={styles.value}>Heading: {magData.heading.toFixed(1)}°</Text>
          <View style={styles.divider} />
          <Text style={styles.meta}>Sensor TS: {magData.timestamp.toFixed(0)}</Text>
          <Text style={styles.meta}>Device TS: {magData.deviceTimestamp} ms</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
  header: {
    paddingTop: 18,
    paddingBottom: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a202c',
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  scroll: {
    padding: 16,
    gap: 14,
  },
  card: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  badge: {
    fontSize: 11,
    color: '#00e699',
    fontWeight: '600',
    backgroundColor: '#132e27',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  value: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#f8fafc',
    marginVertical: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#1f2937',
    marginVertical: 10,
  },
  meta: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#64748b',
    marginVertical: 1,
  },
});



