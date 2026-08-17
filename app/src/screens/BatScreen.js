import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';

export function BatScreen({ sensorData }) {
  const { accelData, gyroData, magData, motionData, quatData = { w: 1, x: 0, y: 0, z: 0 }, status, connectionState } = sensorData;

  const [baselineRot, setBaselineRot] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [shotHistory, setShotHistory] = useState([]);
  const [lastLogTime, setLastLogTime] = useState(0);

  // Fast Pre-Game Calibration Wizard States
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickStep, setQuickStep] = useState(1);
  const [quickDataset, setQuickDataset] = useState({});

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

  const handleRecordQuickStep = (poseKey) => {
    const pitchDeg = parseFloat((((motionData.beta || 0)) * (180 / Math.PI)).toFixed(1));
    const rollDeg = parseFloat((((motionData.gamma || 0)) * (180 / Math.PI)).toFixed(1));
    const alphaRad = motionData.alpha || 0;

    const frameData = {
      poseKey,
      timestamp: Date.now(),
      angles: { pitchDeg, rollDeg, beta: motionData.beta || 0, gamma: motionData.gamma || 0, alpha: alphaRad },
      accel: { x: parseFloat((accelData.x||0).toFixed(4)), y: parseFloat((accelData.y||0).toFixed(4)), z: parseFloat((accelData.z||0).toFixed(4)) },
      gyro: { x: parseFloat((gyroData.x||0).toFixed(4)), y: parseFloat((gyroData.y||0).toFixed(4)), z: parseFloat((gyroData.z||0).toFixed(4)) },
      quaternion: quatData,
    };

    const newDs = { ...quickDataset, [poseKey]: frameData };
    setQuickDataset(newDs);

    if (poseKey === 'groundTap') {
      setQuickStep(2);
    } else if (poseKey === 'bowlerDir') {
      setBaselineRot({
        alpha: motionData.alpha || 0,
        beta: motionData.beta || 0,
        gamma: motionData.gamma || 0,
      });
      setQuickStep(3);
    } else if (poseKey === 'fullUpLeft') {
      setQuickStep(4);
    } else if (poseKey === 'fullUpRight') {
      setQuickStep(5); // Success!
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Title Header */}
      <View style={styles.titleBox}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>🏏 Bat Motion Analytics</Text>
            <Text style={styles.screenSubtitle}>6-DOF Quaternion Sensor Fusion</Text>
          </View>
          <TouchableOpacity
            style={styles.quickStartBtnMobile}
            onPress={() => { setQuickStep(1); setQuickModalVisible(true); }}
          >
            <Text style={styles.quickStartBtnMobileText}>⚡ FAST PRE-GAME TEST</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2D/3D Bat Handle Visualizer Card */}
      <View style={styles.batVisualCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.goldHeader}>CRICKET BAT ORIENTATION</Text>
          <TouchableOpacity style={styles.calibrateButton} onPress={handleCalibrate}>
            <Text style={styles.calibrateText}>🎯 Reset Stance</Text>
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

      {/* 4-Step Quick Pre-Game Modal */}
      <Modal visible={quickModalVisible} animationType="slide" transparent={true} onRequestClose={() => setQuickModalVisible(false)}>
        <View style={styles.modalOverlayMobile}>
          <View style={styles.modalCardMobile}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTagMobile}>FAST PRE-GAME SETUP</Text>
              <TouchableOpacity onPress={() => setQuickModalVisible(false)}>
                <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: '800' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitleMobile}>⚡ 10-Second Pre-Game Test</Text>
            <Text style={styles.modalDescMobile}>Calibrate 4 angles before starting game:</Text>

            {quickStep === 1 && (
              <View style={styles.stepContentMobile}>
                <Text style={styles.stepIconMobile}>🏏</Text>
                <Text style={styles.stepTitleMobile}>Step 1: Keep Bat at Ground</Text>
                <Text style={styles.stepDescMobile}>Rest your bat flat on the ground in stance position.</Text>
                <TouchableOpacity style={styles.btnCaptureMobile} onPress={() => handleRecordQuickStep('groundTap')}>
                  <Text style={styles.btnCaptureTextMobile}>✓ RECORD GROUND STANCE</Text>
                </TouchableOpacity>
              </View>
            )}

            {quickStep === 2 && (
              <View style={styles.stepContentMobile}>
                <Text style={styles.stepIconMobile}>🎯</Text>
                <Text style={styles.stepTitleMobile}>Step 2: Point Bat Towards Bowler</Text>
                <Text style={styles.stepDescMobile}>Point bat handle straight towards bowler.</Text>
                <TouchableOpacity style={styles.btnCaptureMobile} onPress={() => handleRecordQuickStep('bowlerDir')}>
                  <Text style={styles.btnCaptureTextMobile}>✓ RECORD BOWLER AXIS</Text>
                </TouchableOpacity>
              </View>
            )}

            {quickStep === 3 && (
              <View style={styles.stepContentMobile}>
                <Text style={styles.stepIconMobile}>⬅️</Text>
                <Text style={styles.stepTitleMobile}>Step 3: Point Bat Towards Left</Text>
                <Text style={styles.stepDescMobile}>Point your bat towards your left side.</Text>
                <TouchableOpacity style={styles.btnCaptureMobile} onPress={() => handleRecordQuickStep('fullUpLeft')}>
                  <Text style={styles.btnCaptureTextMobile}>✓ RECORD LEFT VECTOR</Text>
                </TouchableOpacity>
              </View>
            )}

            {quickStep === 4 && (
              <View style={styles.stepContentMobile}>
                <Text style={styles.stepIconMobile}>➡️</Text>
                <Text style={styles.stepTitleMobile}>Step 4: Point Bat Towards Right</Text>
                <Text style={styles.stepDescMobile}>Point your bat towards your right side.</Text>
                <TouchableOpacity style={[styles.btnCaptureMobile, { backgroundColor: '#10b981' }]} onPress={() => handleRecordQuickStep('fullUpRight')}>
                  <Text style={[styles.btnCaptureTextMobile, { color: '#ffffff' }]}>🚀 RECORD RIGHT & START GAME</Text>
                </TouchableOpacity>
              </View>
            )}

            {quickStep === 5 && (
              <View style={styles.stepContentMobile}>
                <Text style={styles.stepIconMobile}>🔥</Text>
                <Text style={[styles.stepTitleMobile, { color: '#00e699' }]}>GAME STARTED!</Text>
                <Text style={styles.stepDescMobile}>Fast calibration saved & applied! Start playing now.</Text>
                <TouchableOpacity style={[styles.btnCaptureMobile, { backgroundColor: '#16a34a' }]} onPress={() => setQuickModalVisible(false)}>
                  <Text style={[styles.btnCaptureTextMobile, { color: '#ffffff' }]}>🎮 START PLAYING NOW</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    backgroundColor: '#F8FAFC',
  },
  titleBox: {
    marginBottom: 2,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  batVisualCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goldHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.8,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  badge: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '800',
    backgroundColor: '#D1E7DD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  calibrateButton: {
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  calibrateText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
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
    borderColor: '#64748B',
    alignItems: 'center',
  },
  handleGripRing: {
    width: 18,
    height: 6,
    backgroundColor: '#10B981',
    borderRadius: 3,
    marginTop: 10,
  },
  batBlade: {
    width: 48,
    height: 100,
    backgroundColor: '#DDB885',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sweetSpotBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sweetSpotText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
  },
  orientationLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#D1E7DD',
  },
  orientLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  speedBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  speedHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 1,
    marginBottom: 4,
  },
  speedValue: {
    fontSize: 40,
    fontWeight: '900',
    color: '#059669',
  },
  speedUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  speedSubRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  subSpeedText: {
    fontSize: 12,
    color: '#64748B',
  },
  greenText: {
    color: '#059669',
    fontWeight: '800',
  },
  blueText: {
    color: '#0284C7',
    fontWeight: '800',
  },
  physicsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  label: {
    fontSize: 13,
    color: '#64748B',
  },
  valGold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
  },
  valWhite: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  valGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  valBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  valRed: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  historyTime: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#64748B',
  },
  historyShot: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  historySpeed: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  quickStartBtnMobile: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickStartBtnMobileText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  modalOverlayMobile: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCardMobile: {
    backgroundColor: '#FFFFFF',
    borderColor: '#10B981',
    borderWidth: 2,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTagMobile: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalTitleMobile: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalDescMobile: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  stepContentMobile: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  stepIconMobile: {
    fontSize: 40,
    marginBottom: 8,
  },
  stepTitleMobile: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  stepDescMobile: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  btnCaptureMobile: {
    backgroundColor: '#10B981',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCaptureTextMobile: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
