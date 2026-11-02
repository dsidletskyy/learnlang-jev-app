import Link from 'next/link';
import RecoveryRequestForm from './request-form';

export default function ForgotPasswordPage() {
  return <main className="p-6 space-y-4"><h1>Recover password</h1><p>Check the shared local inbox for a recovery link.</p><RecoveryRequestForm /><Link href="/sign-in">Sign in</Link></main>;
}
