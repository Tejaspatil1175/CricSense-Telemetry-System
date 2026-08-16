import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { parseServerUrl } from '../hooks/useSensorData';

export function HomeScreen({
  onNavigateToData,
  onNavigateToSettings,
  selectedMethod = 'wifi',
  onSelectMethod,
  connectionState = 'disconnected',
  connectToServer,
  disconnectFromServer,
  serverIp = '10.97.70.3',
  onChangeServerIp,
}) {
  const [activeMethod, setActiveMethod] = useState(selectedMethod);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleSelect = (methodKey) => {
    setActiveMethod(methodKey);
    if (onSelectMethod) {
      onSelectMethod(methodKey);
    }
  };

  const handleOpenScanner = async () => {
    if (!permission) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera Permission Required', 'Please allow camera access to scan the QR Code on your PC screen.');
        return;
      }
    } else if (!permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera Permission Required', 'Please allow camera access to scan the QR Code on your PC screen.');
        return;
      }
    }
    setScannerVisible(true);
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScannerVisible(false);
    if (!data) return;

    const parsed = parseServerUrl(data);
    const cleanUrl = parsed.cleanHost || data.trim();

    if (onChangeServerIp) {
      onChangeServerIp(cleanUrl);
    }
    handleSelect('wifi');
    if (connectToServer) {
      setTimeout(() => {
        connectToServer('wifi');
      }, 300);
    }
    Alert.alert('QR Code Scanned!', `Connecting to PC server at:\nhttp://${cleanUrl}`);
  };

  const handleConnectToggle = (methodKey, methodName) => {
    handleSelect(methodKey);

    if (connectionState === 'connected' && activeMethod === methodKey) {
      Alert.alert(
        'Disconnect Bat Controller?',
        `Stop streaming real-time telemetry over ${methodName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: () => {
              disconnectFromServer && disconnectFromServer();
            },
          },
        ]
      );
    } else {
      if (connectToServer) {
        connectToServer(methodKey);
      }
    }
  };

  const getButtonText = (methodKey, defaultLabel) => {
    if (activeMethod === methodKey) {
      if (connectionState === 'connecting') return 'Connecting to PC...';
      if (connectionState === 'connected') return `${defaultLabel.replace('Connect', 'Connected')} (Tap to Disconnect)`;
    }
    return defaultLabel;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Brand Logo & Web Connection Status Section */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>🏏</Text>
        </View>
        <Text style={styles.logoTitle}>ricSense Bat Controller</Text>

        {/* Status indicator directly under logo: GREEN if connected, YELLOW if not */}
        <View style={[
          styles.webStatusBadge,
          connectionState === 'connected' ? styles.webStatusConnected : styles.webStatusYellow
        ]}>
          <View style={[
            styles.statusDotSmall,
            connectionState === 'connected' ? styles.dotGreen : styles.dotYellow
          ]} />
          <Text style={[
            styles.webStatusText,
            connectionState === 'connected' ? styles.textGreen : styles.textYellow
          ]}>
            {connectionState === 'connected' ? 'Connected to Web' : 'Not Connected to Web'}
          </Text>
        </View>

        {/* Laptop Server IP / Link Input Box */}
        <View style={styles.ipBoxHome}>
          <Text style={styles.ipBoxLabel}>PC SERVER IP OR FULL LINK</Text>
          <TextInput
            style={styles.ipInputHome}
            value={serverIp}
            onChangeText={onChangeServerIp}
            placeholder="http://192.168.31.53:8080 or 10.97.70.3"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Title Section */}
      <View style={styles.headerSection}>
        <Text style={styles.badgeText}>CONNECTION HUB</Text>
        <Text style={styles.mainTitle}>Select Connection Method</Text>
        <Text style={styles.subTitle}>
          Choose how to connect your bat sensor controller to your laptop game server
        </Text>
      </View>

      {/* Connection Methods Container */}
      <View style={styles.methodsList}>

        {/* Method 1: USB Connection */}
        <TouchableOpacity
          style={[
            styles.methodCard,
            activeMethod === 'usb' && styles.activeMethodCard
          ]}
          onPress={() => handleSelect('usb')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={styles.methodIconBadge}>
              <Text style={styles.iconText}>🔌</Text>
            </View>
            <View style={styles.methodTitleBox}>
              <Text style={styles.methodTag}>METHOD 1 • ULTRA-LOW LATENCY</Text>
              <Text style={styles.methodName}>USB Cable Connection</Text>
            </View>
            {activeMethod === 'usb' && (
              <View style={[styles.activeBadge, connectionState === 'connecting' && styles.connectingBadge]}>
                <Text style={styles.activeBadgeText}>
                  {connectionState === 'connecting' ? 'CONNECTING' : connectionState === 'connected' ? 'CONNECTED' : 'SELECTED'}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.methodDesc}>
            Connect your phone directly to your laptop via USB cable. Provides the lowest latency (&lt;2ms) for ultra-fast bat swing detection using ADB or USB Tethering.
          </Text>

          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Speed / Latency</Text>
              <Text style={styles.specValue}>~ 1-2 ms</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Stability</Text>
              <Text style={styles.specValue}>Maximum</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Port</Text>
              <Text style={styles.specValue}>8080 (ADB)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.connectButton, activeMethod === 'usb' && connectionState === 'connected' && styles.connectButtonActive]}
            onPress={() => handleConnectToggle('usb', 'USB Wired Link')}
          >
            <Text style={[styles.connectButtonText, activeMethod === 'usb' && connectionState === 'connected' && styles.connectButtonTextActive]}>
              {getButtonText('usb', 'Connect via USB')}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Method 2: Wi-Fi Connection */}
        <TouchableOpacity
          style={[
            styles.methodCard,
            activeMethod === 'wifi' && styles.activeMethodCard
          ]}
          onPress={() => handleSelect('wifi')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={styles.methodIconBadge}>
              <Text style={styles.iconText}>📶</Text>
            </View>
            <View style={styles.methodTitleBox}>
              <Text style={styles.methodTag}>METHOD 2 • WIRELESS NETWORK</Text>
              <Text style={styles.methodName}>Wi-Fi Telemetry Stream</Text>
            </View>
            {activeMethod === 'wifi' && (
              <View style={[styles.activeBadge, connectionState === 'connecting' && styles.connectingBadge]}>
                <Text style={styles.activeBadgeText}>
                  {connectionState === 'connecting' ? 'CONNECTING' : connectionState === 'connected' ? 'CONNECTED' : 'SELECTED'}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.methodDesc}>
            Connect phone and laptop to the same Wi-Fi network or local hotspot. Streams 9-DOF sensor data over HTTP POST or WebSocket.
          </Text>

          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Range</Text>
              <Text style={styles.specValue}>Local Router</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Latency</Text>
              <Text style={styles.specValue}>~ 5-10 ms</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Protocol</Text>
              <Text style={styles.specValue}>HTTP / WS</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.connectButton, activeMethod === 'wifi' && connectionState === 'connected' && styles.connectButtonActive]}
            onPress={() => handleConnectToggle('wifi', 'Wi-Fi Telemetry Stream')}
          >
            <Text style={[styles.connectButtonText, activeMethod === 'wifi' && connectionState === 'connected' && styles.connectButtonTextActive]}>
              {getButtonText('wifi', 'Connect via Wi-Fi')}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Method 3: Bluetooth Connection */}
        <TouchableOpacity
          style={[
            styles.methodCard,
            activeMethod === 'bluetooth' && styles.activeMethodCard
          ]}
          onPress={() => handleSelect('bluetooth')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={styles.methodIconBadge}>
              <Text style={styles.iconText}>📡</Text>
            </View>
            <View style={styles.methodTitleBox}>
              <Text style={styles.methodTag}>METHOD 3 • DIRECT BLE</Text>
              <Text style={styles.methodName}>Bluetooth Pairing</Text>
            </View>
            {activeMethod === 'bluetooth' && (
              <View style={[styles.activeBadge, connectionState === 'connecting' && styles.connectingBadge]}>
                <Text style={styles.activeBadgeText}>
                  {connectionState === 'connecting' ? 'CONNECTING' : connectionState === 'connected' ? 'CONNECTED' : 'SELECTED'}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.methodDesc}>
            Direct wireless pairing via Bluetooth Low Energy (BLE). Ideal when no Wi-Fi router or USB cable is available.
          </Text>

          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Type</Text>
              <Text style={styles.specValue}>Bluetooth LE</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Setup</Text>
              <Text style={styles.specValue}>Direct Pair</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Status</Text>
              <Text style={styles.specValue}>Ready</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.connectButton, activeMethod === 'bluetooth' && connectionState === 'connected' && styles.connectButtonActive]}
            onPress={() => handleConnectToggle('bluetooth', 'Bluetooth Direct Pairing')}
          >
            <Text style={[styles.connectButtonText, activeMethod === 'bluetooth' && connectionState === 'connected' && styles.connectButtonTextActive]}>
              {getButtonText('bluetooth', 'Connect via Bluetooth')}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Method 4: QR Code Auto-Pairing */}
        <TouchableOpacity
          style={[
            styles.methodCard,
            styles.qrCard,
            activeMethod === 'qr' && styles.activeMethodCard
          ]}
          onPress={handleOpenScanner}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.methodIconBadge, styles.qrIconBadge]}>
              <Text style={styles.iconText}>📷</Text>
            </View>
            <View style={styles.methodTitleBox}>
              <Text style={[styles.methodTag, styles.qrTag]}>METHOD 4 • INSTANT PAIRING</Text>
              <Text style={styles.methodName}>Scan PC Screen QR Code</Text>
            </View>
          </View>

          <Text style={styles.methodDesc}>
            Point your phone camera at the QR Code displayed on your PC screen (http://localhost:8080) to automatically pair and stream telemetry instantly.
          </Text>

          <TouchableOpacity
            style={styles.qrScanButton}
            onPress={handleOpenScanner}
          >
            <Text style={styles.qrScanButtonText}>📷 Scan QR Code to Connect</Text>
          </TouchableOpacity>
        </TouchableOpacity>

      </View>

      {/* QR Code Scanner Camera Modal */}
      <Modal visible={scannerVisible} animationType="slide" transparent={false} onRequestClose={() => setScannerVisible(false)}>
        <View style={styles.cameraContainer}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraTitle}>Scan PC Screen QR Code</Text>
            <TouchableOpacity onPress={() => setScannerVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <CameraView
            style={styles.cameraView}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scanTargetBox} />
              <Text style={styles.scannerHint}>Align camera with QR Code on http://localhost:8080</Text>
            </View>
          </CameraView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    backgroundColor: '#0a0d14',
  },
  headerSection: {
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00e699',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  methodsList: {
    gap: 14,
  },
  methodCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  activeMethodCard: {
    borderColor: '#38bdf8',
    backgroundColor: '#0f172a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  methodIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  methodTitleBox: {
    flex: 1,
  },
  methodTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  activeBadge: {
    backgroundColor: '#132e27',
    borderWidth: 1,
    borderColor: '#00e699',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  connectingBadge: {
    backgroundColor: '#3b2d13',
    borderColor: '#eab308',
  },
  activeBadgeText: {
    color: '#00e699',
    fontSize: 10,
    fontWeight: '800',
  },
  methodDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 19,
    marginBottom: 14,
  },
  specsRow: {
    flexDirection: 'row',
    backgroundColor: '#0a0d14',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-around',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  specItem: {
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
  },
  connectButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectButtonActive: {
    backgroundColor: '#38bdf8',
  },
  connectButtonText: {
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: 13,
  },
  connectButtonTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  logoContainer: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 6,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoIcon: {
    fontSize: 30,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  webStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
  },
  webStatusConnected: {
    backgroundColor: '#132e27',
    borderColor: '#00e699',
  },
  webStatusYellow: {
    backgroundColor: '#3b2d13',
    borderColor: '#eab308',
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#00e699',
  },
  dotYellow: {
    backgroundColor: '#eab308',
  },
  webStatusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  textGreen: {
    color: '#00e699',
  },
  textYellow: {
    color: '#eab308',
  },
  qrCard: {
    borderColor: '#eab308',
    backgroundColor: '#17150c',
  },
  qrIconBadge: {
    backgroundColor: '#2e2510',
  },
  qrTag: {
    color: '#eab308',
  },
  qrScanButton: {
    backgroundColor: '#eab308',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  qrScanButtonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 14,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  cameraTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#ef4444',
    fontWeight: '800',
    fontSize: 12,
  },
  cameraView: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 13, 20, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scanTargetBox: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#eab308',
    backgroundColor: 'transparent',
    boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)',
  },
  scannerHint: {
    marginTop: 24,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
});

