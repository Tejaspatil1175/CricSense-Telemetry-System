const os = require('os');

// Common mobile-hotspot subnet prefixes, so we can prefer them when a PC
// has multiple network adapters (Ethernet, VPN, virtual adapters, etc.)
const HOTSPOT_PREFIXES = [
  '192.168.137.', // Windows Mobile Hotspot (PC hosting hotspot)
  '192.168.43.',  // Android hotspot (phone hosting, PC tethered)
  '192.168.49.',  // Android Wi-Fi Direct / newer hotspot
  '172.20.10.',   // iPhone Personal Hotspot
];

function isHotspotIp(ip) {
  return HOTSPOT_PREFIXES.some(prefix => ip.startsWith(prefix));
}

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  // Put likely-hotspot IPs first so the dashboard/QR always suggests the
  // address that's actually reachable from a phone on the hotspot.
  addresses.sort((a, b) => (isHotspotIp(b) ? 1 : 0) - (isHotspotIp(a) ? 1 : 0));
  return addresses;
}

module.exports = {
  isHotspotIp,
  getLocalIpAddresses,
};
