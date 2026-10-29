import { score, TypeSafeClient } from '@typesafe-ai/sdk';

type Task = { original: string; answer: string; language: string };
type Options = { apiKey: string; baseURL?: string; fetch?: typeof fetch };

export async function scoreMeaningMatch(task: Task, options: Options): Promise<number> {
  const client = new TypeSafeClient({ ...options, compression: false, logLevel: 'off', retry: { maxRetries: 0 }, timeout: 30000 });
  const response = await client.systemOne({
    model: 'jev-latest',
    state: { original: task.original, answer: task.answer, language: task.language },
    questions: { meaning: score('How closely does the answer match the meaning of the original phrase?', [
      'The answer expresses a different meaning from the original phrase.',
      'The answer shares some meaning with the original phrase but differs in an important way or omits important meaning.',
      'The answer expresses the same meaning as the original phrase, even if worded differently.',
    ]) },
  }, { signal: AbortSignal.timeout(30000) });
  const value = response.answers.meaning.score;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 2) throw new Error('Invalid score');
  return Math.round(value / 2 * 100);
}
