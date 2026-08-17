import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, Platform } from 'react-native';

export function Header({ onAccountPress, connectionState = 'disconnected' }) {
  const isConnected = connectionState === 'connected';

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        <Text style={styles.title}>CricSense 🏏</Text>
        <Text style={styles.subtitle}>Bat Controller Telemetry</Text>
      </View>

      <View style={styles.rightContainer}>
        <View style={[styles.connectionBadge, !isConnected && styles.disconnectedBadge]}>
          <View style={[styles.statusDot, !isConnected && styles.yellowDot]} />
          <Text style={[styles.connectionText, !isConnected && styles.yellowText]}>
            {isConnected ? 'PC Connected' : 'Not Connected'}
          </Text>
        </View>

        <TouchableOpacity style={styles.accountButton} onPress={onAccountPress} activeOpacity={0.7}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>CS</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  leftContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  disconnectedBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  yellowDot: {
    backgroundColor: '#F59E0B',
  },
  connectionText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
  },
  yellowText: {
    color: '#B45309',
  },
  accountButton: {
    padding: 2,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
});
