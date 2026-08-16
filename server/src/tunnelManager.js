let localtunnel;
try {
  localtunnel = require('localtunnel');
} catch (e) {
  localtunnel = null;
}

const { state } = require('./state');

async function setupTunnel(port) {
  if (!localtunnel) {
    console.log('   (Cloud tunnel unavailable - localtunnel package not installed)');
    return;
  }

  try {
    const tunnelOptions = { port };
    if (process.env.SUBDOMAIN) {
      tunnelOptions.subdomain = process.env.SUBDOMAIN;
    }

    const tunnel = await localtunnel(tunnelOptions);
    state.cloudTunnelUrl = tunnel.url;

    console.log(`   -> ${state.cloudTunnelUrl.replace('https://', 'wss://')}   (Public Cloud Tunnel - No Firewall!)`);
    console.log(`   -> ${state.cloudTunnelUrl}           (Public Web URL)`);

    tunnel.on('close', () => {
      console.log('   [TUNNEL CLOSED] Reconnecting cloud tunnel in 5 seconds...');
      state.cloudTunnelUrl = '';
      setTimeout(() => setupTunnel(port), 5000);
    });

    tunnel.on('error', (err) => {
      console.log('   [TUNNEL ERROR]', err ? err.message : 'Disconnected');
    });
  } catch (e) {
    console.log('   (Cloud tunnel unavailable - using local network)');
  }
}

module.exports = {
  setupTunnel,
};
