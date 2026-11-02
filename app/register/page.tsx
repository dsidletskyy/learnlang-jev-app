import Link from 'next/link';
import AuthForm from '../auth-form';

export default function RegisterPage() {
  return <main className="p-6 space-y-4"><h1>Register</h1><AuthForm mode="register" /><p>Open the local inbox at <a href="http://127.0.0.1:8025">127.0.0.1:8025</a> to verify your account. This shared inbox proves access to the inbox, not ownership of an external mailbox. Anyone with inbox access can access accounts.</p><p><Link href="/sign-in">Sign in</Link></p></main>;
}
