import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';
if (process.env.TEST_DATABASE_URL !== testUrl) {
  throw new Error('TEST_DATABASE_URL must explicitly match the dedicated test database');
}
const connect = () => new pg.Client({ connectionString: testUrl, connectionTimeoutMillis: 3000 });
async function checkedClient() {
  const client = connect();
  await client.connect();
  const { rows } = await client.query('select current_database() as db, current_user as username');
  assert.deepEqual(rows[0], { db: 'language_test', username: 'language_test' });
  return client;
}
let client = await checkedClient();
await client.end();
execFileSync('pnpm', ['db:migrate'], { stdio: 'inherit', env: { ...process.env, DATABASE_URL: testUrl } });
client = await checkedClient();
const marker = randomInt(1, 2147483647);
await client.query('insert into database_ready (id) values ($1)', [marker]);
await client.end();
execFileSync('docker', ['compose', '-f', 'compose.test.yaml', 'up', '-d', '--force-recreate', '--wait'], { stdio: 'inherit' });
client = await checkedClient();
const { rows } = await client.query('select id from database_ready where id = $1', [marker]);
assert.deepEqual(rows, [{ id: marker }]);
await client.end();
console.log('Migration and persistence verified on dedicated test database.');
