'use client';
import { useActionState } from 'react';
import { requestRecoveryAction } from '../auth-actions';

export default function RecoveryRequestForm() {
  const [message, action, pending] = useActionState(requestRecoveryAction, '');
  return <form action={action} className="grid gap-4 max-w-md"><label>Email <input className="block border p-2 w-full" name="email" type="email" autoComplete="email" required /></label><button className="border p-2" disabled={pending}>Send recovery link</button>{message && <p role="status">{message}</p>}</form>;
}
