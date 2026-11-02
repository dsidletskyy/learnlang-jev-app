import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const BLOCKLIST_PATH = join(process.cwd(), 'data/password-blocklist/ncsc-100k-v1.txt');
const BLOCKLIST_SHA256 = 'c2e5696882c603b76bb67a47ee970897e5a76fc4c3f5547abe3d0ca340c576e0';

// Check only when creating a password; authentication of existing passwords must not depend on this file.
export async function checkPasswordBlocklist(
  password: string,
  readBlocklist: () => Promise<string> = () => readFile(BLOCKLIST_PATH, 'utf8'),
): Promise<'allowed' | 'blocked' | 'unavailable'> {
  try {
    const contents = await readBlocklist();
    if (createHash('sha256').update(contents).digest('hex') !== BLOCKLIST_SHA256) return 'unavailable';
    return contents.split(/\r?\n/).includes(password) ? 'blocked' : 'allowed';
  } catch {
    return 'unavailable';
  }
}
