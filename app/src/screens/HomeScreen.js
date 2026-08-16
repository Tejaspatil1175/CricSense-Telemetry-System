import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export function HomeScreen({ onNavigateToData, onNavigateToSettings }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Game Banner */}
      <View style={styles.bannerCard}>
        <Text style={styles.bannerTag}>SYSTEM OVERVIEW</Text>
        <Text style={styles.bannerTitle}>CricSense Real-Time Cricket Engine</Text>
        <Text style={styles.bannerDesc}>
          This mobile app operates as your high-accuracy physical bat motion controller. Attach your mobile device securely to your cricket bat to stream 9-DOF motion telemetry directly to your PC/Laptop game server.
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={onNavigateToData}>
            <Text style={styles.primaryButtonText}>View Live Telemetry Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* System Architecture Info */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionHeader}>HOW IT WORKS</Text>
        
        <View style={styles.stepItem}>
          <View style={styles.stepBadge}><Text style={styles.stepNumber}>1</Text></View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Bat Mounting</Text>
            <Text style={styles.stepDesc}>Mount smartphone firmly on the bat spine using a sports sleeve or mount bracket.</Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepBadge}><Text style={styles.stepNumber}>2</Text></View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>High-Frequency Telemetry Stream</Text>
            <Text style={styles.stepDesc}>App streams 20Hz Accelerometer, Gyroscope, DeviceMotion Rotation, and Magnetometer packets.</Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepBadge}><Text style={styles.stepNumber}>3</Text></View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>PC/Laptop Game Execution</Text>
            <Text style={styles.stepDesc}>Your PC game server calculates bat swing velocity, impact force, and renders stroke trajectories in real-time.</Text>
          </View>
        </View>
      </View>

      {/* Quick Setup Card */}
      <View style={styles.setupCard}>
        <Text style={styles.sectionHeader}>BAT CONTROLLER STATUS</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Bat Connection</Text>
          <Text style={styles.statusValueActive}>Ready for Swing</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Telemetry Sampling Rate</Text>
          <Text style={styles.statusValue}>50 ms (20 Hz)</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>PC Server Host</Text>
          <Text style={styles.statusValue}>192.168.1.100:8080</Text>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={onNavigateToSettings}>
          <Text style={styles.secondaryButtonText}>Configure Settings</Text>
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
  bannerCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  bannerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00e699',
    letterSpacing: 1,
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
  },
  bannerDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 19,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#38bdf8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  infoCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 14,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumber: {
    color: '#38bdf8',
    fontWeight: '800',
    fontSize: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  stepDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  setupCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statusLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  statusValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  statusValueActive: {
    color: '#00e699',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  secondaryButtonText: {
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: 12,
  },
});
