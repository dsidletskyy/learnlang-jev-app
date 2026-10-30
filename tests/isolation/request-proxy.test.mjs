import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startRequestProxy } from './request-proxy.mjs';

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = server => new Promise(resolve => server.close(resolve));

test('drain waits for server work after client disconnect and gates new requests', async () => {
  let finish;
  let started;
  const active = new Promise(resolve => { started = resolve; });
  const upstream = http.createServer((_request, response) => {
    started();
    finish = () => response.end('done');
  });
  const upstreamPort = await listen(upstream);
  const proxy = await startRequestProxy({ upstreamPort, port: 0, controlPort: 0, drainTimeout: 1000 });
  try {
    const client = http.get(`http://127.0.0.1:${proxy.port}/`);
    client.on('error', () => {});
    await active;
    client.destroy();
    let drained = false;
    const drain = fetch(`http://127.0.0.1:${proxy.controlPort}/drain`, { method: 'POST' }).then(response => { drained = true; return response; });
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(drained, false);
    const blocked = await fetch(`http://127.0.0.1:${proxy.port}/`);
    assert.equal(blocked.status, 503);
    finish();
    assert.equal((await drain).status, 200);
    assert.equal((await fetch(`http://127.0.0.1:${proxy.controlPort}/resume`, { method: 'POST' })).status, 200);
  } finally {
    await proxy.close();
    await close(upstream);
  }
});

test('upstream failure permanently blocks draining and resuming', async () => {
  const upstream = http.createServer((_request, response) => response.destroy());
  const upstreamPort = await listen(upstream);
  const proxy = await startRequestProxy({ upstreamPort, port: 0, controlPort: 0, drainTimeout: 100 });
  try {
    assert.equal((await fetch(`http://127.0.0.1:${proxy.port}/`)).status, 502);
    for (const action of ['drain', 'resume', 'drain']) {
      const result = await fetch(`http://127.0.0.1:${proxy.controlPort}/${action}`, { method: 'POST' });
      assert.equal(result.status, 503);
      assert.match(await result.text(), /Upstream request failed/);
    }
  } finally {
    await proxy.close();
    await close(upstream);
  }
});

test('drain timeout permanently blocks reset even if upstream eventually finishes', async () => {
  let finish;
  let started;
  const active = new Promise(resolve => { started = resolve; });
  const upstream = http.createServer((_request, response) => { finish = () => response.end('done'); started(); });
  const upstreamPort = await listen(upstream);
  const proxy = await startRequestProxy({ upstreamPort, port: 0, controlPort: 0, drainTimeout: 50 });
  try {
    const result = fetch(`http://127.0.0.1:${proxy.port}/`);
    await active;
    const drain = await fetch(`http://127.0.0.1:${proxy.controlPort}/drain`, { method: 'POST' });
    assert.equal(drain.status, 503);
    assert.match(await drain.text(), /Timed out/);
    finish();
    await result;
    assert.equal((await fetch(`http://127.0.0.1:${proxy.controlPort}/drain`, { method: 'POST' })).status, 503);
    assert.equal((await fetch(`http://127.0.0.1:${proxy.controlPort}/resume`, { method: 'POST' })).status, 503);
  } finally {
    await proxy.close();
    await close(upstream);
  }
});

test('Next development HMR websocket does not block database drain', async () => {
  const upstream = http.createServer();
  let upstreamSocket;
  upstream.on('upgrade', (_request, socket) => { upstreamSocket = socket; socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n'); });
  const upstreamPort = await listen(upstream);
  const proxy = await startRequestProxy({ upstreamPort, port: 0, controlPort: 0, drainTimeout: 50 });
  try {
    const upgraded = new Promise((resolve, reject) => {
      const request = http.get(`http://127.0.0.1:${proxy.port}/_next/hmr?id=1`, { headers: { Connection: 'Upgrade', Upgrade: 'websocket' } });
      request.on('upgrade', (_response, socket) => resolve(socket));
      request.on('error', reject);
    });
    const socket = await upgraded;
    assert.equal((await fetch(`http://127.0.0.1:${proxy.controlPort}/drain`, { method: 'POST' })).status, 200);
    socket.destroy();
  } finally {
    await proxy.close();
    upstreamSocket?.destroy();
    upstream.closeAllConnections();
    await close(upstream);
  }
});
