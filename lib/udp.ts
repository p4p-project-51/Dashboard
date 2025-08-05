import os from "os";
import dgram from "dgram";

const UDP_BROADCAST_PORT = 5555;
const UDP_LISTEN_PORT = 8888;
const BROADCAST_INTERVAL_MS = 250;

function findLocalIpAddresses() {
  const interfaces = os.networkInterfaces();

  const addresses = [];
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;

    for (const details of iface) {
      if (
        details.family === "IPv4" &&
        !details.internal &&
        details.mac !== "00:00:00:00:00:00"
      ) {
        addresses.push(details.address);
      }
    }
  }
  return addresses;
}

function setupUdpBroadcast() {
  const socket = dgram.createSocket("udp4");

  socket.on("listening", () => {
    socket.setBroadcast(true);
    setInterval(() => {
      // Recalculate IPs inside the interval
      const currentIpAddresses = findLocalIpAddresses();
      if (currentIpAddresses.length === 0) {
        console.warn("No valid IP addresses found for broadcast.");
        return;
      }

      const message = Buffer.from(currentIpAddresses.join(","));
      socket.send(
        message,
        0,
        message.length,
        UDP_BROADCAST_PORT,
        "255.255.255.255"
      );
    }, BROADCAST_INTERVAL_MS);

    console.log(
      `Sending UDP broadcast of IPs every ${BROADCAST_INTERVAL_MS}ms`
    );
  });

  socket.on(
    "message",
    (message: string, remote: { address: string; port: number }) => {
      console.log(
        `Received UDP message from ${remote.address}:${remote.port}: ${message}`
      );
    }
  );

  socket.on("error", (err: Error) => {
    console.error("UDP socket error:", err);
    socket.close();
  });

  socket.bind(UDP_LISTEN_PORT);
}

setupUdpBroadcast();
