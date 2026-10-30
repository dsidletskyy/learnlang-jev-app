'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { persistentToastOptions } from '../lib/toast-options';

export default function DatabaseWarning() {
  useEffect(() => {
    toast.error('Database is not ready.', { ...persistentToastOptions, id: 'database-setup-warning' });
  }, []);

  return <p role="alert">Database is not ready. Start PostgreSQL, check DATABASE_URL, run pnpm db:migrate, and refresh.</p>;
}
