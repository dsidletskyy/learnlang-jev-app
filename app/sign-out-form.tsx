'use client';

import { useActionState } from 'react';
import { signOutAction } from './auth-actions';

export default function SignOutForm() {
  const [message, action, pending] = useActionState(signOutAction, '');
  return <form action={action}><button type="submit" disabled={pending}>Sign out</button>{message && <p role="alert">{message}</p>}</form>;
}
