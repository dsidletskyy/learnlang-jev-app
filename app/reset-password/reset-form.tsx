'use client';
import { useActionState, useState } from 'react';
import { resetPasswordAction } from '../auth-actions';

export default function ResetForm({ token }: { token: string }) {
  const [message, action, pending] = useActionState(resetPasswordAction, '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  return <form action={action} className="grid gap-4 max-w-md"><input type="hidden" name="token" value={token} /><label>New password <input className="block border p-2 w-full" type="password" name="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required /></label><label>Confirm password <input className="block border p-2 w-full" type="password" name="confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" required /></label><p>Use at least 12 characters. Common and compromised passwords are rejected.</p><button className="border p-2" disabled={pending}>Reset password</button>{message && <p role="status">{message}</p>}</form>;
}
