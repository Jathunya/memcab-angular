import { Injectable } from '@angular/core';
import { PartOfSpeech } from './models';

const POS_VALUES: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'phrase', 'adverb'];

const OFFLINE_ERROR = 'Could not generate sentence. Please check your internet connection.';
const MISSING_KEY_ERROR = 'Please add your Groq API key to generate sentences.';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export const GROQ_API_KEY_STORAGE_KEY = 'MEMCAB_GROQ_KEY';

/** Legacy keys from earlier provider integrations; purged on load so a stale
 *  key never lingers in localStorage once Groq is the provider. */
const LEGACY_KEY_STORAGE_KEYS = ['MEMCAB_GEMINI_KEY', 'MEMCAB_OPENAI_KEY'];

/**
 * Local-dev convenience only: paste a key here to skip the in-app "Set API key"
 * field. NEVER commit a real key in this constant — it ships in the compiled
 * client bundle (readable via DevTools by anyone who loads the app) and, if
 * committed, is permanently in git history. Prefer the localStorage-backed
 * key field in Sentence Lab (see hasApiKey()/saveApiKey() below); it never
 * touches source control or the bundle.
 */
const GROQ_API_KEY_FALLBACK = '';

export interface CustomWordResult {
  term: string;
  thai: string;
  pronunciation: string;
  partOfSpeech: PartOfSpeech;
  sentence: string;
}

@Injectable({ providedIn: 'root' })
export class SentenceService {
  constructor() {
    if (typeof localStorage !== 'undefined') {
      for (const key of LEGACY_KEY_STORAGE_KEYS) localStorage.removeItem(key);
    }
  }

  hasApiKey(): boolean {
    return !!this.getApiKey();
  }

  saveApiKey(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(GROQ_API_KEY_STORAGE_KEY, key.trim());
  }

  /** Translates an arbitrary user-typed word and writes an example sentence for it via Groq. */
  async generateCustom(term: string): Promise<CustomWordResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error(MISSING_KEY_ERROR);
    }

    try {
      // A one-shot example plus explicit "never leave empty" guidance keeps the
      // free-tier Llama model from dropping the Thai-script field under strict
      // "Thai only" wording — verified empirically against several test words.
      const prompt =
        `You are a Thai-English dictionary assistant. Given the English word "${term}", ` +
        `output ONLY a single valid JSON object (no markdown, no commentary) with exactly ` +
        `these fields: word, partOfSpeech, sentence, translation, pronunciation.\n\n` +
        `Field rules:\n` +
        `- word: the given English word, exactly as provided.\n` +
        `- partOfSpeech: one of noun, verb, adjective, adverb, phrase.\n` +
        `- sentence: one natural, high-quality English example sentence using the word.\n` +
        `- translation: the Thai word for it, written using actual Thai script characters ` +
        `(e.g. สวย, วิ่ง, แมว). This field must never be left empty.\n` +
        `- pronunciation: the dictionary-standard IPA (International Phonetic Alphabet) transcription ` +
        `of the ENGLISH word itself, wrapped in slashes (e.g. "/kaʊ/" for "cow", "/ˈbjuːtɪfəl/" for ` +
        `"beautiful").\n\n` +
        `Example for the word "beautiful":\n` +
        `{"word":"beautiful","partOfSpeech":"adjective","sentence":"The sunset was beautiful.",` +
        `"translation":"สวย","pronunciation":"/ˈbjuːtɪfəl/"}\n\n` +
        `Now respond with the JSON object for "${term}" only.`;

      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Groq request failed (${res.status}): ${errBody}`);
      }

      const data = await res.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('Empty Groq response');
      }

      const parsed = JSON.parse(text);
      if (!parsed?.translation || !parsed?.sentence) {
        throw new Error('Malformed Groq response');
      }

      const partOfSpeech: PartOfSpeech = POS_VALUES.includes(parsed.partOfSpeech)
        ? parsed.partOfSpeech
        : 'noun';

      return {
        term,
        thai: parsed.translation,
        pronunciation: parsed.pronunciation ?? '',
        partOfSpeech,
        sentence: parsed.sentence,
      };
    } catch (err) {
      // Real cause (bad key, quota exhausted, malformed JSON, network down, ...)
      // logged for diagnosis; the UI only ever shows the friendly OFFLINE_ERROR.
      console.error('[SentenceService] generateCustom failed:', err);
      throw new Error(OFFLINE_ERROR);
    }
  }

  private getApiKey(): string {
    if (typeof localStorage === 'undefined') return GROQ_API_KEY_FALLBACK;
    const stored = localStorage.getItem(GROQ_API_KEY_STORAGE_KEY)?.trim();
    return stored || GROQ_API_KEY_FALLBACK;
  }
}
