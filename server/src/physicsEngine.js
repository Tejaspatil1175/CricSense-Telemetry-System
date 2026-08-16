let maxRecordedSpeed = 0;
let calibrationProfile = {
  verticalOffsetDeg: 0,
  rollCorrectionDeg: 0,
  pitchCorrectionDeg: 0,
  accuracyScore: 100,
};

function updateCalibrationProfile(profile) {
  if (profile) {
    calibrationProfile = { ...calibrationProfile, ...profile };
  }
}

function analyzeBatPhysics(data) {
  const accel = data.accel || { x: 0, y: 0, z: 0 };
  const gyro = data.gyro || { x: 0, y: 0, z: 0 };
  const motion = data.motion || { alpha: 0, beta: 0, gamma: 0 };
  const mag = data.mag || { heading: 0 };

  const ax = accel.x || 0;
  const ay = accel.y || 0;
  const az = accel.z || 0;
  const totalG = Math.sqrt(ax * ax + ay * ay + az * az);

  const gx = gyro.x || 0;
  const gy = gyro.y || 0;
  const gz = gyro.z || 0;
  const gyroMag = Math.sqrt(gx * gx + gy * gy + gz * gz); // rad/s

  const BAT_RADIUS_METERS = 0.85;
  const tipSpeedMs = gyroMag * BAT_RADIUS_METERS;
  const speedKmh = tipSpeedMs * 3.6;
  const speedMph = tipSpeedMs * 2.23694;

  if (speedKmh > maxRecordedSpeed) {
    maxRecordedSpeed = speedKmh;
  }

  // Apply calibration offsets
  const rawBetaDeg = (motion.beta || 0) * (180 / Math.PI);
  const betaDeg = rawBetaDeg - (calibrationProfile.verticalOffsetDeg || 0);
  const gammaDeg = ((motion.gamma || 0) * (180 / Math.PI)) - (calibrationProfile.rollCorrectionDeg || 0);
  const alphaDeg = (motion.alpha || 0) * (180 / Math.PI);

  let faceAlignment = 'Square Face (Straight)';
  if (gammaDeg > 12) {
    faceAlignment = `Open Face (+${gammaDeg.toFixed(1)}°)`;
  } else if (gammaDeg < -12) {
    faceAlignment = `Closed Face (${gammaDeg.toFixed(1)}°)`;
  } else {
    faceAlignment = `Square Face (${gammaDeg.toFixed(1)}°)`;
  }

  let batPlane = 'Vertical Bat (90°)';
  if (Math.abs(betaDeg) < 35) {
    batPlane = 'Horizontal (Cross-Bat)';
  } else if (Math.abs(betaDeg) < 65) {
    batPlane = 'Angled Bat';
  } else if (Math.abs(betaDeg - 90) < 15) {
    batPlane = 'Vertical Bat (90° Calibrated)';
  }

  const isImpact = totalG > 2.2 || (gyroMag > 4.0 && totalG > 1.8);
  let detectedShot = 'Stance / Ready';

  if (speedKmh > 10 || gyroMag > 2.0) {
    if (batPlane === 'Horizontal (Cross-Bat)') {
      if (gz > 2.0 || Math.abs(alphaDeg) > 40) {
        detectedShot = 'Pull / Hook Shot 💥';
      } else {
        detectedShot = 'Square Cut 🔪';
      }
    } else {
      if (gammaDeg > 15) {
        detectedShot = 'Cover Drive 🚀';
      } else if (gammaDeg < -15) {
        detectedShot = 'On Drive / Flick 🏏';
      } else if (totalG > 3.0) {
        detectedShot = 'Lofted Power Hit ⚡';
      } else {
        detectedShot = 'Straight Drive 🎯';
      }
    }
  } else if (totalG > 1.8) {
    detectedShot = 'Defensive Block / Push 🛡️';
  }

  return {
    accel,
    gyro,
    motion,
    mag,
    totalG: parseFloat(totalG.toFixed(2)),
    gyroMag: parseFloat(gyroMag.toFixed(3)),
    speedKmh: parseFloat(speedKmh.toFixed(1)),
    speedMph: parseFloat(speedMph.toFixed(1)),
    maxSpeedKmh: parseFloat(maxRecordedSpeed.toFixed(1)),
    faceAlignment,
    faceAngleDeg: parseFloat(gammaDeg.toFixed(1)),
    pitchAngleDeg: parseFloat(betaDeg.toFixed(1)),
    batPlane,
    isImpact,
    detectedShot,
    calibrationProfile,
  };
}

module.exports = {
  analyzeBatPhysics,
  updateCalibrationProfile,
};
