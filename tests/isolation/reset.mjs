import { execFileSync } from 'node:child_process';
import pg from 'pg';

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';
if (process.env.TEST_DATABASE_URL !== testUrl) {
  throw new Error('TEST_DATABASE_URL must explicitly match the dedicated test database');
}
const id = execFileSync('docker', ['compose', '-f', 'compose.test.yaml', 'ps', '-q', 'db'], { encoding: 'utf8' }).trim();
if (!id) throw new Error('Dedicated test container is unavailable');
const [container] = JSON.parse(execFileSync('docker', ['inspect', id], { encoding: 'utf8' }));
const ports = container.NetworkSettings.Ports['5432/tcp'];
if (!container.State.Running || container.Config.Labels['com.docker.compose.project'] !== 'language-learning-test' ||
    ports?.length !== 1 || ports[0].HostIp !== '127.0.0.1' || ports[0].HostPort !== '55432' ||
    !container.Mounts.some((mount) => mount.Name === 'language-learning-test_test_data' && mount.Destination === '/var/lib/postgresql/data')) {
  throw new Error('Unrecognized dedicated test container');
}
const client = new pg.Client({ connectionString: testUrl, connectionTimeoutMillis: 3000 });
try {
  await client.connect();
  const { rows } = await client.query('select current_database() as db, current_user as username');
  if (rows.length !== 1 || rows[0].db !== 'language_test' || rows[0].username !== 'language_test') {
    throw new Error('Connected database is not the dedicated test target');
  }
  execFileSync('pnpm', ['db:migrate'], { stdio: 'inherit', env: { ...process.env, DATABASE_URL: testUrl } });
  await client.query('truncate table database_ready');
} finally {
  await client.end();
}
