import { z } from 'zod';

export const languages = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'uk', name: 'Ukrainian' },
] as const;

const phrase = z.string().trim().min(1, 'Enter a value.').refine(
  value => Array.from(value).length <= 2000,
  'Use at most 2,000 Unicode code points.',
);

export const dictionaryEntrySchema = z.object({
  original: phrase,
  language: z.string().refine(value => languages.some(language => language.code === value), 'Select a supported language.'),
  translation: phrase,
});
