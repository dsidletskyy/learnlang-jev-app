import './globals.css';
import type { ReactNode } from 'react';
import { Toaster } from '../components/ui/sonner';

export const metadata = { title: 'Language Learning' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}<Toaster /></body></html>;
}
