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
    Alert.alert('QR Code Scanned!', `Connecting to PC server at:\n${parsed.httpUrl || cleanUrl}`);
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
      {/* Title Section */}
      <View style={styles.headerSection}>
        <Text style={styles.badgeText}>CONNECTION HUB • 2 EASY STEPS</Text>
        <Text style={styles.mainTitle}>Connect Bat Controller</Text>
        <Text style={styles.subTitle}>
          Follow the 2 simple steps below to pair your phone bat controller with your PC game
        </Text>
      </View>

      {/* STEP 1: SCAN QR CODE TO GET PC IP */}
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
            <Text style={[styles.methodTag, styles.qrTag]}>STEP 1 • AUTO DISCOVERY</Text>
            <Text style={styles.methodName}>Scan PC Screen QR Code</Text>
          </View>
        </View>

        <Text style={styles.methodDesc}>
          Scan the QR Code on your PC screen (<Text style={{ fontWeight: '800', color: '#059669' }}>http://localhost:8080</Text>) to automatically grab your PC IP address!
        </Text>

        <TouchableOpacity
          style={styles.qrScanButton}
          onPress={handleOpenScanner}
        >
          <Text style={styles.qrScanButtonText}>📷 Scan QR Code to Auto-Fetch IP</Text>
        </TouchableOpacity>

        {/* Current IP Address Display Box */}
        <View style={{ marginTop: 14, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#10B981' }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#059669', marginBottom: 4 }}>
            CURRENT PC SERVER IP:
          </Text>
          <TextInput
            style={{
              fontSize: 14,
              fontWeight: '800',
              color: '#0F172A',
              padding: 0,
            }}
            value={serverIp}
            onChangeText={onChangeServerIp}
            placeholder="e.g. 10.97.70.3 or 192.168.1.5"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </TouchableOpacity>

      {/* STEP 2: CHOOSE CONNECTION METHOD */}
      <View style={[styles.headerSection, { marginTop: 8 }]}>
        <Text style={styles.badgeText}>STEP 2 • CHOOSE METHOD</Text>
        <Text style={styles.mainTitle}>Select Connection Method</Text>
        <Text style={styles.subTitle}>
          Pick your preferred stream protocol and tap Connect
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
            Direct low-energy Bluetooth telemetry stream directly to laptop BLE receiver.
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
    backgroundColor: '#F8FAFC',
  },
  headerSection: {
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  methodsList: {
    gap: 14,
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  activeMethodCard: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
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
    backgroundColor: '#F1F5F9',
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
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeBadge: {
    backgroundColor: '#D1E7DD',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  connectingBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  activeBadgeText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
  },
  methodDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 14,
  },
  specsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-around',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specItem: {
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  connectButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectButtonActive: {
    backgroundColor: '#10B981',
  },
  connectButtonText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 13,
  },
  connectButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  logoContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoIcon: {
    fontSize: 30,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
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
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  webStatusYellow: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#10B981',
  },
  dotYellow: {
    backgroundColor: '#F59E0B',
  },
  webStatusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  textGreen: {
    color: '#047857',
  },
  textYellow: {
    color: '#B45309',
  },
  qrCard: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  qrIconBadge: {
    backgroundColor: '#D1E7DD',
  },
  qrTag: {
    color: '#059669',
  },
  qrScanButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  qrScanButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cameraTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 12,
  },
  cameraView: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scanTargetBox: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#10B981',
    backgroundColor: 'transparent',
  },
  scannerHint: {
    marginTop: 24,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
});

