'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { dictionaryEntrySchema, languages, phraseSchema } from '../lib/dictionary-entry';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Label } from 'react-aria-components';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { persistentToastOptions } from '../lib/toast-options';
import { addDictionaryEntry, editDictionaryEntry, deleteDictionaryEntry } from './dictionary-actions';
import { loadSessionEntries } from './learning-actions';
import { evaluateMeaningMatch } from './meaning-match-actions';

type Entry = { id: number; original: string; language: string; translation: string };
type Fields = { original: string; language: string; translation: string };

function showErrorToast(message: string) {
  toast.error(message, { ...persistentToastOptions, richColors: true });
}

export default function Dictionary({ entries, jevConfigured }: { entries: Entry[]; jevConfigured: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [dialogElement, setDialogElement] = useState<HTMLDialogElement | null>(null);
  const setDialogRef = useCallback((element: HTMLDialogElement | null) => { dialog.current = element; setDialogElement(element); }, []);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [learningDialog, setLearningDialog] = useState<HTMLDialogElement | null>(null);
  const learningWarningShown = useRef(false);
  const exitDialog = useRef<HTMLDialogElement>(null);
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const summaryBackRef = useRef<HTMLButtonElement>(null);
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
    if (!session && learningDialog && openLearningAfterSummary.current) {
      learningDialog.showModal();
      openLearningAfterSummary.current = false;
    }
  }, [session, learningDialog]);

  useEffect(() => {
    if (!session || exitDialog.current?.open) return;
    if (position >= session.length) summaryBackRef.current?.focus();
    else if (feedback !== null) {
      if (document.activeElement !== exitButtonRef.current) nextRef.current?.focus();
    }
    else answerRef.current?.focus();
  }, [session, position, feedback]);

  useEffect(() => {
    if (answerError && !evaluating && (document.activeElement === document.body || document.activeElement === submitRef.current)) {
      answerRef.current?.focus();
    }
  }, [answerError, evaluating]);

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
      if (!result.ok) { const message = 'Could not load entries. Check the database and try again.'; setLearningError(message); showErrorToast(message); return; }
      if (!result.entries.length) { const message = 'No entries remain for this language. Choose another language or add a phrase.'; setLearningError(message); showErrorToast(message); return; }
      const shuffled = [...result.entries];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setPosition(0); setAnswer(''); setAnswerError(''); setFeedback(null); setReviews([]);
      setSession(shuffled); learningDialog?.close();
    } catch { const message = 'Could not load entries. Check the database and try again.'; setLearningError(message); showErrorToast(message); }
    finally { setLoading(false); }
  }

  async function submitAnswer(event: React.FormEvent) {
    event.preventDefault();
    if (evaluationPending.current) return;
    const parsed = phraseSchema.safeParse(answer);
    if (!parsed.success) { setAnswerError(parsed.error.issues[0].message); showErrorToast('Check your answer and try again.'); answerRef.current?.focus(); return; }
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
      else { setAnswerError(result.error); showErrorToast(result.error); }
    } catch {
      if (generation === sessionGeneration.current) {
        const message = 'Could not evaluate your answer. Try again; another attempt may incur a provider charge.';
        setAnswerError(message); showErrorToast(message);
      }
    } finally {
      if (generation === sessionGeneration.current) { evaluationPending.current = false; setEvaluating(false); }
    }
  }
  const [fields, setFields] = useState<Fields>({ original: '', language: 'en', translation: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function openDialog(entry?: Entry) {
    setEditingId(entry?.id ?? null);
    setFields(entry ? { original: entry.original, language: entry.language, translation: entry.translation } : { original: '', language: 'en', translation: '' });
    setErrors({});
    setError('');
    dialog.current?.showModal();
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = dictionaryEntrySchema.safeParse(fields);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({ original: fieldErrors.original?.[0], language: fieldErrors.language?.[0], translation: fieldErrors.translation?.[0] });
      showErrorToast('Check the highlighted fields and try again.');
      return;
    }
    setErrors({});
    setError('');
    startTransition(async () => {
      try {
        const result = editingId === null ? await addDictionaryEntry(fields) : await editDictionaryEntry(editingId, fields);
        if (!result.ok) { setError(result.error); showErrorToast(result.error); return; }
        dialog.current?.close();
        setFields({ original: '', language: 'en', translation: '' });
        toast.success(editingId === null ? 'Phrase added.' : 'Phrase updated.');
        router.refresh();
      } catch {
        const message = 'Could not save phrase. Check the database and try again.';
        setError(message); showErrorToast(message);
      }
    });
  }

  function deleteEntry() {
    if (!entryToDelete) return;
    setDeleteError('');
    startTransition(async () => {
      try {
        const result = await deleteDictionaryEntry(entryToDelete.id);
        if (!result.ok) { setDeleteError(result.error); showErrorToast(result.error); return; }
        deleteDialog.current?.close();
        setEntryToDelete(null);
        if (result.deleted) toast.success('Phrase deleted.');
        router.refresh();
      } catch {
        const message = 'Could not delete phrase. Check the database and try again.';
        setDeleteError(message); showErrorToast(message);
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
        <p>Original phrase</p><p className="phrase font-bold">{entry.original}</p>
        <p>Estimated meaning-match score: <strong>{score}%</strong></p>
      </article>)}
      <div className="actions">
        <Button ref={summaryBackRef} onPress={() => { setReviews([]); setSession(null); }}>Return to dictionary</Button>
        <Button onPress={() => { setReviews([]); setSelectedLanguage(availableLanguages[0]?.code ?? ''); setLearningError(''); openLearningAfterSummary.current = true; setSession(null); }}>Start another session</Button>
      </div>
    </main>;
    const entry = session[position];
    return <main>
      <h1>Practice</h1>
      <Button ref={exitButtonRef} type="button" onPress={() => exitDialog.current?.showModal()}>Exit session</Button>
      <dialog ref={exitDialog} aria-labelledby="exit-title">
        <h2 id="exit-title">Exit session?</h2>
        <p>Unfinished progress will be discarded.</p>
        <div className="actions"><Button type="button" onPress={() => exitDialog.current?.close()}>Cancel</Button><Button type="button" onPress={() => { exitDialog.current?.close(); sessionGeneration.current++; evaluationPending.current = false; setEvaluating(false); setSession(null); setReviews([]); }}>Exit session</Button></div>
      </dialog>
      <p>{languages.find(language => language.code === selectedLanguage)?.name} — {position + 1} of {session.length}</p>
      <article>
        <p id="prompt-label">Translation</p>
        <div role="textbox" aria-readonly="true" aria-labelledby="prompt-label" className="phrase">{entry.translation}</div>
        {feedback !== null ? <><p>Estimated meaning-match score: <strong>{feedback}%</strong></p><p>Answer</p><p className="phrase">{answer}</p><p>Original phrase</p><p className="phrase font-bold">{entry.original}</p><Button ref={nextRef} onPress={() => { setReviews([...reviews, { entry, answer, score: feedback }]); setPosition(position + 1); setAnswer(''); setFeedback(null); }}>Next</Button></> :
          <form onSubmit={submitAnswer} noValidate>
            <label htmlFor="answer">Answer</label>
            <Textarea ref={answerRef} id="answer" readOnly={evaluating} value={answer} onChange={event => setAnswer(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} aria-invalid={!!answerError} aria-describedby={answerError ? 'answer-error' : undefined} />
            {answerError && <p id="answer-error" role="alert">{answerError}</p>}
            <Button type="submit" ref={submitRef} isDisabled={evaluating}>{evaluating ? 'Evaluating…' : 'Submit answer'}</Button>
          </form>}
      </article>
    </main>;
  }
  return <main>
    <h1>Dictionary</h1>
    <div className="button-row">
      {entries.length > 0 && <Button onPress={() => openDialog()}>Add phrase</Button>}
      <Button isDisabled={!entries.length} onPress={() => { setSelectedLanguage(availableLanguages[0]?.code ?? ''); setLearningError(''); learningDialog?.showModal(); if (!jevConfigured && !learningWarningShown.current) { learningWarningShown.current = true; toast.error('Learning provider is not configured.', { ...persistentToastOptions, id: 'learning-setup-warning' }); } }}>Start learning</Button>
    </div>
    <dialog ref={setLearningDialog} aria-labelledby="learning-title" onCancel={event => { if (loading) event.preventDefault(); }}>
      <h2 id="learning-title">Start learning</h2>
      <div className="phrase-field">
        <Select selectedKey={selectedLanguage || null} onSelectionChange={key => setSelectedLanguage(String(key))} isDisabled={loading}>
          <Label>Original language</Label>
          <SelectTrigger id="learning-language"><SelectValue /></SelectTrigger>
          <SelectContent portalContainer={learningDialog ?? undefined}>{availableLanguages.map(language => <SelectItem key={language.code} id={language.code}>{`${language.name} (${language.count})`}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {learningError && <p role="alert">{learningError}</p>}
      {!jevConfigured && <p role="alert">Set TYPESAFE_API_KEY in your local environment and restart the app to start learning.</p>}
      <div className="actions">
        <Button type="button" isDisabled={loading} onPress={() => learningDialog?.close()}>Cancel</Button>
        <Button isDisabled={!jevConfigured || loading || !selectedLanguage} onPress={startSession}>{loading ? 'Loading…' : 'Start session'}</Button>
      </div>
    </dialog>
    {entries.length === 0 ? <section aria-label="Empty dictionary"><p>Welcome! Add your first phrase to your dictionary.</p><Button onPress={() => openDialog()}>Add phrase</Button></section> : <section aria-label="Dictionary entries">
      {entries.map(entry => <article key={entry.id}>
        <p className="phrase font-bold">{entry.original}</p>
        <p>{languages.find(language => language.code === entry.language)?.name ?? entry.language}</p>
        <p className="phrase">{entry.translation}</p>
        <div className="button-row">
          <Button type="button" aria-label="Edit phrase" title="Edit phrase" onPress={() => openDialog(entry)}><Pencil aria-hidden="true" /></Button>
          <Button type="button" aria-label="Delete phrase" title="Delete phrase" onPress={() => { setDeleteError(''); setEntryToDelete(entry); deleteDialog.current?.showModal(); }}><Trash2 aria-hidden="true" /></Button>
        </div>
      </article>)}
    </section>}
    <dialog ref={deleteDialog} aria-labelledby="delete-title" onCancel={event => { if (pending) event.preventDefault(); }}>
      <h2 id="delete-title">Delete phrase?</h2>
      <p className="phrase">{entryToDelete?.original}</p>
      {deleteError && <p role="alert">{deleteError}</p>}
      <div className="actions"><Button type="button" isDisabled={pending} onPress={() => deleteDialog.current?.close()}>Cancel</Button><Button type="button" isDisabled={pending} onPress={deleteEntry}>Delete</Button></div>
    </dialog>
    <dialog ref={setDialogRef} aria-labelledby="dialog-title" onCancel={event => { if (pending) event.preventDefault(); }}>
      <h2 id="dialog-title">{editingId === null ? 'Add phrase' : 'Edit phrase'}</h2>
      <form onSubmit={save} noValidate>
        <div className="phrase-fields">
          <div className="phrase-field">
            <label htmlFor="original">Original phrase</label>
            <Textarea id="original" value={fields.original} onChange={event => setFields({ ...fields, original: event.target.value })} aria-invalid={!!errors.original} aria-describedby={errors.original ? 'original-error' : undefined} />
            {errors.original && <p id="original-error" role="alert">{errors.original}</p>}
          </div>
          <div className="phrase-field">
            <Select selectedKey={fields.language} onSelectionChange={key => setFields({ ...fields, language: String(key) })} isInvalid={!!errors.language}>
              <Label>Original language</Label>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent portalContainer={dialogElement ?? undefined}>{languages.map(language => <SelectItem key={language.code} id={language.code}>{language.name}</SelectItem>)}</SelectContent>
            </Select>
            {errors.language && <p role="alert">{errors.language}</p>}
          </div>
          <div className="phrase-field">
            <label htmlFor="translation">Translation</label>
            <Textarea id="translation" value={fields.translation} onChange={event => setFields({ ...fields, translation: event.target.value })} aria-invalid={!!errors.translation} aria-describedby={errors.translation ? 'translation-error' : undefined} />
            {errors.translation && <p id="translation-error" role="alert">{errors.translation}</p>}
          </div>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="actions"><Button type="button" isDisabled={pending} onPress={() => dialog.current?.close()}>Cancel</Button><Button type="submit" isDisabled={pending}>Save phrase</Button></div>
      </form>
    </dialog>
  </main>;
}
