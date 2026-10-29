'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { dictionaryEntrySchema, languages } from '../lib/dictionary-entry';
import { addDictionaryEntry } from './dictionary-actions';
import ConnectionCheck from './connection-check';

type Entry = { id: number; original: string; language: string; translation: string };
type Fields = { original: string; language: string; translation: string };

export default function Dictionary({ entries }: { entries: Entry[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({ original: '', language: 'en', translation: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = dictionaryEntrySchema.safeParse(fields);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({ original: fieldErrors.original?.[0], language: fieldErrors.language?.[0], translation: fieldErrors.translation?.[0] });
      return;
    }
    setErrors({});
    setError('');
    startTransition(async () => {
      try {
        const result = await addDictionaryEntry(fields);
        if (!result.ok) { setError(result.error); return; }
        dialog.current?.close();
        setFields({ original: '', language: 'en', translation: '' });
        setConfirmation('Phrase added.');
        router.refresh();
      } catch {
        setError('Could not save phrase. Check the database and try again.');
      }
    });
  }

  return <main>
    <h1>Dictionary</h1>
    {entries.length > 0 && <button onClick={() => { setConfirmation(''); dialog.current?.showModal(); }}>Add phrase</button>}
    {confirmation && <p role="status">{confirmation}</p>}
    {entries.length === 0 ? <section aria-label="Empty dictionary"><p>Welcome! Add your first phrase to your dictionary.</p><button onClick={() => { setConfirmation(''); dialog.current?.showModal(); }}>Add phrase</button></section> : <section aria-label="Dictionary entries">
      {entries.map(entry => <article key={entry.id}>
        <p className="phrase">{entry.original}</p>
        <p>{languages.find(language => language.code === entry.language)?.name ?? entry.language}</p>
        <p className="phrase">{entry.translation}</p>
      </article>)}
    </section>}
    <ConnectionCheck />
    <dialog ref={dialog} aria-labelledby="add-title" onCancel={event => { if (pending) event.preventDefault(); }}>
      <h2 id="add-title">Add phrase</h2>
      <form onSubmit={save} noValidate>
        <label htmlFor="original">Original phrase</label>
        <textarea id="original" value={fields.original} onChange={event => setFields({ ...fields, original: event.target.value })} aria-invalid={!!errors.original} aria-describedby={errors.original ? 'original-error' : undefined} />
        {errors.original && <p id="original-error" role="alert">{errors.original}</p>}
        <label htmlFor="language">Original language</label>
        <select id="language" value={fields.language} onChange={event => setFields({ ...fields, language: event.target.value })} aria-invalid={!!errors.language}>
          {languages.map(language => <option key={language.code} value={language.code}>{language.name}</option>)}
        </select>
        {errors.language && <p role="alert">{errors.language}</p>}
        <label htmlFor="translation">Translation</label>
        <textarea id="translation" value={fields.translation} onChange={event => setFields({ ...fields, translation: event.target.value })} aria-invalid={!!errors.translation} aria-describedby={errors.translation ? 'translation-error' : undefined} />
        {errors.translation && <p id="translation-error" role="alert">{errors.translation}</p>}
        {error && <p role="alert">{error}</p>}
        <div className="actions"><button type="button" disabled={pending} onClick={() => dialog.current?.close()}>Cancel</button><button disabled={pending}>Save phrase</button></div>
      </form>
    </dialog>
  </main>;
}
