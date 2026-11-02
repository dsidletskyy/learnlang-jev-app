import Link from 'next/link';
import AuthForm from '../auth-form';
import ResendForm from '../resend-form';
import DatabaseWarning from '../database-warning';
import { checkDatabaseReady } from '../../db';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const ready = await checkDatabaseReady();
  return <main className="p-6 space-y-4"><h1>Sign in</h1>{!ready && <DatabaseWarning />}<AuthForm mode="sign-in" /><p><Link href="/register">Register</Link></p><p><Link href="/forgot-password">Forgot password?</Link></p><p>Verification is required before sign-in. Check the local inbox for your link.</p><ResendForm /></main>;
}
