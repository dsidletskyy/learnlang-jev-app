'use client';
import { useActionState } from 'react';
import { registerAction, signInAction } from './auth-actions';

export default function AuthForm({ mode }: { mode: 'register' | 'sign-in' }) {
  const [message, action, pending] = useActionState(mode === 'register' ? registerAction : signInAction, '');
  return <form action={action} className="grid gap-4 max-w-md">
    <label>Email <input className="block border p-2 w-full" name="email" type="email" autoComplete="email" required /></label>
    <label>Password <input className="block border p-2 w-full" name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required /></label>
    {mode === 'register' && <p>Use at least 12 characters. Common and compromised passwords are rejected.</p>}
    <button className="border p-2" disabled={pending}>{mode === 'register' ? 'Register' : 'Sign in'}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
