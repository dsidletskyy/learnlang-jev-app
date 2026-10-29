'use client';

import { useState } from 'react';
import { checkServerConnection } from './actions';

export default function Home() {
  const [message, setMessage] = useState('');

  async function checkConnection() {
    try {
      setMessage(await checkServerConnection());
    } catch {
      setMessage('Server connection failed. Please try again.');
    }
  }

  return (
    <main>
      <h1>Language Learning</h1>
      <p>Local app foundation</p>
      <button type="button" onClick={checkConnection}>Check server connection</button>
      <p role="status">{message}</p>
    </main>
  );
}
