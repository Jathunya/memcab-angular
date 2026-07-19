import { Injectable } from '@angular/core';
import { PartOfSpeech } from './models';

const OFFLINE_ERROR = 'Could not generate sentence. Please check your internet connection.';
const GENERATE_ENDPOINT = '/api/generate-sentence';

/** Keys from before API key handling moved server-side; purged on load so
 *  a stale, now-unused key doesn't linger in a returning user's browser. */
const LEGACY_KEY_STORAGE_KEYS = ['MEMCAB_GROQ_KEY', 'MEMCAB_GEMINI_KEY', 'MEMCAB_OPENAI_KEY'];

export interface CustomWordResult {
  term: string;
  thai: string;
  pronunciation: string;
  partOfSpeech: PartOfSpeech;
  sentence: string;
}

/**
 * Sentence generation is proxied through /api/generate-sentence (a Vercel
 * serverless function) rather than calling Groq directly from the browser --
 * this is what actually keeps GROQ_API_KEY out of the client bundle. See
 * api/generate-sentence.ts for the Groq call and prompt itself.
 *
 * Local dev: `ng serve` alone can't serve /api -- run `vercel dev` alongside
 * it (proxy.conf.json forwards /api/* to vercel dev's default port), or run
 * the whole app through `vercel dev` directly.
 */
@Injectable({ providedIn: 'root' })
export class SentenceService {
  constructor() {
    if (typeof localStorage !== 'undefined') {
      for (const key of LEGACY_KEY_STORAGE_KEYS) localStorage.removeItem(key);
    }
  }

  /** Translates an arbitrary user-typed word and writes an example sentence for it via the server-side Groq proxy. */
  async generateCustom(term: string): Promise<CustomWordResult> {
    try {
      const res = await fetch(GENERATE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      return (await res.json()) as CustomWordResult;
    } catch (err) {
      // Real cause (server misconfig, quota exhausted, malformed response,
      // network down, ...) logged for diagnosis; the UI only ever shows the
      // friendly OFFLINE_ERROR.
      console.error('[SentenceService] generateCustom failed:', err);
      throw new Error(OFFLINE_ERROR);
    }
  }
}
