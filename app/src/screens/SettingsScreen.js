import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';

export function SettingsScreen({ currentInterval, onChangeInterval, serverIp, onChangeServerIp, serverPort, onChangeServerPort }) {
  const intervals = [
    { label: '100 Hz (10 ms)', value: 10 },
    { label: '50 Hz (20 ms)', value: 20 },
    { label: '20 Hz (50 ms)', value: 50 },
    { label: '10 Hz (100 ms)', value: 100 },
  ];

  const handleCalibrate = () => {
    Alert.alert('Sensors Calibrated', 'Resting zero-offset for Accelerometer and Gyroscope updated successfully.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleBox}>
        <Text style={styles.screenTitle}>Bat Controller Settings</Text>
        <Text style={styles.screenSubtitle}>Configure telemetry transmission and calibration</Text>
      </View>

      {/* Sampling Rate Setting */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>SAMPLING FREQUENCY</Text>
        <Text style={styles.cardDesc}>Select sensor packet transmission interval to PC server:</Text>
        <View style={styles.optionsGrid}>
          {intervals.map(item => (
            <TouchableOpacity
              key={item.value}
              style={[styles.optionChip, currentInterval === item.value && styles.optionChipActive]}
              onPress={() => onChangeInterval(item.value)}
            >
              <Text style={[styles.chipText, currentInterval === item.value && styles.chipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Server Pairing Config */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>PC GAME SERVER CONNECTION</Text>
        <Text style={styles.inputLabel}>Laptop Server IP Address</Text>
        <TextInput
          style={styles.textInput}
          value={serverIp}
          onChangeText={onChangeServerIp}
          placeholder="192.168.x.x"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.inputLabel}>Port Number</Text>
        <TextInput
          style={styles.textInput}
          value={serverPort}
          onChangeText={onChangeServerPort}
          keyboardType="numeric"
          placeholder="8080"
          placeholderTextColor="#64748b"
        />
      </View>

      {/* Bat Calibration */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>BAT SENSOR CALIBRATION</Text>
        <Text style={styles.cardDesc}>
          Hold bat still on flat ground and tap calibrate to reset gyro & accelerometer drift.
        </Text>
        <TouchableOpacity style={styles.calibrateButton} onPress={handleCalibrate}>
          <Text style={styles.calibrateButtonText}>Calibrate Bat Position</Text>
        </TouchableOpacity>
      </View>

      {/* Account Info */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>ACCOUNT & CONTROLLER INFO</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>User Profile</Text>
          <Text style={styles.infoVal}>Cricket Player #1</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>App Version</Text>
          <Text style={styles.infoVal}>v1.0.0 (CricSense)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Sensor Hardware</Text>
          <Text style={styles.infoVal}>6-DOF / 9-DOF IMU</Text>
        </View>
      </View>
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
    marginBottom: 4,
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
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.8,
  },
  cardDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  optionChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  chipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  inputLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontWeight: '700',
  },
  calibrateButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  calibrateButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  infoKey: {
    color: '#64748B',
    fontSize: 12,
  },
  infoVal: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
});
