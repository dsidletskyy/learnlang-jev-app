import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import pg from 'pg';
import { requestPasswordRecovery, completePasswordRecovery } from '../../lib/password-recovery.ts';
import { recoveryAcknowledgment } from '../../lib/password-recovery-policy.ts';

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';

for (const lockSeed of [0, 1]) {
  test(`recovery rejects known and unknown identifiers under advisory lock ${lockSeed} and drains cleanup`, { timeout: 20000 }, async () => {
    assert.equal(process.env.TEST_DATABASE_URL, testUrl);
    const admin = new pg.Client({ connectionString: testUrl });
    await admin.connect();
    const namespace = `recovery_contention_${randomUUID().replaceAll('-', '')}`;
    await admin.query(`create schema "${namespace}"`);
    const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}`, application_name: namespace, connectionTimeoutMillis: 300 });
    const holder = await pool.connect();
    try {
      await pool.query((await readFile('drizzle/0003_better_auth.sql', 'utf8')).replaceAll('"public".', `"${namespace}".`));
      await pool.query(await readFile('drizzle/0005_password_recovery.sql', 'utf8'));
      await pool.query(`insert into "user" (id, name, email, email_verified) values ('u', 'User', 'contention-person@example.com', false)`);
      await pool.query(`insert into account (id, account_id, provider_id, user_id, password) values ('a', 'u', 'credential', 'u', 'old')`);
      let oldToken;
      await requestPasswordRecovery(pool, 'contention-person@example.com', 'http://localhost:3000', async (_, url) => { oldToken = new URL(url).searchParams.get('token'); });
      const responses = [];
      for (const email of ['contention-person@example.com', 'contention-unknown@example.com']) {
        await holder.query('select pg_advisory_lock(hashtextextended($1, $2))', [email, lockSeed]);
        const started = performance.now();
        responses.push(await recoveryAcknowledgment(() => requestPasswordRecovery(pool, email, 'http://localhost:3000', async () => { throw Error('unexpected delivery'); }), undefined, async () => {}, () => {}));
        assert.ok(performance.now() - started < 5000, 'lock wait must be bounded');
        await holder.query('select pg_advisory_unlock(hashtextextended($1, $2))', [email, lockSeed]);
      }
      assert.deepEqual(responses, Array(2).fill('Password recovery is temporarily unavailable. Please try again later.'));
      assert.equal(await completePasswordRecovery(pool, oldToken, 'a new unusual passphrase'), true, 'rejected request may leave old token valid');
      assert.equal((await admin.query("select count(*)::int n from pg_locks l join pg_stat_activity a on a.pid = l.pid where a.application_name = $1 and l.locktype = 'advisory'", [namespace])).rows[0].n, 0);
      assert.equal((await pool.query('show lock_timeout')).rows[0].lock_timeout, '0', 'session setting restored');
    } finally {
      await holder.query('select pg_advisory_unlock_all()');
      holder.release();
      await pool.end();
      await admin.query(`drop schema "${namespace}" cascade`);
      await admin.end();
    }
  });
}

test('pool acquisition timeout rejects without leaving queued recovery work', async () => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const pool = new pg.Pool({ connectionString: testUrl, max: 1, connectionTimeoutMillis: 200 });
  const holder = await pool.connect();
  try {
    await assert.rejects(requestPasswordRecovery(pool, 'contention-unknown@example.com', 'http://localhost:3000', async () => {}), /timeout/i);
    assert.equal(pool.waitingCount, 0);
  } finally { holder.release(); await pool.end(); }
});

test('sequential rate-limit and recovery contention stays below acknowledgment floor and drains', { timeout: 15000 }, async () => {
  const { consumeRecoveryAttempt } = await import('../../lib/auth-identifier-rate-limit.ts');
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const admin = new pg.Client({ connectionString: testUrl });
  await admin.connect();
  const namespace = `recovery_combined_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`create schema "${namespace}"`);
  const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}`, application_name: namespace, max: 5, connectionTimeoutMillis: 300 });
  const rate = await pool.connect();
  const delivery = await pool.connect();
  const identifier = await pool.connect();
  const row = await pool.connect();
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function waitForLock(query) {
    const deadline = performance.now() + 3000;
    while (performance.now() < deadline) {
      const result = await admin.query(`select 1 from pg_stat_activity where application_name = $1 and wait_event_type = 'Lock' and query like $2`, [namespace, `%${query}%`]);
      if (result.rowCount) return;
      await sleep(5);
    }
    throw Error(`Timed out waiting for ${query}`);
  }
  try {
    await pool.query((await readFile('drizzle/0003_better_auth.sql', 'utf8')).replaceAll('"public".', `"${namespace}".`));
    await pool.query(await readFile('drizzle/0004_auth_identifier_rate_limit.sql', 'utf8'));
    await pool.query(await readFile('drizzle/0005_password_recovery.sql', 'utf8'));
    await pool.query(`insert into "user" (id, name, email, email_verified) values ('u', 'User', 'known@example.com', false)`);
    await pool.query(`insert into account (id, account_id, provider_id, user_id, password) values ('a', 'u', 'credential', 'u', 'old')`);
    let oldToken;
    await requestPasswordRecovery(pool, 'known@example.com', 'http://localhost:3000', async (_, url) => { oldToken = new URL(url).searchParams.get('token'); });
    for (const email of ['known@example.com', 'unknown@example.com']) {
      await rate.query('BEGIN');
      await rate.query('LOCK TABLE auth_identifier_rate_limit IN ACCESS EXCLUSIVE MODE');
      await delivery.query('select pg_advisory_lock(hashtextextended($1, 1))', [email]);
      await identifier.query('select pg_advisory_lock(hashtextextended($1, 0))', [email]);
      await row.query('BEGIN');
      await row.query("select * from password_recovery where user_id = 'u' for update");
      const poolBlocker = await pool.connect();
      let floorWait;
      const started = performance.now();
      const response = recoveryAcknowledgment(async () => {
        const client = await pool.connect();
        try {
          if (await consumeRecoveryAttempt(client, email)) await requestPasswordRecovery(client, email, 'http://localhost:3000', async () => { throw Error('unexpected delivery'); });
        } finally { client.release(); }
      }, undefined, async ms => { floorWait = ms; }, () => {});
      while (!pool.waitingCount) await sleep(5);
      await sleep(50);
      poolBlocker.release();
      await waitForLock('INSERT INTO auth_identifier_rate_limit');
      await sleep(50);
      await rate.query('COMMIT');
      await waitForLock('pg_advisory_lock(hashtextextended');
      await sleep(50);
      await delivery.query('select pg_advisory_unlock(hashtextextended($1, 1))', [email]);
      await waitForLock('pg_advisory_xact_lock');
      await sleep(50);
      await identifier.query('select pg_advisory_unlock(hashtextextended($1, 0))', [email]);
      if (email === 'known@example.com') await waitForLock('INSERT INTO password_recovery');
      const result = await response;
      assert.equal(result, email === 'known@example.com' ? 'Password recovery is temporarily unavailable. Please try again later.' : 'If recovery is available, a link will be sent to the local inbox.');
      assert.ok(performance.now() - started < 2000, 'combined contention must remain well below floor');
      assert.ok(floorWait > 8000, 'acknowledgment must retain floor after all cleanup');
      await row.query('ROLLBACK');
      assert.equal(pool.waitingCount, 0);
    }
    assert.equal(await completePasswordRecovery(pool, oldToken, 'a new unusual passphrase'), true, 'rejected upsert preserves old token');
    assert.equal((await admin.query("select count(*)::int n from pg_locks l join pg_stat_activity a on a.pid = l.pid where a.application_name = $1 and l.locktype = 'advisory'", [namespace])).rows[0].n, 0);
    assert.equal((await pool.query('show lock_timeout')).rows[0].lock_timeout, '0');
    assert.equal((await pool.query('show statement_timeout')).rows[0].statement_timeout, '0');
  } finally {
    await rate.query('ROLLBACK'); await row.query('ROLLBACK');
    await delivery.query('select pg_advisory_unlock_all()'); await identifier.query('select pg_advisory_unlock_all()');
    rate.release(); delivery.release(); identifier.release(); row.release();
    await pool.end(); await admin.query(`drop schema "${namespace}" cascade`); await admin.end();
  }
});
