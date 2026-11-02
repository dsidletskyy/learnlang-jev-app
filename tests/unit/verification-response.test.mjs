import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verificationSucceeded } from '../../lib/verification-response.ts';

test('provider verification succeeds only for its exact success redirect', () => {
  const callback = 'http://127.0.0.1:3000/verification?status=success';
  const response = location => new Response(null, { status: 302, headers: { location } });
  assert.equal(verificationSucceeded(response(callback), callback), true);
  assert.equal(verificationSucceeded(response(`${callback}&error=INVALID_TOKEN`), callback), false);
  assert.equal(verificationSucceeded(response('https://evil.example/'), callback), false);
  assert.equal(verificationSucceeded(new Response('{}'), callback), false);
});
