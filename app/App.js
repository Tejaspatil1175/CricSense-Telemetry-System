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
  const [serverIp, setServerIp] = useState('192.168.1.100');
  const [serverPort, setServerPort] = useState('8080');
  const [connectionMethod, setConnectionMethod] = useState('wifi'); // 'usb' | 'wifi' | 'bluetooth'

  const sensorData = useSensorData(samplingInterval, serverIp, serverPort);

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
            selectedMethod={connectionMethod}
            onSelectMethod={setConnectionMethod}
            connectionState={sensorData.connectionState}
            connectToServer={sensorData.connectToServer}
            disconnectFromServer={sensorData.disconnectFromServer}
          />
        )}

        {activeTab === 'data' && <DataScreen sensorData={sensorData} />}

        {activeTab === 'settings' && (
          <SettingsScreen
            currentInterval={samplingInterval}
            onChangeInterval={setSamplingInterval}
            serverIp={serverIp}
            onChangeServerIp={setServerIp}
            serverPort={serverPort}
            onChangeServerPort={setServerPort}
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
