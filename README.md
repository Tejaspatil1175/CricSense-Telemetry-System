# CricSense Telemetry System

A professional high-precision motion tracking system and real-time telemetry pipeline for physical cricket bats. The system utilizes a dual-tier architecture: a mobile-based IoT hardware telemetry collector and a high-performance PC/Laptop game processing engine.

---

## Tech Stack & Core Technologies

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo_SDK_54-000000?style=for-the-badge&logo=expo&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Android](https://img.shields.io/badge/Android-Supported-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![iOS](https://img.shields.io/badge/iOS-Supported-000000?style=for-the-badge&logo=apple&logoColor=white)
![Babel](https://img.shields.io/badge/Babel-F9DC3E?style=for-the-badge&logo=babel&logoColor=black)

---

## System Architecture Overview

The system consists of two primary operational components:

1. **Hardware Sensor Bat Controller (Mobile Application)**
   - Mounted onto a physical cricket bat or held as a dedicated controller.
   - Captures high-frequency 6-DOF and 9-DOF motion telemetry via onboard sensors at 50ms intervals (20Hz).
   - Collects Accelerometer, Gyroscope, DeviceMotion (Rotation & Orientation), and Magnetometer streams.
   - Attaches high-resolution hardware timestamps and device execution timestamps to every sensor frame.

2. **Game Processing Engine (PC / Laptop)**
   - Receives and parses real-time sensor data packet streams from the bat controller.
   - Computes orientation compensation, trajectory dynamics, impact timing, stroke force magnitude, and bat speed (km/h).
   - Renders the interactive Cricket Game simulation on the primary PC or Laptop display.

---

## Technical Specifications

### Data Collection & Sensor Pipeline

- **Sampling Interval**: 50 ms (20 Hz refresh rate)
- **Accelerometer**: 3-axis linear acceleration (X, Y, Z) in g-force ($9.81 m/s^2$) + hardware timestamp
- **Gyroscope**: 3-axis angular velocity (Pitch, Roll, Yaw) in rad/s + hardware timestamp
- **DeviceMotion (Rotation & Orientation)**: 3-axis Euler rotation angles ($\alpha, \beta, \gamma$) in radians and 360° screen orientation to compensate for bat grip orientation
- **Magnetometer**: 3-axis magnetic field strength (X, Y, Z in $\mu T$) and absolute compass heading angle (0° - 360°)
- **Sensor Status & Accuracy**: Real-time status reporting per sensor channel (Available, Tracking, Calibrated, Unavailable)
- **High-Resolution Timestamps**: Microsecond-precision hardware timestamps paired with high-resolution device epoch timestamps (`Date.now()`)

---

## Repository Structure

```
motion sensor game/
├── .gitignore             # Version control exclusions for dependencies and build artifacts
├── README.md              # Project documentation and system architecture guide
└── app/                   # Mobile Sensor Telemetry Client
    ├── App.js             # Multi-sensor telemetry acquisition module
    ├── app.json           # Expo application configuration
    ├── babel.config.js    # Babel compiler configuration
    └── package.json       # Dependencies and build scripts
```

---

## Installation & Deployment

### Prerequisites
- Node.js (Version 18.0.0 or higher)
- npm or yarn package manager
- Expo Go mobile application for physical sensor acquisition

### Setup Instructions

1. Navigate to the mobile client directory:
   ```bash
   cd app
   ```

2. Install required dependencies:
   ```bash
   npm install
   ```

3. Launch the sensor acquisition server:
   ```bash
   npx expo start
   ```

4. Pair the mobile controller device by scanning the QR code using Expo Go.

---

## Sensor Telemetry Reference

| Sensor Channel | Metric | Description | Unit / Format |
| :--- | :--- | :--- | :--- |
| **Accelerometer** | `x, y, z` | 3-axis linear acceleration | g ($9.81 m/s^2$) |
| **Accelerometer** | `timestamp` | Hardware event timestamp | ms |
| **Gyroscope** | `x, y, z` | Angular velocity (Pitch, Roll, Yaw) | rad/s |
| **Gyroscope** | `timestamp` | Hardware event timestamp | ms |
| **DeviceMotion** | `alpha, beta, gamma` | Euler rotation angles | radians |
| **DeviceMotion** | `orientation` | Physical device screen orientation angle | degrees (°) |
| **DeviceMotion** | `timestamp` | Hardware motion event timestamp | ms |
| **Magnetometer** | `x, y, z` | Magnetic field density | $\mu T$ |
| **Magnetometer** | `heading` | Absolute magnetic compass heading angle | degrees (0° - 360°) |
| **Magnetometer** | `timestamp` | Hardware compass event timestamp | ms |
| **Channel Status** | `status` | Accuracy and availability state | String |
| **Device Clock** | `deviceTimestamp` | High-resolution epoch timestamp | ms |

---

## License

Distributed under the MIT License. Copyright (c) 2026 CricSense Engineering.
