import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import pg from 'pg';
import { requestPasswordRecovery, completePasswordRecovery } from '../../lib/password-recovery.ts';
import { recoveryAcknowledgment } from '../../lib/password-recovery-policy.ts';

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';

for (const lockSeed of [0, 1]) {
  test(`recovery preserves supersession after advisory lock ${lockSeed} outlasts acknowledgment floor`, { timeout: 30000 }, async () => {
    assert.equal(process.env.TEST_DATABASE_URL, testUrl);
    const admin = new pg.Client({ connectionString: testUrl });
    await admin.connect();
    const namespace = `recovery_contention_${randomUUID().replaceAll('-', '')}`;
    await admin.query(`create schema "${namespace}"`);
    const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}`, application_name: namespace });
    const holder = await pool.connect();
    let pending;
    try {
      await pool.query((await readFile('drizzle/0003_better_auth.sql', 'utf8')).replaceAll('"public".', `"${namespace}".`));
      await pool.query(await readFile('drizzle/0005_password_recovery.sql', 'utf8'));
      await pool.query(`insert into "user" (id, name, email, email_verified) values ('u', 'User', 'person@example.com', false)`);
      await pool.query(`insert into account (id, account_id, provider_id, user_id, password) values ('a', 'u', 'credential', 'u', 'old')`);
      let oldToken;
      await requestPasswordRecovery(pool, 'person@example.com', 'http://localhost:3000', async (_, url) => { oldToken = new URL(url).searchParams.get('token'); });
      await holder.query('select pg_advisory_lock(hashtextextended($1, $2))', ['person@example.com', lockSeed]);
      let knownDone = false;
      pending = recoveryAcknowledgment(() => requestPasswordRecovery(pool, 'person@example.com', 'http://localhost:3000', async () => { throw Error('delivery failed'); }), undefined, undefined, () => {}).then(value => { knownDone = true; return value; });
      const deadline = Date.now() + 5000;
      let blocked = false;
      while (Date.now() < deadline) {
        blocked = (await admin.query("select 1 from pg_stat_activity where application_name = $1 and wait_event_type = 'Lock'", [namespace])).rowCount > 0;
        if (blocked) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.equal(blocked, true, 'known request must wait on held lock');
      const started = performance.now();
      const unknown = await recoveryAcknowledgment(() => requestPasswordRecovery(pool, 'unknown@example.com', 'http://localhost:3000', async () => { throw Error('unexpected delivery'); }));
      assert.ok(performance.now() - started >= 9900);
      assert.equal(knownDone, false, 'known request remains blocked beyond unknown acknowledgment');
      await holder.query('select pg_advisory_unlock(hashtextextended($1, $2))', ['person@example.com', lockSeed]);
      const originalError = console.error;
      console.error = () => {};
      try { assert.equal(await pending, unknown); } finally { console.error = originalError; }
      pending = undefined;
      assert.equal(await completePasswordRecovery(pool, oldToken, 'a new unusual passphrase'), false, 'failed delivery still supersedes old token');
      assert.equal((await admin.query("select count(*)::int n from pg_locks l join pg_stat_activity a on a.pid = l.pid where a.application_name = $1 and l.locktype = 'advisory'", [namespace])).rows[0].n, 0);
    } finally {
      await holder.query('select pg_advisory_unlock_all()');
      holder.release();
      if (pending) await pending;
      await pool.end();
      await admin.query(`drop schema "${namespace}" cascade`);
      await admin.end();
    }
  });
}
