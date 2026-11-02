import Link from 'next/link';
import AuthForm from '../auth-form';
import ResendForm from '../resend-form';

export default function SignInPage() {
  return <main className="p-6 space-y-4"><h1>Sign in</h1><AuthForm mode="sign-in" /><p><Link href="/register">Register</Link></p><p>Verification is required before sign-in. Check the local inbox for your link.</p><ResendForm /></main>;
}
