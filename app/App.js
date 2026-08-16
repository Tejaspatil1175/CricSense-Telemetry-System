import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useSensorData } from './src/hooks/useSensorData';
import { Header } from './src/components/Header';
import { Footer } from './src/components/Footer';

import { HomeScreen } from './src/screens/HomeScreen';
import { DataScreen } from './src/screens/DataScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'data' | 'settings'
  const [samplingInterval, setSamplingInterval] = useState(50); // 50ms default (20Hz)

  const sensorData = useSensorData(samplingInterval);

  const handleAccountPress = () => {
    Alert.alert(
      'Account Profile',
      'CricSense Player Account\nStatus: Registered Bat Controller\nPairing ID: CRIC-BAT-9942',
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header with Account Icon */}
      <Header onAccountPress={handleAccountPress} />

      {/* Main Content Area */}
      <View style={styles.content}>
        {activeTab === 'home' && (
          <HomeScreen
            onNavigateToData={() => setActiveTab('data')}
            onNavigateToSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'data' && <DataScreen sensorData={sensorData} />}

        {activeTab === 'settings' && (
          <SettingsScreen
            currentInterval={samplingInterval}
            onChangeInterval={setSamplingInterval}
          />
        )}
      </View>

      {/* Bottom Footer Navigation Bar */}
      <Footer activeTab={activeTab} onSelectTab={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
  content: {
    flex: 1,
  },
});
