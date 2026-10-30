import http from 'node:http';
import net from 'node:net';
import { pathToFileURL } from 'node:url';

export async function startRequestProxy({ upstreamPort = 3102, port = 3100, controlPort = 3103, drainTimeout = 35000 } = {}) {
  let active = 0;
  let gated = false;
  let failure;
  const waiters = new Set();
  const hmrSockets = new Set();
  function notify() { for (const waiter of waiters) waiter(); }
  function fail(message) { failure ||= message; gated = true; notify(); }

  const proxy = http.createServer((request, response) => {
    if (gated || failure) return response.writeHead(503).end('Test server is draining');
    active++;
    const upstream = http.request({ hostname: '127.0.0.1', port: upstreamPort, method: request.method, path: request.url, headers: request.headers });
    let complete = false;
    function done() { if (!complete) { complete = true; active--; notify(); } }
    upstream.on('response', incoming => {
      if (!response.destroyed) response.writeHead(incoming.statusCode, incoming.headers);
      incoming.on('data', chunk => { if (!response.destroyed) response.write(chunk); });
      incoming.on('end', () => { if (!response.destroyed) response.end(); done(); });
      incoming.on('aborted', () => { fail('Upstream response aborted'); done(); });
      incoming.on('error', () => { fail('Upstream response failed'); done(); });
    });
    upstream.on('error', () => { fail('Upstream request failed'); if (!response.destroyed) response.writeHead(502).end(); done(); });
    request.on('aborted', () => { fail('Client disconnected before request body completed'); upstream.destroy(); });
    request.pipe(upstream);
  });
  // Next's development-only HMR websocket never invokes application routes.
  proxy.on('upgrade', (request, socket, head) => {
    if (new URL(request.url, 'http://localhost').pathname !== '/_next/hmr') return socket.destroy();
    hmrSockets.add(socket);
    socket.on('close', () => hmrSockets.delete(socket));
    const upstream = net.connect(upstreamPort, '127.0.0.1', () => {
      upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`);
      for (let i = 0; i < request.rawHeaders.length; i += 2) upstream.write(`${request.rawHeaders[i]}: ${request.rawHeaders[i + 1]}\r\n`);
      upstream.write('\r\n');
      if (head.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    socket.on('error', () => upstream.destroy());
    upstream.on('error', () => socket.destroy());
    socket.on('close', () => upstream.destroy());
    upstream.on('close', () => socket.destroy());
  });
  const control = http.createServer(async (request, response) => {
    if (request.method !== 'POST') return response.writeHead(405).end();
    if (request.url === '/resume') {
      if (failure || active) return response.writeHead(503).end(failure || 'Requests are still active');
      gated = false;
      return response.end('ready');
    }
    if (request.url !== '/drain') return response.writeHead(404).end();
    gated = true;
    if (active && !failure) {
      await new Promise(resolve => {
        const timer = setTimeout(() => { fail('Timed out waiting for upstream requests'); }, drainTimeout);
        const check = () => { if (!active || failure) { clearTimeout(timer); waiters.delete(check); resolve(); } };
        waiters.add(check);
        check();
      });
    }
    if (failure) return response.writeHead(503).end(failure);
    response.end('drained');
  });
  const listen = (server, bindPort) => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(bindPort, '127.0.0.1', () => resolve(server.address().port));
  });
  const boundPort = await listen(proxy, port);
  let boundControlPort;
  try { boundControlPort = await listen(control, controlPort); }
  catch (error) { proxy.close(); throw error; }
  return {
    port: boundPort, controlPort: boundControlPort,
    close: async () => { for (const socket of hmrSockets) socket.destroy(); await Promise.all([proxy, control].map(server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }))); },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startRequestProxy();
}
