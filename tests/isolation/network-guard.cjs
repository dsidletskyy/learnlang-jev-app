/* eslint-disable @typescript-eslint/no-require-imports */

if (process.env.JEV_TEST_URL !== 'http://127.0.0.1:3101') {
  throw new Error('JEV_TEST_URL must be the loopback test substitute');
}
const net = require('node:net');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const options = typeof args[0] === 'object' ? args[0] : { port: args[0], host: args[1] };
  if (!options || options.host !== '127.0.0.1' || ![3100, 3101, 55432].includes(Number(options.port))) {
    throw new Error('Outbound network blocked in browser tests');
  }
  return connect.apply(this, args);
};
