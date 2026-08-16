import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export function Header({ onAccountPress }) {
  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        <Text style={styles.title}>CricSense</Text>
        <Text style={styles.subtitle}>Bat Controller Telemetry</Text>
      </View>

      <View style={styles.rightContainer}>
        <View style={styles.connectionBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.connectionText}>PC Connected</Text>
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
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
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
    backgroundColor: '#132e27',
    borderColor: '#00e699',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00e699',
  },
  connectionText: {
    color: '#00e699',
    fontSize: 10,
    fontWeight: '700',
  },
  accountButton: {
    padding: 2,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 12,
  },
});
