let WebSocket;
try {
  WebSocket = require('ws');
} catch (e) {
  WebSocket = null;
}

const { state, broadcastStateChange } = require('./state');
const { processTelemetry } = require('./routes');

function setupWebSocket(server, port) {
  if (!WebSocket) return;

  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'Unknown Client';
    let isWebDashboard = false;

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());

        // A) Web Dashboard Registration
        if (payload.type === 'web_dashboard_register') {
          isWebDashboard = true;
          state.webDashboardClients.add(ws);
          ws.send(JSON.stringify({
            type: 'connection_status',
            state: state.mobileState,
            method: state.selectedMethod,
            timestamp: Date.now()
          }));
          return;
        }

        // B) Web Dashboard Approval Response (Accept / Deny)
        if (payload.type === 'respond_connect') {
          if (payload.action === 'accept') {
            console.log(`\n[PC ACTION] Connection ACCEPTED for mobile client`);
            state.mobileState = 'connected';
            state.activeMobileClient = state.pendingMobileClient;
            if (state.pendingMobileClient && state.pendingMobileClient.readyState === 1) {
              state.pendingMobileClient.send(JSON.stringify({
                type: 'connect_response',
                status: 'accepted'
              }));
            }
            state.pendingMobileClient = null;
            broadcastStateChange('connected', state.selectedMethod);
          } else {
            console.log(`\n[PC ACTION] Connection DENIED for mobile client`);
            state.mobileState = 'idle';
            if (state.pendingMobileClient && state.pendingMobileClient.readyState === 1) {
              state.pendingMobileClient.send(JSON.stringify({
                type: 'connect_response',
                status: 'denied',
                reason: 'Server denied connection'
              }));
            }
            state.pendingMobileClient = null;
            broadcastStateChange('idle', state.selectedMethod);
          }
          return;
        }

        // C) Mobile Client Connection Request (Auto-Accept)
        if (payload.type === 'client_request_connect') {
          console.log(`\n[MOBILE CONNECT REQUEST] Auto-accepting connection via ${payload.method || 'wifi'}`);
          state.selectedMethod = payload.method || 'wifi';
          state.mobileState = 'connected';
          state.activeMobileClient = ws;
          state.lastMobileConnectTime = Date.now();

          // Immediately respond with 'accepted' to start streaming
          ws.send(JSON.stringify({
            type: 'connect_response',
            status: 'accepted'
          }));

          // Notify Web Dashboard that mobile is connected & active
          broadcastStateChange('connected', state.selectedMethod);
          return;
        }

        // D) Mobile Disconnect Request
        if (payload.type === 'client_disconnect') {
          console.log(`\n[MOBILE DISCONNECT] Mobile client requested disconnect`);
          state.mobileState = 'idle';
          state.activeMobileClient = null;
          state.pendingMobileClient = null;
          broadcastStateChange('idle', state.selectedMethod);
          return;
        }

        // E) Real-Time Sensor Telemetry Stream (over Wi-Fi WebSocket)
        if (payload.type === 'sensor_data' || payload.accel) {
          if (state.mobileState === 'connected') {
            processTelemetry(payload, clientIp, port);
          }
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e.message);
      }
    });

    ws.on('close', () => {
      if (isWebDashboard) {
        state.webDashboardClients.delete(ws);
      } else {
        if (ws === state.pendingMobileClient) {
          state.pendingMobileClient = null;
          state.mobileState = 'idle';
          broadcastStateChange('idle', state.selectedMethod);
        } else if (ws === state.activeMobileClient) {
          state.activeMobileClient = null;
          state.mobileState = 'idle';
          broadcastStateChange('idle', state.selectedMethod);
        }
      }
    });
  });
}

module.exports = {
  setupWebSocket,
};
