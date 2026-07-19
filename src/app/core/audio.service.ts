import { Injectable, inject, signal } from '@angular/core';
import { StoreService } from './store.service';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly store = inject(StoreService);

  readonly isTtsSupported = signal(typeof window !== 'undefined' && 'speechSynthesis' in window);
  readonly isSttSupported = signal(
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );
  readonly isListening = signal(false);

  speak(text: string, lang: 'th-TH' | 'en-US' = 'th-TH'): void {
    if (!this.isTtsSupported()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = this.store.ttsRate();
    window.speechSynthesis.speak(utterance);
  }

  listen(lang: 'th-TH' | 'en-US' = 'th-TH'): Promise<string> {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      console.warn('[AudioService] SpeechRecognition/webkitSpeechRecognition unavailable in this browser.');
      return Promise.reject(new Error('Speech recognition unsupported'));
    }

    return new Promise((resolve, reject) => {
      const recognition = new Recognition();
      recognition.lang = lang;
      recognition.maxAlternatives = 1;
      recognition.interimResults = false;

      this.isListening.set(true);

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0]?.[0]?.transcript ?? '';
        resolve(transcript);
      };
      recognition.onerror = (event: { error: string }) => {
        reject(new Error(event.error));
      };
      recognition.onend = () => {
        this.isListening.set(false);
      };

      recognition.start();
    });
  }

  /** Lowercases, trims, and strips trailing/embedded punctuation so "Coffee." matches "coffee". */
  private normalize(s: string): string {
    return s
      .trim()
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** 0..1 similarity ratio between two strings (normalized Levenshtein distance). */
  similarity(a: string, b: string): number {
    const s1 = this.normalize(a);
    const s2 = this.normalize(b);
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;

    const rows = s1.length + 1;
    const cols = s2.length + 1;
    const dist = Array.from({ length: rows }, (_, i) => {
      const row = new Array<number>(cols).fill(0);
      row[0] = i;
      return row;
    });
    for (let j = 0; j < cols; j++) dist[0][j] = j;

    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
      }
    }

    const distance = dist[rows - 1][cols - 1];
    const maxLen = Math.max(s1.length, s2.length);
    return maxLen ? 1 - distance / maxLen : 1;
  }
}
