/** A language Translate can read from or write into. */
export interface TranslateLanguage {
  /** BCP 47 code (`it`, `ja`, `pt-BR`). */
  code: string
  /** The name people pick: the language's own name (`Italiano`, `日本語`). */
  label: string
  /** The English name the model is told (`Italian`, `Japanese`). */
  name: string
}

export const translateLanguages: TranslateLanguage[] = [
  { code: 'en', label: 'English', name: 'English' },
  { code: 'it', label: 'Italiano', name: 'Italian' },
  { code: 'es', label: 'Español', name: 'Spanish' },
  { code: 'de', label: 'Deutsch', name: 'German' },
  { code: 'fr', label: 'Français', name: 'French' },
  { code: 'ja', label: '日本語', name: 'Japanese' },
]

export function findLanguage(code: string, languages: TranslateLanguage[] = translateLanguages): TranslateLanguage {
  return languages.find((l) => l.code === code) ?? translateLanguages.find((l) => l.code === code) ?? { code, label: code, name: code }
}

export function translateSystem(from: TranslateLanguage, to: TranslateLanguage): string {
  return `Translate the text from ${from.name} into ${to.name}. Keep the meaning, tone, names, numbers and line breaks. Do not explain or add notes. Return only the ${to.name} translation.`
}

/** Strip the preambles, labels and wrapping quotes small models sometimes add. */
export function cleanTranslation(text: string): string {
  return text
    .trim()
    .replace(/^(here('s| is)[^:\n]*:|translation[^:\n]*:)\s*/i, '')
    .replace(/^["“「](.*)["”」]$/s, '$1')
    .trim()
}
