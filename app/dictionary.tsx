'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { dictionaryEntrySchema, languages } from '../lib/dictionary-entry';
import { addDictionaryEntry, deleteDictionaryEntry } from './dictionary-actions';
import { loadSessionEntries } from './learning-actions';
import ConnectionCheck from './connection-check';

type Entry = { id: number; original: string; language: string; translation: string };
type Fields = { original: string; language: string; translation: string };

export default function Dictionary({ entries, jevConfigured }: { entries: Entry[]; jevConfigured: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const learningDialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [session, setSession] = useState<Entry[] | null>(null);
  const [position, setPosition] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [feedback, setFeedback] = useState(false);
  const [learningError, setLearningError] = useState('');
  const [loading, setLoading] = useState(false);
  const availableLanguages = languages.map(language => ({ ...language, count: entries.filter(entry => entry.language === language.code).length })).filter(language => language.count > 0);

  async function startSession() {
    setLoading(true);
    setLearningError('');
    try {
      const result = await loadSessionEntries(selectedLanguage);
      if (!result.ok) { setLearningError('Could not load entries. Check the database and try again.'); return; }
      if (!result.entries.length) { setLearningError('No entries remain for this language. Choose another language or add a phrase.'); return; }
      const shuffled = [...result.entries];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setPosition(0); setAnswer(''); setAnswerError(''); setFeedback(false);
      setSession(shuffled); learningDialog.current?.close();
    } catch { setLearningError('Could not load entries. Check the database and try again.'); }
    finally { setLoading(false); }
  }

  function submitAnswer(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed) { setAnswerError('Enter a value.'); return; }
    if (Array.from(trimmed).length > 2000) { setAnswerError('Use at most 2,000 Unicode code points.'); return; }
    if (trimmed.toLowerCase() !== session![position].original.trim().toLowerCase()) { setAnswerError('Only exact answers can be scored yet.'); return; }
    setAnswer(trimmed); setAnswerError(''); setFeedback(true);
  }
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

  function deleteEntry() {
    if (!entryToDelete) return;
    setDeleteError('');
    startTransition(async () => {
      try {
        const result = await deleteDictionaryEntry(entryToDelete.id);
        if (!result.ok) { setDeleteError(result.error); return; }
        deleteDialog.current?.close();
        setEntryToDelete(null);
        setConfirmation(result.deleted ? 'Phrase deleted.' : '');
        router.refresh();
      } catch {
        setDeleteError('Could not delete phrase. Check the database and try again.');
      }
    });
  }

  if (session) {
    if (position >= session.length) return <main><h1>Session complete</h1><button onClick={() => setSession(null)}>Return to dictionary</button></main>;
    const entry = session[position];
    return <main>
      <h1>Practice</h1>
      <p>{languages.find(language => language.code === selectedLanguage)?.name} — {position + 1} of {session.length}</p>
      <article>
        <label htmlFor="prompt">Translation</label>
        <textarea id="prompt" readOnly value={entry.translation} />
        {feedback ? <><p>Meaning-match score: <strong>100%</strong></p><p>Answer</p><p className="phrase">{answer}</p><p>Original phrase</p><p className="phrase">{entry.original}</p><button onClick={() => { setPosition(position + 1); setAnswer(''); setFeedback(false); }}>Next</button></> :
          <form onSubmit={submitAnswer} noValidate>
            <label htmlFor="answer">Answer</label>
            <textarea id="answer" value={answer} onChange={event => setAnswer(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} aria-invalid={!!answerError} aria-describedby={answerError ? 'answer-error' : undefined} />
            {answerError && <p id="answer-error" role="alert">{answerError}</p>}
            <button>Submit answer</button>
          </form>}
      </article>
    </main>;
  }
  return <main>
    <h1>Dictionary</h1>
    {entries.length > 0 && <button onClick={() => { setConfirmation(''); dialog.current?.showModal(); }}>Add phrase</button>}
    <button disabled={!entries.length} onClick={() => { setSelectedLanguage(availableLanguages[0]?.code ?? ''); setLearningError(''); learningDialog.current?.showModal(); }}>Start learning</button>
    <dialog ref={learningDialog} aria-labelledby="learning-title">
      <h2 id="learning-title">Start learning</h2>
      <label htmlFor="learning-language">Original language</label>
      <select id="learning-language" value={selectedLanguage} onChange={event => setSelectedLanguage(event.target.value)}>{availableLanguages.map(language => <option key={language.code} value={language.code}>{language.name} ({language.count})</option>)}</select>
      {learningError && <p role="alert">{learningError}</p>}
      {!jevConfigured && <p role="alert">Set TYPESAFE_API_KEY in your local environment and restart the app to start learning.</p>}
      <button type="button" disabled={loading} onClick={() => learningDialog.current?.close()}>Cancel</button>
      <button disabled={!jevConfigured || loading || !selectedLanguage} onClick={startSession}>{loading ? 'Loading…' : 'Start session'}</button>
    </dialog>
    {confirmation && <p role="status">{confirmation}</p>}
    {entries.length === 0 ? <section aria-label="Empty dictionary"><p>Welcome! Add your first phrase to your dictionary.</p><button onClick={() => { setConfirmation(''); dialog.current?.showModal(); }}>Add phrase</button></section> : <section aria-label="Dictionary entries">
      {entries.map(entry => <article key={entry.id}>
        <p className="phrase">{entry.original}</p>
        <p>{languages.find(language => language.code === entry.language)?.name ?? entry.language}</p>
        <p className="phrase">{entry.translation}</p>
        <button type="button" aria-label="Delete phrase" title="Delete phrase" onClick={() => { setConfirmation(''); setDeleteError(''); setEntryToDelete(entry); deleteDialog.current?.showModal(); }}><span aria-hidden="true">🗑</span></button>
      </article>)}
    </section>}
    <ConnectionCheck />
    <dialog ref={deleteDialog} aria-labelledby="delete-title" onCancel={event => { if (pending) event.preventDefault(); }}>
      <h2 id="delete-title">Delete phrase?</h2>
      <p className="phrase">{entryToDelete?.original}</p>
      {deleteError && <p role="alert">{deleteError}</p>}
      <div className="actions"><button type="button" disabled={pending} onClick={() => deleteDialog.current?.close()}>Cancel</button><button type="button" disabled={pending} onClick={deleteEntry}>Delete</button></div>
    </dialog>
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
