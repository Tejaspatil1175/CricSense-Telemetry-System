import React from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';

export function DataScreen({ sensorData }) {
  const { accelData, gyroData, magData, motionData, quatData = { w: 1, x: 0, y: 0, z: 0 }, status } = sensorData;

  // Real-Time Bat Physics Engine Calculations
  const ax = accelData.x || 0;
  const ay = accelData.y || 0;
  const az = accelData.z || 0;
  const totalG = Math.sqrt(ax * ax + ay * ay + az * az);

  const gx = gyroData.x || 0;
  const gy = gyroData.y || 0;
  const gz = gyroData.z || 0;
  const gyroMag = Math.sqrt(gx * gx + gy * gy + gz * gz);

  const BAT_RADIUS_METERS = 0.85;
  const tipSpeedMs = gyroMag * BAT_RADIUS_METERS;
  const speedKmh = (tipSpeedMs * 3.6).toFixed(1);
  const speedMph = (tipSpeedMs * 2.23694).toFixed(1);

  const betaDeg = ((motionData.beta || 0) * (180 / Math.PI)).toFixed(1);
  const gammaDeg = ((motionData.gamma || 0) * (180 / Math.PI)).toFixed(1);
  const alphaDeg = ((motionData.alpha || 0) * (180 / Math.PI)).toFixed(1);

  let faceAlignment = 'Square Face';
  if (parseFloat(gammaDeg) > 12) faceAlignment = `Open Face (+${gammaDeg}°)`;
  else if (parseFloat(gammaDeg) < -12) faceAlignment = `Closed Face (${gammaDeg}°)`;
  else faceAlignment = `Square Face (${gammaDeg}°)`;

  let batPlane = 'Vertical Bat';
  if (Math.abs(parseFloat(betaDeg)) < 35) batPlane = 'Horizontal (Cross-Bat)';
  else if (Math.abs(parseFloat(betaDeg)) < 65) batPlane = 'Angled Bat';

  const isImpact = totalG > 2.2 || (gyroMag > 4.0 && totalG > 1.8);
  let detectedShot = 'Stance / Ready';

  if (parseFloat(speedKmh) > 10 || gyroMag > 2.0) {
    if (batPlane === 'Horizontal (Cross-Bat)') {
      if (gz > 2.0 || Math.abs(parseFloat(alphaDeg)) > 40) detectedShot = 'Pull / Hook Shot 💥';
      else detectedShot = 'Square Cut 🔪';
    } else {
      if (parseFloat(gammaDeg) > 15) detectedShot = 'Cover Drive 🚀';
      else if (parseFloat(gammaDeg) < -15) detectedShot = 'On Drive / Flick 🏏';
      else if (totalG > 3.0) detectedShot = 'Lofted Power Hit ⚡';
      else detectedShot = 'Straight Drive 🎯';
    }
  } else if (totalG > 1.8) {
    detectedShot = 'Defensive Block / Push 🛡️';
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleBox}>
        <Text style={styles.screenTitle}>Real-Time Sensor Telemetry</Text>
        <Text style={styles.screenSubtitle}>Streaming 9-DOF hardware sensor metrics & Bat Physics</Text>
      </View>

      {/* Bat Dynamics & Motion Engine Card */}
      <View style={[styles.card, styles.engineCard]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardHeader, styles.goldHeader]}>🏏 BAT MOTION & PHYSICS ENGINE</Text>
          <Text style={styles.goldBadge}>LIVE METRICS</Text>
        </View>

        <View style={styles.speedDisplayBox}>
          <Text style={styles.speedLabel}>SWING VELOCITY</Text>
          <Text style={styles.speedText}>
            {speedKmh} <Text style={styles.unitText}>km/h</Text>
          </Text>
          <Text style={styles.speedSubText}>{speedMph} mph</Text>
        </View>

        <View style={styles.physicsRow}>
          <Text style={styles.physicsLabel}>Bat Face Alignment:</Text>
          <Text style={styles.physicsValGold}>{faceAlignment}</Text>
        </View>

        <View style={styles.physicsRow}>
          <Text style={styles.physicsLabel}>Bat Plane / Handle Angle:</Text>
          <Text style={styles.physicsVal}>{batPlane} ({betaDeg}°)</Text>
        </View>

        <View style={styles.physicsRow}>
          <Text style={styles.physicsLabel}>Cricket Shot Classifier:</Text>
          <Text style={styles.physicsValGreen}>{detectedShot}</Text>
        </View>

        <View style={styles.physicsRow}>
          <Text style={styles.physicsLabel}>Ball Impact Force:</Text>
          <Text style={isImpact ? styles.physicsValImpact : styles.physicsValBlue}>
            {isImpact ? `💥 IMPACT DETECTED! (${totalG.toFixed(2)} g)` : `Normal Motion (${totalG.toFixed(2)} g)`}
          </Text>
        </View>

        <View style={styles.divider} />
        <Text style={styles.meta}>Madgwick Quaternion (Gimbal-Lock Free):</Text>
        <Text style={styles.meta}>
          W: {quatData.w.toFixed(4)} | X: {quatData.x.toFixed(4)} | Y: {quatData.y.toFixed(4)} | Z: {quatData.z.toFixed(4)}
        </Text>
      </View>

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
        <Text style={styles.meta}>Hardware TS: {accelData.timestamp.toFixed(0)} ms</Text>
        <Text style={styles.meta}>Device Clock: {accelData.deviceTimestamp} ms</Text>
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
        <Text style={styles.meta}>Hardware TS: {gyroData.timestamp.toFixed(0)} ms</Text>
        <Text style={styles.meta}>Device Clock: {gyroData.deviceTimestamp} ms</Text>
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
        <Text style={styles.meta}>Hardware TS: {motionData.timestamp.toFixed(0)} ms</Text>
        <Text style={styles.meta}>Device Clock: {motionData.deviceTimestamp} ms</Text>
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
        <Text style={styles.meta}>Hardware TS: {magData.timestamp.toFixed(0)} ms</Text>
        <Text style={styles.meta}>Device Clock: {magData.deviceTimestamp} ms</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    backgroundColor: '#0a0d14',
  },
  titleBox: {
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  card: {
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
    fontSize: 13,
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
    fontSize: 14,
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
  engineCard: {
    borderColor: '#eab308',
    backgroundColor: '#16150d',
  },
  goldHeader: {
    color: '#eab308',
  },
  goldBadge: {
    fontSize: 10,
    color: '#eab308',
    fontWeight: '800',
    backgroundColor: '#3b2d13',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  speedDisplayBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  speedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#eab308',
    letterSpacing: 1,
    marginBottom: 2,
  },
  speedText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#f8fafc',
  },
  unitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#eab308',
  },
  speedSubText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  physicsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  physicsLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  physicsValGold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#eab308',
  },
  physicsVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  physicsValGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00e699',
  },
  physicsValBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },
  physicsValImpact: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ef4444',
  },
});
