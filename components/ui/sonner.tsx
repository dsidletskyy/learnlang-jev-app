'use client';

import { useEffect, useRef } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    function moveToActiveDialog() {
      const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
      (dialogs[dialogs.length - 1] ?? document.body).appendChild(element!);
    }
    const observer = new MutationObserver(moveToActiveDialog);
    observer.observe(document.body, { attributes: true, attributeFilter: ['open'], subtree: true });
    moveToActiveDialog();
    return () => { observer.disconnect(); document.body.appendChild(element); };
  }, []);
  return <div ref={host}><Sonner
    theme="light"
    duration={5000}
    style={{ '--normal-bg': '#ffffff', '--normal-text': '#233448', '--normal-border': '#d5e0ea', '--error-bg': '#fff4f4', '--error-text': '#8a2525', '--error-border': '#e2b4b4', '--border-radius': '.5rem' } as React.CSSProperties}
    {...props}
  /></div>;
}
