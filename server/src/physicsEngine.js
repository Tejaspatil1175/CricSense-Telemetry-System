const fs = require('fs');
const path = require('path');

let maxRecordedSpeed = 0;
let calibrationProfile = {
  verticalOffsetDeg: 0,
  rollCorrectionDeg: 0,
  pitchCorrectionDeg: 0,
  accuracyScore: 100,
};

// Try loading saved calibrationProfile.json dataset from disk
const calFilePath = path.join(__dirname, '..', 'calibrationProfile.json');
try {
  if (fs.existsSync(calFilePath)) {
    const fileContent = fs.readFileSync(calFilePath, 'utf8');
    const parsed = JSON.parse(fileContent);
    calibrationProfile = { ...calibrationProfile, ...parsed };
    console.log('[PHYSICS ENGINE] Loaded custom stadium calibration dataset successfully!');
  }
} catch (e) { }

function updateCalibrationProfile(profile) {
  if (profile) {
    calibrationProfile = { ...calibrationProfile, ...profile };
    try {
      fs.writeFileSync(calFilePath, JSON.stringify(calibrationProfile, null, 2));
    } catch (e) { }
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

  // Bowler baseline reference from dataset
  const bowlerAlpha = calibrationProfile.bowlerDir ? calibrationProfile.bowlerDir.angles.alpha : 0;
  const skyPitch = calibrationProfile.fullUpSky ? calibrationProfile.fullUpSky.angles.pitchDeg : 83.3;

  // Apply calibration offsets
  const rawBetaDeg = (motion.beta || 0) * (180 / Math.PI);
  const betaDeg = rawBetaDeg - (calibrationProfile.verticalOffsetDeg || 0);
  const gammaDeg = ((motion.gamma || 0) * (180 / Math.PI)) - (calibrationProfile.rollCorrectionDeg || 0);

  // Calculate heading relative to Bowler Direction (0 deg = Towards Bowler)
  const rawAlphaRad = motion.alpha || 0;
  let relAlphaRad = (rawAlphaRad - bowlerAlpha) + Math.PI;
  let relAlphaDeg = relAlphaRad * (180 / Math.PI);
  while (relAlphaDeg > 180) relAlphaDeg -= 360;
  while (relAlphaDeg < -180) relAlphaDeg += 360;

  let faceAlignment = 'Square Face (Straight)';
  if (gammaDeg > 12) {
    faceAlignment = `Open Face (+${gammaDeg.toFixed(1)}°)`;
  } else if (gammaDeg < -12) {
    faceAlignment = `Closed Face (${gammaDeg.toFixed(1)}°)`;
  } else {
    faceAlignment = `Square Face (${gammaDeg.toFixed(1)}°)`;
  }

  let batPlane = 'Vertical Bat';
  if (Math.abs(betaDeg) < 35) {
    batPlane = 'Horizontal (Cross-Bat)';
  } else if (Math.abs(betaDeg) < 65) {
    batPlane = 'Angled Bat';
  } else if (Math.abs(betaDeg - skyPitch) < 20 || Math.abs(betaDeg - 90) < 20) {
    batPlane = 'Vertical Bat (Skyward Calibrated)';
  }

  const isImpact = totalG > 2.2 || (gyroMag > 4.0 && totalG > 1.8);
  let detectedShot = 'Stance / Ready';

  // Ground Tap Stance Reset Check
  if (ay < -0.75 && Math.abs(rawBetaDeg - (-83.5)) < 25) {
    detectedShot = 'Stance (Ground Tap) 🏏';
  } else if (speedKmh > 8 || gyroMag > 1.5) {
    // 360-Degree Stadium Shot Classifier using User Calibration Dataset
    if (Math.abs(relAlphaDeg) > 135) {
      detectedShot = 'Ramp / Scoop Shot (Back Stadium) 🌌';
    } else if (relAlphaDeg > 40) {
      if (batPlane === 'Horizontal (Cross-Bat)') {
        detectedShot = 'Square Cut (Off-Side) 🔪';
      } else {
        detectedShot = 'Cover Drive (Left Stadium) 🚀';
      }
    } else if (relAlphaDeg < -40) {
      if (batPlane === 'Horizontal (Cross-Bat)') {
        detectedShot = 'Pull / Hook Shot (On-Side) 💥';
      } else {
        detectedShot = 'On-Drive / Flick (Right Stadium) 🏏';
      }
    } else {
      if (rawBetaDeg > 65) {
        detectedShot = 'Lofted Straight Hit (Skyward) ⚡';
      } else {
        detectedShot = 'Straight Drive (Toward Bowler) 🎯';
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
    relHeadingDeg: parseFloat(relAlphaDeg.toFixed(1)),
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
