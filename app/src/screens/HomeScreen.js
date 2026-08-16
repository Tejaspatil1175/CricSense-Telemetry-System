import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';

export function HomeScreen({ onNavigateToData, onNavigateToSettings, selectedMethod = 'wifi', onSelectMethod }) {
  const [activeMethod, setActiveMethod] = useState(selectedMethod);

  const handleSelect = (methodKey) => {
    setActiveMethod(methodKey);
    if (onSelectMethod) {
      onSelectMethod(methodKey);
    }
  };

  const handleConnectAction = (methodName) => {
    Alert.alert(
      `${methodName} Selected`,
      `Your Bat Controller is now set to stream telemetry via ${methodName}.`,
      [
        { text: 'View Live Data', onPress: onNavigateToData },
        { text: 'OK', style: 'default' }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
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
            style={[styles.connectButton, activeMethod === 'usb' && styles.connectButtonActive]}
            onPress={() => {
              handleSelect('usb');
              handleConnectAction('USB Wired Link');
            }}
          >
            <Text style={[styles.connectButtonText, activeMethod === 'usb' && styles.connectButtonTextActive]}>
              {activeMethod === 'usb' ? 'Connected via USB' : 'Connect via USB'}
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
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
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
            style={[styles.connectButton, activeMethod === 'wifi' && styles.connectButtonActive]}
            onPress={() => {
              handleSelect('wifi');
              handleConnectAction('Wi-Fi Telemetry Stream');
            }}
          >
            <Text style={[styles.connectButtonText, activeMethod === 'wifi' && styles.connectButtonTextActive]}>
              {activeMethod === 'wifi' ? 'Connected via Wi-Fi' : 'Connect via Wi-Fi'}
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
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
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
            style={[styles.connectButton, activeMethod === 'bluetooth' && styles.connectButtonActive]}
            onPress={() => {
              handleSelect('bluetooth');
              handleConnectAction('Bluetooth Direct Pairing');
            }}
          >
            <Text style={[styles.connectButtonText, activeMethod === 'bluetooth' && styles.connectButtonTextActive]}>
              {activeMethod === 'bluetooth' ? 'Paired via Bluetooth' : 'Connect via Bluetooth'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

      </View>
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
});

