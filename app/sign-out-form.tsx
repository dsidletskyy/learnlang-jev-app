'use client';

import { useActionState } from 'react';
import { signOutAction, signOutAllSessionsAction } from './auth-actions';

export default function SignOutForm() {
  const [message, action, pending] = useActionState(signOutAction, '');
  const [allMessage, allAction, allPending] = useActionState(signOutAllSessionsAction, '');
  return <>
    <form action={action}><button type="submit" disabled={pending}>Sign out</button>{message && <p role="alert">{message}</p>}</form>
    <form action={allAction}><button type="submit" disabled={allPending}>Revoke all sessions</button>{allMessage && <p role="alert">{allMessage}</p>}</form>
  </>;
}
