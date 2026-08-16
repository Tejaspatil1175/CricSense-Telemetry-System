import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Accelerometer, Gyroscope } from 'expo-sensors';

export default function App() {
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    let accelSub;
    let gyroSub;

    const setupSensors = async () => {
      try {
        const isAccelAvailable = await Accelerometer.isAvailableAsync();
        if (isAccelAvailable) {
          Accelerometer.setUpdateInterval(100);
          accelSub = Accelerometer.addListener(data => setAccelData(data));
        }

        const isGyroAvailable = await Gyroscope.isAvailableAsync();
        if (isGyroAvailable) {
          Gyroscope.setUpdateInterval(100);
          gyroSub = Gyroscope.addListener(data => setGyroData(data));
        }
      } catch (error) {
        console.warn('Sensors error:', error);
      }
    };

    setupSensors();

    return () => {
      accelSub && accelSub.remove();
      gyroSub && gyroSub.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <Text style={styles.header}>Accelerometer</Text>
        <Text style={styles.value}>X: {accelData.x.toFixed(2)}</Text>
        <Text style={styles.value}>Y: {accelData.y.toFixed(2)}</Text>
        <Text style={styles.value}>Z: {accelData.z.toFixed(2)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.header}>Gyroscope</Text>
        <Text style={styles.value}>X: {gyroData.x.toFixed(2)}</Text>
        <Text style={styles.value}>Y: {gyroData.y.toFixed(2)}</Text>
        <Text style={styles.value}>Z: {gyroData.z.toFixed(2)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121218',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '90%',
    backgroundColor: '#1e1e2a',
    borderRadius: 16,
    padding: 24,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#2e2e40',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  value: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#a0a0c0',
    marginVertical: 4,
  },
});


