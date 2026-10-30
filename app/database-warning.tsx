'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export default function DatabaseWarning() {
  useEffect(() => {
    toast.error('Database is not ready.', { id: 'database-setup-warning' });
  }, []);

  return <p role="alert">Database is not ready. Start PostgreSQL, check DATABASE_URL, run pnpm db:migrate, and refresh.</p>;
}
