# CricSense Telemetry System

A professional high-precision motion tracking system, real-time telemetry pipeline, and 3D simulation engine for physical cricket bats. The system utilizes a multi-tier architecture: a mobile-based IoT hardware telemetry collector, a high-performance Node.js WebSocket receiver server, and a Unity 3D cricket match simulation engine.

---

## 📸 Application Previews & Screenshots

### 💻 PC / Laptop Telemetry Engine & 3D Cricket Match Arena
| Web Receiver Dashboard | 3D Stadium Cricket Match Arena |
| :---: | :---: |
| <img src="preview/web%20home%20page.png" width="380" alt="Web Receiver Dashboard" /> | <img src="preview/games.png" width="380" alt="3D Cricket Match Arena" /> |

### 📱 Mobile Bat Controller Application
| Connection Hub | 3D Bat Stance | Live Telemetry | Settings |
| :---: | :---: | :---: | :---: |
| <img src="preview/home.jpeg" width="180" alt="Connection Hub" /> | <img src="preview/batpage.jpeg" width="180" alt="3D Bat Stance" /> | <img src="preview/telementary.jpeg" width="180" alt="Live Telemetry" /> | <img src="preview/setings.jpeg" width="180" alt="Settings" /> |

---

## 🛠 Tech Stack & Core Technologies

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo_SDK_54-000000?style=for-the-badge&logo=expo&logoColor=white)
![Unity](https://img.shields.io/badge/Unity_3D-000000?style=for-the-badge&logo=unity&logoColor=white)
![C#](https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=csharp&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![WebSockets](https://img.shields.io/badge/WebSockets-Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Android](https://img.shields.io/badge/Android-Supported-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![iOS](https://img.shields.io/badge/iOS-Supported-000000?style=for-the-badge&logo=apple&logoColor=white)

---

## 🏗 System Architecture Overview

The system consists of three primary operational tiers:

1. **Hardware Sensor Bat Controller (Mobile Application - `app/`)**
   - Mounted onto a physical cricket bat or held as a dedicated controller.
   - Modular navigation layout with Header, Tab Views (**Home**, **Data**, **Settings**), and Footer.
   - Captures high-frequency 9-DOF motion telemetry via onboard Accelerometer, Gyroscope, DeviceMotion (Rotation & Orientation), and Magnetometer sensors at customizable intervals (10ms to 100ms, default 50ms / 20Hz).
   - Streams telemetry packets with microsecond hardware timestamps to the PC receiver over Local Wi-Fi WebSockets or public cloud tunnel.

2. **Telemetry Receiver & Web Server (`server/`)**
   - Lightweight Node.js HTTP & WebSocket server operating on port `8080`.
   - Real-time physics engine (`physicsEngine.js`) calculating angular velocity, impact force magnitude, stroke timing, and swing speed (km/h).
   - Embedded Web Dashboard (`index.html`) and HTML5 Web Game Receiver (`game.html`).
   - Integrated LocalTunnel support for remote streaming outside local Wi-Fi networks.

3. **Unity 3D Game Engine & Stadium Simulation (`CricSense/`)**
   - Built with Unity 3D engine and C# scripting.
   - Procedurally generated 3D Cricket Stadium (`StadiumBuilder.cs`) featuring seating stands, floodlight towers, pitch markers, boundary ropes, and grandstands.
   - Motion-controlled Bat Controller system (`BatController.cs`), realistic Ball Physics (`BallPhysics.cs`), Automated Bowling Machine (`BowlingMachine.cs`), Bowler & Batter animations (`BowlerAnimator.cs`, `PlayerAnimator.cs`), and dynamic camera tracking (`CameraController.cs`).

---

## 📂 Repository Structure

```
motion sensor game/
├── README.md              # Project documentation and system architecture guide
├── .gitignore             # Version control exclusions
│
├── app/                   # Mobile Sensor Telemetry Client (React Native + Expo)
│   ├── App.js             # Root container & navigation state
│   ├── app.json           # Expo application configuration
│   ├── babel.config.js    # Babel compiler configuration
│   ├── package.json       # Mobile client dependencies
│   └── src/
│       ├── components/    # Reusable UI components (Header, Footer)
│       ├── hooks/         # Custom React hooks (useSensorData)
│       └── screens/       # Screen views (HomeScreen, DataScreen, SettingsScreen)
│
├── server/                # Telemetry Receiver & Web Dashboard (Node.js + WebSockets)
│   ├── server.js          # Entry point (HTTP + WebSocket server on port 8080)
│   ├── package.json       # Server dependencies (ws, localtunnel)
│   ├── calibrationProfile.json # Bat sensor calibration parameters
│   ├── public/            # Static dashboard assets & web game receiver
│   │   ├── index.html     # Web Telemetry Receiver Dashboard
│   │   ├── game.html      # HTML5 Web Game View
│   │   └── css/ js/       # Dashboard styles and dynamic charts
│   └── src/               # Core server utilities
│       ├── physicsEngine.js   # Stroke force, impact timing & bat speed calculations
│       ├── websocketHandler.js # Client pairing & real-time streaming protocol
│       ├── routes.js          # REST API endpoints & static routing
│       ├── networkUtils.js    # Local IP auto-discovery
│       └── tunnelManager.js   # LocalTunnel public URL provisioner
│
└── CricSense/             # Unity 3D Game Simulation Engine
    ├── CricSense.slnx     # C# solution environment file
    └── Assets/
        ├── Models/        # 3D player rigs and asset models
        ├── Materials/     # Stadium and pitch surface shaders
        └── Scripts/       # Unity C# Core Simulation Logic
            ├── StadiumBuilder.cs   # Procedural 3D Stadium construction
            ├── BatController.cs    # Sensor-driven 3D bat motion handler
            ├── BallPhysics.cs      # Ball trajectory & collision dynamics
            ├── BowlingMachine.cs   # Automated delivery system
            ├── BowlerAnimator.cs   # Bowler run-up & release animation
            ├── PlayerAnimator.cs   # Batter stance & shot execution
            ├── CameraController.cs # Dynamic camera tracking
            ├── HUDManager.cs       # Real-time game score & telemetry overlay
            ├── GameManager.cs      # Match rules & flow state machine
            └── StumpGroup.cs       # Wicket physics & bail collision handler
```

---

## 📡 Telemetry & Motion Pipeline

```
┌────────────────────────┐      WebSocket (ws://)       ┌────────────────────────┐
│  Mobile Bat Controller │ ───────────────────────────► │ Node.js Telemetry Server│
│  (React Native / Expo) │      Local Wi-Fi / Tunnel    │  (Port 8080 Engine)    │
└────────────────────────┘                              └───────────┬────────────┘
                                                                    │
                                                     WebSocket / Direct Telemetry
                                                                    │
                                                                    ▼
                                                        ┌────────────────────────┐
                                                        │ Unity 3D Game Engine   │
                                                        │ (CricSense Stadium)    │
                                                        └────────────────────────┘
```

- **Data Frequency**: Default 20 Hz sampling rate (50ms packets), adjustable down to 10ms (100 Hz).
- **Sensors Captured**: 
  - **Accelerometer**: 3-axis linear acceleration ($\text{m/s}^2$).
  - **Gyroscope**: 3-axis angular rotation speed ($\text{rad/s}$).
  - **DeviceMotion**: Absolute 3D rotation quaternions and Euler orientation angles ($\alpha, \beta, \gamma$).
  - **Magnetometer**: 3-axis magnetic field vector ($\mu T$).
- **Calculated Metrics**: Bat speed ($\text{km/h}$), stroke acceleration magnitude, swing arc angle, impact timestamp precision.

---

## 🚀 Installation & Deployment

### Prerequisites
- **Node.js**: Version 18.0.0 or higher
- **Package Manager**: `npm` or `yarn`
- **Mobile Device**: Expo Go app installed (Android/iOS)
- **Unity Editor**: Unity 2022.3 LTS or newer (for Unity 3D simulation)

---

### 1. Launch Telemetry Receiver Server

```bash
cd server
npm install
npm start
```
* The server will bind to `0.0.0.0:8080`.
* Web Receiver Dashboard: `http://localhost:8080`
* WebSocket Endpoint: `ws://<YOUR_LOCAL_IP>:8080`

---

### 2. Launch Mobile Bat Controller App

```bash
cd app
npm install
npx expo start
```
* Scan the generated QR code using **Expo Go** on your Android or iOS device.
* Open the **Settings** screen in the app, enter your PC's IP address (displayed in the server terminal), and connect.

---

### 3. Launch Unity 3D Cricket Arena (Optional / PC Engine)

1. Open **Unity Hub** and click **Add**.
2. Select the `CricSense/` folder.
3. Open the project in Unity Editor and press **Play** to start the 3D stadium simulation.

---

## ⚙️ Calibration & Configuration

- **Calibration**: Perform bat baseline zeroing via the app's **Settings** screen or through `server/calibrationProfile.json`.
- **Sampling Rate**: Configurable between 10ms and 100ms to balance battery efficiency and motion tracking precision.

---

## 📄 License

Distributed under the MIT License. Copyright (c) 2026 CricSense Engineering.

