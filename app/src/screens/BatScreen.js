import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export function BatScreen({ sensorData }) {
  const { accelData, gyroData, magData, motionData, quatData = { w: 1, x: 0, y: 0, z: 0 }, status, connectionState } = sensorData;

  const [baselineRot, setBaselineRot] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [shotHistory, setShotHistory] = useState([]);
  const [lastLogTime, setLastLogTime] = useState(0);

  // Real-Time Bat Physics Engine Calculations
  const ax = accelData.x || 0;
  const ay = accelData.y || 0;
  const az = accelData.z || 0;
  const totalG = Math.sqrt(ax * ax + ay * ay + az * az);

  const gx = gyroData.x || 0;
  const gy = gyroData.y || 0;
  const gz = gyroData.z || 0;
  const gyroMag = Math.sqrt(gx * gx + gy * gy + gz * gz); // rad/s

  const BAT_RADIUS_METERS = 0.85;
  const tipSpeedMs = gyroMag * BAT_RADIUS_METERS;
  const speedKmh = tipSpeedMs * 3.6;
  const speedMph = tipSpeedMs * 2.23694;

  useEffect(() => {
    if (speedKmh > maxSpeed) {
      setMaxSpeed(speedKmh);
    }
  }, [speedKmh]);

  // Relative rotation angles compared to baseline stance
  const relAlpha = ((motionData.alpha || 0) - baselineRot.alpha) * (180 / Math.PI);
  const relBeta = ((motionData.beta || 0) - baselineRot.beta) * (180 / Math.PI);
  const relGamma = ((motionData.gamma || 0) - baselineRot.gamma) * (180 / Math.PI);

  const betaDeg = relBeta.toFixed(1);
  const gammaDeg = relGamma.toFixed(1);
  const alphaDeg = relAlpha.toFixed(1);

  let faceAlignment = 'Square Face';
  if (parseFloat(gammaDeg) > 12) faceAlignment = `Open Face (+${gammaDeg}°)`;
  else if (parseFloat(gammaDeg) < -12) faceAlignment = `Closed Face (${gammaDeg}°)`;
  else faceAlignment = `Square Face (${gammaDeg}°)`;

  let batPlane = 'Vertical Bat';
  if (Math.abs(parseFloat(betaDeg)) < 35) batPlane = 'Horizontal (Cross-Bat)';
  else if (Math.abs(parseFloat(betaDeg)) < 65) batPlane = 'Angled Bat';

  const isImpact = totalG > 2.2 || (gyroMag > 4.0 && totalG > 1.8);
  let detectedShot = 'Stance / Ready';

  if (speedKmh > 10 || gyroMag > 2.0) {
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

  // Auto-log shot history
  useEffect(() => {
    const now = Date.now();
    if (speedKmh > 12 && (now - lastLogTime > 1500) && detectedShot !== 'Stance / Ready') {
      setLastLogTime(now);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setShotHistory(prev => [
        { id: now.toString(), time: timeStr, shot: detectedShot, speed: speedKmh.toFixed(1), impact: totalG.toFixed(2) },
        ...prev.slice(0, 7)
      ]);
    }
  }, [speedKmh, detectedShot]);

  const handleCalibrate = () => {
    setBaselineRot({
      alpha: motionData.alpha || 0,
      beta: motionData.beta || 0,
      gamma: motionData.gamma || 0,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Title Header */}
      <View style={styles.titleBox}>
        <Text style={styles.screenTitle}>🏏 Bat Motion & Handle Analytics</Text>
        <Text style={styles.screenSubtitle}>6-DOF Quaternion Sensor Fusion & Swing Metrics</Text>
      </View>

      {/* 2D/3D Bat Handle Visualizer Card */}
      <View style={styles.batVisualCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.goldHeader}>CRICKET BAT ORIENTATION</Text>
          <TouchableOpacity style={styles.calibrateButton} onPress={handleCalibrate}>
            <Text style={styles.calibrateText}>🎯 Reset Neutral Stance</Text>
          </TouchableOpacity>
        </View>

        {/* Visual Bat Graphic */}
        <View style={styles.batContainer}>
          <View style={[
            styles.batShape,
            {
              transform: [
                { rotate: `${Math.min(Math.max(-relGamma, -45), 45)}deg` },
                { rotateZ: `${Math.min(Math.max(-relAlpha, -45), 45)}deg` }
              ]
            }
          ]}>
            {/* Rubber Handle */}
            <View style={styles.batHandle}>
              <View style={styles.handleGripRing} />
            </View>
            {/* Wooden Blade */}
            <View style={styles.batBlade}>
              <View style={styles.sweetSpotBadge}>
                <Text style={styles.sweetSpotText}>SWEET SPOT</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.orientationLabels}>
          <Text style={styles.orientLabel}>Pitch: {betaDeg}°</Text>
          <Text style={styles.orientLabel}>Roll (Face): {gammaDeg}°</Text>
          <Text style={styles.orientLabel}>Yaw: {alphaDeg}°</Text>
        </View>
      </View>

      {/* Swing Speed & Physics Display Box */}
      <View style={styles.speedBox}>
        <Text style={styles.speedHeader}>BAT SWING SPEED</Text>
        <Text style={styles.speedValue}>
          {speedKmh.toFixed(1)} <Text style={styles.speedUnit}>km/h</Text>
        </Text>
        <View style={styles.speedSubRow}>
          <Text style={styles.subSpeedText}>Max Peak: <Text style={styles.greenText}>{maxSpeed.toFixed(1)} km/h</Text></Text>
          <Text style={styles.subSpeedText}>Speed: <Text style={styles.blueText}>{speedMph.toFixed(1)} mph</Text></Text>
        </View>
      </View>

      {/* Physics Analytics Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeader}>BAT DYNAMICS & ALIGNMENT</Text>
          <Text style={styles.badge}>REALTIME</Text>
        </View>

        <View style={styles.physicsRow}>
          <Text style={styles.label}>Bat Face Alignment:</Text>
          <Text style={styles.valGold}>{faceAlignment}</Text>
        </View>

        <View style={styles.physicsRow}>
          <Text style={styles.label}>Bat Plane / Handle:</Text>
          <Text style={styles.valWhite}>{batPlane} ({betaDeg}°)</Text>
        </View>

        <View style={styles.physicsRow}>
          <Text style={styles.label}>Cricket Shot Classifier:</Text>
          <Text style={styles.valGreen}>{detectedShot}</Text>
        </View>

        <View style={styles.physicsRow}>
          <Text style={styles.label}>Ball Impact Force:</Text>
          <Text style={isImpact ? styles.valRed : styles.valBlue}>
            {isImpact ? `💥 IMPACT DETECTED! (${totalG.toFixed(2)} g)` : `Normal Motion (${totalG.toFixed(2)} g)`}
          </Text>
        </View>
      </View>

      {/* Recent Shot History Table */}
      {shotHistory.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardHeader}>📜 RECENT SHOT HISTORY</Text>
          {shotHistory.map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <Text style={styles.historyTime}>{item.time}</Text>
              <Text style={styles.historyShot}>{item.shot}</Text>
              <Text style={styles.historySpeed}>{item.speed} km/h</Text>
            </View>
          ))}
        </View>
      )}
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
    marginBottom: 2,
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
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  batVisualCard: {
    backgroundColor: '#16150d',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eab308',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goldHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#eab308',
    letterSpacing: 0.8,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  badge: {
    fontSize: 10,
    color: '#00e699',
    fontWeight: '700',
    backgroundColor: '#132e27',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  calibrateButton: {
    backgroundColor: '#3b2d13',
    borderColor: '#eab308',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  calibrateText: {
    color: '#eab308',
    fontSize: 11,
    fontWeight: '800',
  },
  batContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  batShape: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  batHandle: {
    width: 14,
    height: 60,
    backgroundColor: '#334155',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#64748b',
    alignItems: 'center',
  },
  handleGripRing: {
    width: 18,
    height: 6,
    backgroundColor: '#eab308',
    borderRadius: 3,
    marginTop: 10,
  },
  batBlade: {
    width: 48,
    height: 100,
    backgroundColor: '#ddb885',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 2,
    borderColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sweetSpotBadge: {
    backgroundColor: 'rgba(22, 163, 74, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sweetSpotText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '800',
  },
  orientationLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#262112',
  },
  orientLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  speedBox: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  speedHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#eab308',
    letterSpacing: 1,
    marginBottom: 4,
  },
  speedValue: {
    fontSize: 40,
    fontWeight: '900',
    color: '#f8fafc',
  },
  speedUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#eab308',
  },
  speedSubRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  subSpeedText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  greenText: {
    color: '#00e699',
    fontWeight: '700',
  },
  blueText: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  physicsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
  },
  valGold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#eab308',
  },
  valWhite: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  valGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00e699',
  },
  valBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },
  valRed: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ef4444',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  historyTime: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#64748b',
  },
  historyShot: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00e699',
  },
  historySpeed: {
    fontSize: 12,
    fontWeight: '700',
    color: '#eab308',
  },
});
