import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreMeaningMatch } from '../../lib/meaning-match.ts';

test('meaning-match sends only agreed task data through the SDK and normalizes score', async () => {
  let request;
  const fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return Response.json({ answers: { meaning: { type: 'score', score: 1, probabilities: [0, 1, 0], confidence: 1 } } });
  };
  const result = await scoreMeaningMatch({ original: 'Hello', answer: 'Greetings', language: 'en' }, { apiKey: 'test', fetch });
  assert.equal(result, 50);
  assert.deepEqual(request.body.state, { original: 'Hello', answer: 'Greetings', language: 'en' });
  assert.equal(request.body.model, 'jev-latest');
  assert.equal(request.url, 'https://api.typesafe.ai/v1/systemone');
  assert.equal(request.body.questions.meaning.type, 'score');
  assert.deepEqual(request.body.questions.meaning.criteria, [
    'The answer expresses a different meaning from the original phrase.',
    'The answer shares some meaning with the original phrase but differs in an important way or omits important meaning.',
    'The answer expresses the same meaning as the original phrase, even if worded differently.',
  ]);
  assert.equal(JSON.stringify(request.body).includes('translation'), false);
});

test('meaning-match accepts endpoints and rounds fractional scores, rejecting invalid scores', async () => {
  for (const [value, expected] of [[0, 0], [2, 100], [0.509, 25], [0.51, 26]]) {
    const fetch = async () => Response.json({ answers: { meaning: { score: value } } });
    assert.equal(await scoreMeaningMatch({ original: 'A', answer: 'B', language: 'en' }, { apiKey: 'test', fetch }), expected);
  }
  for (const value of [-1, 2.1, null, '1', 'bad']) {
    const fetch = async () => Response.json({ answers: { meaning: { score: value } } });
    await assert.rejects(scoreMeaningMatch({ original: 'A', answer: 'B', language: 'en' }, { apiKey: 'test', fetch }));
  }
});

test('meaning-match does not retry provider failures', async () => {
  let attempts = 0;
  const fetch = async () => { attempts++; return new Response('', { status: 503 }); };
  await assert.rejects(scoreMeaningMatch({ original: 'A', answer: 'B', language: 'en' }, { apiKey: 'test', fetch }));
  assert.equal(attempts, 1);
});

test('meaning-match uses a 30-second timeout and rejects a stalled response body', async t => {
  const timeout = AbortSignal.timeout;
  const delays = [];
  t.mock.method(AbortSignal, 'timeout', delay => {
    delays.push(delay);
    return timeout(20);
  });
  const fetch = async () => new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'application/json' } });
  const outcome = await Promise.race([
    scoreMeaningMatch({ original: 'A', answer: 'B', language: 'en' }, { apiKey: 'test', fetch }).then(() => 'success', () => 'failure'),
    new Promise(resolve => setTimeout(() => resolve('still waiting'), 1000)),
  ]);
  assert.equal(outcome, 'failure');
  assert.deepEqual(delays, [30000]);
});
