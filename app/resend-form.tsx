'use client';
import { useActionState } from 'react';
import { resendVerificationAction } from './auth-actions';

export default function ResendForm() {
  const [message, action, pending] = useActionState(resendVerificationAction, '');
  return <form action={action} className="grid gap-4 max-w-md"><label>Email for verification <input className="block border p-2 w-full" name="email" type="email" autoComplete="email" required /></label><button className="border p-2" disabled={pending}>Resend verification</button>{message && <p role="status">{message}</p>}</form>;
}
