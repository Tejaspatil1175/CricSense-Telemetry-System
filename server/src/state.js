let WebSocket;
try {
  WebSocket = require('ws');
} catch (e) {
  WebSocket = null;
}

const state = {
  packetCount: 0,
  packetsPerSecond: 0,
  packetWindow: 0,
  latestPayload: null,
  mobileState: 'idle', // 'idle' | 'pending_approval' | 'connected' | 'denied'
  selectedMethod: 'wifi',
  lastMobileConnectTime: 0,
  lastTelemetryTime: 0,
  pendingMobileClient: null,
  activeMobileClient: null,
  cloudTunnelUrl: '',
  webDashboardClients: new Set(),
};

function broadcastToWeb(messageObj) {
  const payloadStr = JSON.stringify(messageObj);
  for (const client of state.webDashboardClients) {
    if (client.readyState === (WebSocket ? WebSocket.OPEN : 1)) {
      client.send(payloadStr);
    }
  }
}

function broadcastStateChange(newState, method) {
  state.mobileState = newState;
  if (method) state.selectedMethod = method;
  broadcastToWeb({
    type: 'connection_status',
    state: state.mobileState,
    method: state.selectedMethod,
    timestamp: Date.now()
  });
}

// Watchdog interval to update packet rate & reset idle state on timeout
setInterval(() => {
  state.packetsPerSecond = state.packetWindow;
  state.packetWindow = 0;

  const now = Date.now();
  if (state.mobileState === 'connected' && (now - state.lastTelemetryTime > 3500)) {
    console.log('\n[MOBILE DISCONNECT] Real-time telemetry stream timed out.');
    state.mobileState = 'idle';
    state.activeMobileClient = null;
    broadcastStateChange('idle', state.selectedMethod);
  } else if (state.mobileState === 'pending_approval' && (now - state.lastMobileConnectTime > 15000)) {
    console.log('\n[APPROVAL TIMEOUT] Mobile request timed out.');
    state.mobileState = 'idle';
    if (state.pendingMobileClient && state.pendingMobileClient.readyState === 1) {
      state.pendingMobileClient.send(JSON.stringify({ type: 'connect_response', status: 'denied', reason: 'timeout' }));
    }
    state.pendingMobileClient = null;
    broadcastStateChange('idle', state.selectedMethod);
  }
}, 1000);

module.exports = {
  state,
  broadcastToWeb,
  broadcastStateChange,
};
