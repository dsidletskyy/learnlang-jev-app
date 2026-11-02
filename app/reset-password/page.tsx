import Link from 'next/link';
import ResetForm from './reset-form';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="p-6 space-y-4"><h1>Reset password</h1>{token ? <ResetForm token={token} /> : <p>This link is invalid or expired.</p>}<p><Link href="/forgot-password">Request another recovery link</Link></p><p><Link href="/sign-in">Sign in</Link></p></main>;
}
