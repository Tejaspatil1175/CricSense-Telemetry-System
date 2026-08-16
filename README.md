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
   - Captures high-frequency 6-DOF (Degrees of Freedom) motion telemetry via onboard Accelerometer and Gyroscope hardware at 50ms intervals (20Hz).
   - Monitors 3-axis linear acceleration (g-force) and 3-axis angular velocity (radians per second).

2. **Game Processing Engine (PC / Laptop)**
   - Receives and parses real-time sensor data packet streams from the bat controller.
   - Computes trajectory dynamics, impact timing, stroke force magnitude, and bat speed (km/h).
   - Renders the interactive Cricket Game simulation on the primary PC or Laptop display.

---

## Technical Specifications

### Data Collection & Frequency
- Sampling Interval: 50 ms (20 Hz refresh rate)
- Accelerometer Metrics: Linear acceleration along X, Y, and Z axes measured in standard gravity units (g)
- Gyroscope Metrics: Pitch, Roll, and Yaw angular velocities measured in radians per second (rad/s)
- Peak Tracking: Continuous real-time detection of maximum force impact and swing velocity

---

## Repository Structure

```
motion sensor game/
├── .gitignore             # Version control exclusions for dependencies and build artifacts
├── README.md              # Project documentation and system architecture guide
└── app/                   # Mobile Sensor Telemetry Client
    ├── App.js             # Real-time sensor acquisition module
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

| Metric | Axis | Physical Significance | Unit |
| :--- | :--- | :--- | :--- |
| Accelerometer X | X-Axis | Lateral swing motion and side edge force | g ($9.81 m/s^2$) |
| Accelerometer Y | Y-Axis | Vertical stroke acceleration along bat face | g ($9.81 m/s^2$) |
| Accelerometer Z | Z-Axis | Forward impact push and elevation angle | g ($9.81 m/s^2$) |
| Gyroscope X | Pitch | Down-the-ground tilt rate | rad/s |
| Gyroscope Y | Roll | Wrist rotation and face angle | rad/s |
| Gyroscope Z | Yaw | Horizontal rotation during hook or pull shots | rad/s |

---

## License

Distributed under the MIT License. Copyright (c) 2026 CricSense Engineering.
