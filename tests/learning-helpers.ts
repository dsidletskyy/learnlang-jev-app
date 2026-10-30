import type { Locator } from './isolation/fixture';

export async function selectOriginalLanguage(dialog: Locator, language: string) {
  await dialog.getByRole('button', { name: 'Original language' }).click();
  await dialog.getByRole('option', { name: language }).click();
}
