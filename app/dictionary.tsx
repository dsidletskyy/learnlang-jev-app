'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { dictionaryEntrySchema, languages, phraseSchema } from '../lib/dictionary-entry';
import { Button } from '../components/ui/button';
import { addDictionaryEntry, editDictionaryEntry, deleteDictionaryEntry } from './dictionary-actions';
import { loadSessionEntries } from './learning-actions';
import { evaluateMeaningMatch } from './meaning-match-actions';

type Entry = { id: number; original: string; language: string; translation: string };
type Fields = { original: string; language: string; translation: string };

export default function Dictionary({ entries, jevConfigured }: { entries: Entry[]; jevConfigured: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const learningDialog = useRef<HTMLDialogElement>(null);
  const exitDialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [session, setSession] = useState<Entry[] | null>(null);
  const [position, setPosition] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [feedback, setFeedback] = useState<number | null>(null);
  const [reviews, setReviews] = useState<{ entry: Entry; answer: string; score: number }[]>([]);
  const openLearningAfterSummary = useRef(false);
  const [evaluating, setEvaluating] = useState(false);
  const evaluationPending = useRef(false);
  const sessionGeneration = useRef(0);
  const [learningError, setLearningError] = useState('');
  const [loading, setLoading] = useState(false);
  const availableLanguages = languages.map(language => ({ ...language, count: entries.filter(entry => entry.language === language.code).length })).filter(language => language.count > 0);

  useEffect(() => {
    if (!session && openLearningAfterSummary.current) {
      learningDialog.current?.showModal();
      openLearningAfterSummary.current = false;
    }
  }, [session]);

  useEffect(() => {
    if (!session || position >= session.length) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [session, position]);

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
      setPosition(0); setAnswer(''); setAnswerError(''); setFeedback(null); setReviews([]);
      setSession(shuffled); learningDialog.current?.close();
    } catch { setLearningError('Could not load entries. Check the database and try again.'); }
    finally { setLoading(false); }
  }

  async function submitAnswer(event: React.FormEvent) {
    event.preventDefault();
    if (evaluationPending.current) return;
    const parsed = phraseSchema.safeParse(answer);
    if (!parsed.success) { setAnswerError(parsed.error.issues[0].message); return; }
    const trimmed = parsed.data;
    setAnswer(trimmed); setAnswerError('');
    const entry = session![position];
    if (trimmed.toLowerCase() === entry.original.trim().toLowerCase()) { setFeedback(100); return; }
    const generation = sessionGeneration.current;
    evaluationPending.current = true; setEvaluating(true);
    try {
      const result = await evaluateMeaningMatch({ original: entry.original, answer: trimmed, language: entry.language });
      if (generation !== sessionGeneration.current) return;
      if (result.ok) setFeedback(result.score);
      else setAnswerError(result.error);
    } catch {
      if (generation === sessionGeneration.current) setAnswerError('Could not evaluate your answer. Try again; another attempt may incur a provider charge.');
    } finally {
      if (generation === sessionGeneration.current) { evaluationPending.current = false; setEvaluating(false); }
    }
  }
  const [fields, setFields] = useState<Fields>({ original: '', language: 'en', translation: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [pending, startTransition] = useTransition();

  function openDialog(entry?: Entry) {
    setEditingId(entry?.id ?? null);
    setFields(entry ? { original: entry.original, language: entry.language, translation: entry.translation } : { original: '', language: 'en', translation: '' });
    setErrors({});
    setError('');
    setConfirmation('');
    dialog.current?.showModal();
  }

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
        const result = editingId === null ? await addDictionaryEntry(fields) : await editDictionaryEntry(editingId, fields);
        if (!result.ok) { setError(result.error); return; }
        dialog.current?.close();
        setFields({ original: '', language: 'en', translation: '' });
        setConfirmation(editingId === null ? 'Phrase added.' : 'Phrase updated.');
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
    if (position >= session.length) return <main>
      <h1>Session complete</h1>
      <p>Average meaning-match score: <strong>{Math.round(reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length)}%</strong></p>
      {reviews.map(({ entry, answer, score }) => <article key={entry.id}>
        <p>Translation</p><p className="phrase">{entry.translation}</p>
        <p>Answer</p><p className="phrase">{answer}</p>
        <p>Original phrase</p><p className="phrase">{entry.original}</p>
        <p>Estimated meaning-match score: <strong>{score}%</strong></p>
      </article>)}
      <div className="actions">
        <Button onClick={() => { setReviews([]); setSession(null); }}>Return to dictionary</Button>
        <Button onClick={() => { setReviews([]); setSelectedLanguage(availableLanguages[0]?.code ?? ''); setLearningError(''); openLearningAfterSummary.current = true; setSession(null); }}>Start another session</Button>
      </div>
    </main>;
    const entry = session[position];
    return <main>
      <h1>Practice</h1>
      <Button type="button" onClick={() => exitDialog.current?.showModal()}>Exit session</Button>
      <dialog ref={exitDialog} aria-labelledby="exit-title">
        <h2 id="exit-title">Exit session?</h2>
        <p>Unfinished progress will be discarded.</p>
        <div className="actions"><Button type="button" onClick={() => exitDialog.current?.close()}>Cancel</Button><Button type="button" onClick={() => { exitDialog.current?.close(); sessionGeneration.current++; evaluationPending.current = false; setEvaluating(false); setSession(null); setReviews([]); }}>Exit session</Button></div>
      </dialog>
      <p>{languages.find(language => language.code === selectedLanguage)?.name} — {position + 1} of {session.length}</p>
      <article>
        <p id="prompt-label">Translation</p>
        <div role="textbox" aria-readonly="true" aria-labelledby="prompt-label" className="phrase">{entry.translation}</div>
        {feedback !== null ? <><p>Estimated meaning-match score: <strong>{feedback}%</strong></p><p>Answer</p><p className="phrase">{answer}</p><p>Original phrase</p><p className="phrase">{entry.original}</p><Button onClick={() => { setReviews([...reviews, { entry, answer, score: feedback }]); setPosition(position + 1); setAnswer(''); setFeedback(null); }}>Next</Button></> :
          <form onSubmit={submitAnswer} noValidate>
            <label htmlFor="answer">Answer</label>
            <textarea id="answer" readOnly={evaluating} value={answer} onChange={event => setAnswer(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} aria-invalid={!!answerError} aria-describedby={answerError ? 'answer-error' : undefined} />
            {answerError && <p id="answer-error" role="alert">{answerError}</p>}
            <Button disabled={evaluating}>{evaluating ? 'Evaluating…' : 'Submit answer'}</Button>
          </form>}
      </article>
    </main>;
  }
  return <main>
    <h1>Dictionary</h1>
    {entries.length > 0 && <Button onClick={() => openDialog()}>Add phrase</Button>}
    <Button disabled={!entries.length} onClick={() => { setSelectedLanguage(availableLanguages[0]?.code ?? ''); setLearningError(''); learningDialog.current?.showModal(); }}>Start learning</Button>
    <dialog ref={learningDialog} aria-labelledby="learning-title" onCancel={event => { if (loading) event.preventDefault(); }}>
      <h2 id="learning-title">Start learning</h2>
      <label htmlFor="learning-language">Original language</label>
      <select id="learning-language" value={selectedLanguage} onChange={event => setSelectedLanguage(event.target.value)}>{availableLanguages.map(language => <option key={language.code} value={language.code}>{language.name} ({language.count})</option>)}</select>
      {learningError && <p role="alert">{learningError}</p>}
      {!jevConfigured && <p role="alert">Set TYPESAFE_API_KEY in your local environment and restart the app to start learning.</p>}
      <Button type="button" disabled={loading} onClick={() => learningDialog.current?.close()}>Cancel</Button>
      <Button disabled={!jevConfigured || loading || !selectedLanguage} onClick={startSession}>{loading ? 'Loading…' : 'Start session'}</Button>
    </dialog>
    {confirmation && <p role="status">{confirmation}</p>}
    {entries.length === 0 ? <section aria-label="Empty dictionary"><p>Welcome! Add your first phrase to your dictionary.</p><Button onClick={() => openDialog()}>Add phrase</Button></section> : <section aria-label="Dictionary entries">
      {entries.map(entry => <article key={entry.id}>
        <p className="phrase">{entry.original}</p>
        <p>{languages.find(language => language.code === entry.language)?.name ?? entry.language}</p>
        <p className="phrase">{entry.translation}</p>
        <Button type="button" aria-label="Edit phrase" title="Edit phrase" onClick={() => openDialog(entry)}><span aria-hidden="true">✎</span></Button>
        <Button type="button" aria-label="Delete phrase" title="Delete phrase" onClick={() => { setConfirmation(''); setDeleteError(''); setEntryToDelete(entry); deleteDialog.current?.showModal(); }}><span aria-hidden="true">🗑</span></Button>
      </article>)}
    </section>}
    <dialog ref={deleteDialog} aria-labelledby="delete-title" onCancel={event => { if (pending) event.preventDefault(); }}>
      <h2 id="delete-title">Delete phrase?</h2>
      <p className="phrase">{entryToDelete?.original}</p>
      {deleteError && <p role="alert">{deleteError}</p>}
      <div className="actions"><Button type="button" disabled={pending} onClick={() => deleteDialog.current?.close()}>Cancel</Button><Button type="button" disabled={pending} onClick={deleteEntry}>Delete</Button></div>
    </dialog>
    <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={event => { if (pending) event.preventDefault(); }}>
      <h2 id="dialog-title">{editingId === null ? 'Add phrase' : 'Edit phrase'}</h2>
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
        <div className="actions"><Button type="button" disabled={pending} onClick={() => dialog.current?.close()}>Cancel</Button><Button disabled={pending}>Save phrase</Button></div>
      </form>
    </dialog>
  </main>;
}
