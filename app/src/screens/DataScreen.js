import React from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';

export function DataScreen({ sensorData }) {
  const { accelData, gyroData, magData, motionData, status } = sensorData;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleBox}>
        <Text style={styles.screenTitle}>Real-Time Sensor Telemetry</Text>
        <Text style={styles.screenSubtitle}>Streaming 9-DOF hardware sensor metrics</Text>
      </View>

      {/* Accelerometer Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeader}>ACCELEROMETER</Text>
          <Text style={styles.badge}>{status.accel}</Text>
        </View>
        <Text style={styles.value}>X: {accelData.x.toFixed(4)} g</Text>
        <Text style={styles.value}>Y: {accelData.y.toFixed(4)} g</Text>
        <Text style={styles.value}>Z: {accelData.z.toFixed(4)} g</Text>
        <View style={styles.divider} />
        <Text style={styles.meta}>Hardware TS: {accelData.timestamp.toFixed(0)} ms</Text>
        <Text style={styles.meta}>Device Clock: {accelData.deviceTimestamp} ms</Text>
      </View>

      {/* Gyroscope Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeader}>GYROSCOPE</Text>
          <Text style={styles.badge}>{status.gyro}</Text>
        </View>
        <Text style={styles.value}>X (Pitch): {gyroData.x.toFixed(4)} rad/s</Text>
        <Text style={styles.value}>Y (Roll): {gyroData.y.toFixed(4)} rad/s</Text>
        <Text style={styles.value}>Z (Yaw): {gyroData.z.toFixed(4)} rad/s</Text>
        <View style={styles.divider} />
        <Text style={styles.meta}>Hardware TS: {gyroData.timestamp.toFixed(0)} ms</Text>
        <Text style={styles.meta}>Device Clock: {gyroData.deviceTimestamp} ms</Text>
      </View>

      {/* Rotation / Orientation Sensor Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeader}>ROTATION / ORIENTATION</Text>
          <Text style={styles.badge}>{status.motion}</Text>
        </View>
        <Text style={styles.value}>Alpha (Z-rot): {motionData.alpha.toFixed(4)} rad</Text>
        <Text style={styles.value}>Beta (X-rot): {motionData.beta.toFixed(4)} rad</Text>
        <Text style={styles.value}>Gamma (Y-rot): {motionData.gamma.toFixed(4)} rad</Text>
        <Text style={styles.value}>Orientation: {motionData.orientation}°</Text>
        <View style={styles.divider} />
        <Text style={styles.meta}>Hardware TS: {motionData.timestamp.toFixed(0)} ms</Text>
        <Text style={styles.meta}>Device Clock: {motionData.deviceTimestamp} ms</Text>
      </View>

      {/* Magnetometer Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeader}>MAGNETOMETER</Text>
          <Text style={styles.badge}>{status.mag}</Text>
        </View>
        <Text style={styles.value}>X: {magData.x.toFixed(2)} µT</Text>
        <Text style={styles.value}>Y: {magData.y.toFixed(2)} µT</Text>
        <Text style={styles.value}>Z: {magData.z.toFixed(2)} µT</Text>
        <Text style={styles.value}>Heading: {magData.heading.toFixed(1)}°</Text>
        <View style={styles.divider} />
        <Text style={styles.meta}>Hardware TS: {magData.timestamp.toFixed(0)} ms</Text>
        <Text style={styles.meta}>Device Clock: {magData.deviceTimestamp} ms</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    backgroundColor: '#0a0d14',
  },
  titleBox: {
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  badge: {
    fontSize: 11,
    color: '#00e699',
    fontWeight: '600',
    backgroundColor: '#132e27',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  value: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#f8fafc',
    marginVertical: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#1f2937',
    marginVertical: 10,
  },
  meta: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#64748b',
    marginVertical: 1,
  },
});
