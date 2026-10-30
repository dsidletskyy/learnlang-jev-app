'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
  return <Sonner
    theme="light"
    duration={5000}
    style={{ '--normal-bg': '#ffffff', '--normal-text': '#233448', '--normal-border': '#d5e0ea', '--border-radius': '.5rem' } as React.CSSProperties}
    {...props}
  />;
}
