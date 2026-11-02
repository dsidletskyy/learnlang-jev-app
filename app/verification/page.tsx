import Link from 'next/link';
import ResendForm from '../resend-form';

export default async function VerificationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return <main className="p-6 space-y-4"><h1>Email verification</h1>{status === 'success' ? <p>Verification complete. Sign in manually to continue.</p> : <p>This link is invalid or expired. Please request another verification link.</p>}<Link href="/sign-in">Sign in</Link>{status !== 'success' && <ResendForm />}</main>;
}
