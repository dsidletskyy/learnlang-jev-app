import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { sendVerificationMail } from '../../lib/verification-mail.ts';

test('verification SMTP deadline closes stalled connection before returning', async () => {
  let closed;
  const disconnected = new Promise(resolve => { closed = resolve; });
  const server = createServer(socket => {
    socket.on('close', closed);
    socket.write('220 test service ready\r\n');
    socket.on('data', () => {});
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(sendVerificationMail(server.address().port, 'person@example.com', 'http://localhost/verify?token=secret', 100));
    await disconnected;
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
