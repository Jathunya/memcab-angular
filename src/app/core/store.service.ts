import { Injectable, computed, effect, signal } from '@angular/core';
import { BADGES, VOCAB } from './data';
import {
  Folder,
  GameBest,
  GameMode,
  GameResult,
  MasteryStatus,
  Progress,
  Word,
} from './models';

const FOLDERS_KEY = 'memcab_folders';
const PROGRESS_KEY = 'memcab_progress';
const USER_KEY = 'memcab_user';
const SETTINGS_KEY = 'memcab_settings';

/** Decks and progress are per-account; scoping the storage key by uid is
 * what actually prevents one signed-in user from reading another's data on
 * a shared browser. Settings stay on the unscoped key deliberately — they're
 * treated as a device preference, not account data. */
function scopedKey(base: string, uid: string): string {
  return `${base}::${uid}`;
}

export type ModalState =
  | { type: 'folder'; folder?: Folder }
  | { type: 'word'; folderId: string; word?: Word }
  | { type: 'move'; folderId: string; wordIds: string[] }
  | { type: 'save-word'; word: Omit<Word, 'id'> }
  | {
      type: 'confirm';
      title: string;
      body: string;
      confirmLabel: string;
      onConfirm: () => void;
    };

interface Settings {
  quizTime: number;
  darkMode: boolean;
  ttsRate: number;
  soundEnabled: boolean;
}

function defaultSettings(): Settings {
  return { quizTime: 15, darkMode: false, ttsRate: 1, soundEnabled: true };
}

function todayStr(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultProgress(): Progress {
  return {
    mastery: {},
    bests: {},
    streak: 0,
    points: 0,
    reviewedToday: 0,
    lastReviewDate: null,
    lastActiveDate: null,
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) ? parsed : fallback) as T;
    }
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly _user = signal<{ name: string } | null>(readJson(USER_KEY, null as any));
  // Folders/progress are intentionally NOT read from storage here: which
  // account they belong to isn't known until Firebase resolves a uid, which
  // happens asynchronously after this service is constructed. They're
  // populated by setActiveUser() once that uid is known, from a key scoped
  // to that uid — never from an unscoped, cross-account bucket.
  private readonly _folders = signal<Folder[]>([]);
  private readonly _progress = signal<Progress>(defaultProgress());
  private readonly _settings = signal<Settings>(readJson(SETTINGS_KEY, defaultSettings()));
  private readonly _uid = signal<string | null>(null);
  private readonly _activeModal = signal<ModalState | null>(null);
  private readonly _activeDeckId = signal<string | null>(null);
  private readonly _lastResult = signal<GameResult | null>(null);

  readonly user = this._user.asReadonly();
  readonly folders = this._folders.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly quizTime = computed(() => this._settings().quizTime);
  readonly darkMode = computed(() => this._settings().darkMode);
  readonly ttsRate = computed(() => this._settings().ttsRate);
  readonly soundEnabled = computed(() => this._settings().soundEnabled);
  readonly activeModal = this._activeModal.asReadonly();
  readonly activeDeckId = this._activeDeckId.asReadonly();
  readonly lastResult = this._lastResult.asReadonly();

  readonly masteredCount = computed(
    () => Object.values(this._progress().mastery).filter((s) => s === 'mastered').length,
  );
  readonly learningCount = computed(
    () => Object.values(this._progress().mastery).filter((s) => s === 'learning').length,
  );
  readonly allWords = computed<Word[]>(() => {
    // Custom deck words go first so they're immediately reachable in Daily
    // Review and in the home page's short "today's words" preview, instead
    // of being buried behind the entire core VOCAB list. Words are kept
    // distinct by id (not deduped by translation text) so a custom word
    // always appears as its own card, even if its English gloss happens to
    // match a core VOCAB word.
    const customWords = this._folders().flatMap((f) => f.words);
    return [...customWords, ...VOCAB];
  });

  readonly totalTrackedCount = computed(() => this.allWords().length);
  readonly masteryPercent = computed(() => {
    const total = this.allWords().length;
    return total ? Math.round((this.masteredCount() / total) * 100) : 0;
  });

  readonly reviewQueue = computed(() =>
    this.allWords().filter(
      (word) => (this._progress().mastery[word.id] ?? 'new') !== 'mastered',
    ),
  );

  readonly todaysWords = computed(() => {
    const queue = this.reviewQueue();
    return (queue.length ? queue : this.allWords()).slice(0, 5);
  });

  readonly reviewDecks = computed<{ id: string; name: string; count: number }[]>(() =>
    this._folders().map((f) => ({ id: f.id, name: f.name, count: f.words.length })),
  );

  /**
   * Builds a review queue scoped to the given deck ids ('default' = core
   * VOCAB, otherwise a folder id). An empty/undefined selection falls back
   * to the full reviewQueue (all decks combined) as the default behavior.
   */
  reviewQueueForDecks(selectedDeckIds: readonly string[] | null | undefined): Word[] {
    if (!selectedDeckIds || !selectedDeckIds.length) return this.reviewQueue();
    const idSet = new Set(selectedDeckIds);
    const words: Word[] = [];
    for (const folder of this._folders()) {
      if (idSet.has(folder.id)) words.push(...folder.words);
    }
    if (idSet.has('default')) words.push(...VOCAB);
    const mastery = this._progress().mastery;
    return words.filter((word) => (mastery[word.id] ?? 'new') !== 'mastered');
  }

  readonly earnedBadges = computed(() =>
    BADGES.filter((b) => b.isEarned(this._progress(), this._folders())),
  );

  readonly activeDeckWords = computed<Word[]>(() => {
    const id = this._activeDeckId();
    if (!id || id === 'default') return VOCAB;
    return this._folders().find((f) => f.id === id)?.words ?? VOCAB;
  });

  readonly activeDeckName = computed(() => {
    const id = this._activeDeckId();
    if (!id || id === 'default') return 'Core Vocabulary';
    return this._folders().find((f) => f.id === id)?.name ?? 'Core Vocabulary';
  });

  constructor() {
    effect(() => {
      const activeUid = this._uid();
      if (!activeUid || typeof localStorage === 'undefined') return;
      localStorage.setItem(scopedKey(FOLDERS_KEY, activeUid), JSON.stringify(this._folders()));
    });
    effect(() => {
      const activeUid = this._uid();
      if (!activeUid || typeof localStorage === 'undefined') return;
      localStorage.setItem(scopedKey(PROGRESS_KEY, activeUid), JSON.stringify(this._progress()));
    });
    effect(() => {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this._settings()));
    });
    effect(() => {
      if (typeof document === 'undefined') return;
      document.body.classList.toggle('dark', this._settings().darkMode);
    });
    effect(() => {
      if (typeof localStorage === 'undefined') return;
      const user = this._user();
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    });
  }

  // ---- auth ----
  login(name: string): void {
    this._user.set({ name: name.trim() || 'Learner' });
  }

  logout(): void {
    this._user.set(null);
  }

  /**
   * Called by AuthService on every Firebase auth-state transition (sign in,
   * sign out, or switching accounts in the same tab). Swaps the entire
   * decks/progress dataset to the one scoped to `uid`, synchronously — so
   * there's never a moment where the previous account's in-memory data is
   * visible under the new account, even before any persistence effect runs.
   */
  setActiveUser(uid: string | null): void {
    if (uid === this._uid()) return;
    this._uid.set(uid);
    if (uid) {
      this._folders.set(readJson(scopedKey(FOLDERS_KEY, uid), [] as Folder[]));
      this._progress.set(readJson(scopedKey(PROGRESS_KEY, uid), defaultProgress()));
    } else {
      this._folders.set([]);
      this._progress.set(defaultProgress());
    }
  }

  // ---- settings ----
  setQuizTime(seconds: number): void {
    this._settings.update((s) => ({ ...s, quizTime: seconds }));
  }

  setDarkMode(enabled: boolean): void {
    this._settings.update((s) => ({ ...s, darkMode: enabled }));
  }

  setTtsRate(rate: number): void {
    this._settings.update((s) => ({ ...s, ttsRate: rate }));
  }

  setSoundEnabled(enabled: boolean): void {
    this._settings.update((s) => ({ ...s, soundEnabled: enabled }));
  }

  resetProgress(): void {
    this._progress.set(defaultProgress());
  }

  /**
   * Wipes decks and progress for account deletion, in memory and on disk.
   * Takes `uid` explicitly rather than reading `_uid()` because Firebase's
   * onAuthStateChanged(null) can fire (and clear `_uid` via setActiveUser)
   * before or after deleteUser() resolves — the caller must pass the uid
   * it captured before deletion so the right scoped keys get purged either way.
   * Device-level settings (theme, TTS rate) are left untouched.
   */
  wipeAllData(uid: string): void {
    this._folders.set([]);
    this._progress.set(defaultProgress());
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(scopedKey(FOLDERS_KEY, uid));
    localStorage.removeItem(scopedKey(PROGRESS_KEY, uid));
  }

  // ---- modal ----
  openModal(state: ModalState): void {
    this._activeModal.set(state);
  }

  closeModal(): void {
    this._activeModal.set(null);
  }

  // ---- deck selection for games ----
  setActiveDeck(id: string | null): void {
    this._activeDeckId.set(id);
  }

  // ---- folder CRUD ----
  createFolder(name: string, description: string): Folder {
    const folder: Folder = { id: uid(), name, description, createdAt: Date.now(), words: [] };
    this._folders.update((list) => [...list, folder]);
    return folder;
  }

  updateFolder(id: string, name: string, description: string): void {
    this._folders.update((list) =>
      list.map((f) => (f.id === id ? { ...f, name, description } : f)),
    );
  }

  deleteFolder(id: string): void {
    this._folders.update((list) => list.filter((f) => f.id !== id));
    if (this._activeDeckId() === id) this._activeDeckId.set(null);
  }

  folderById(id: string): Folder | undefined {
    return this._folders().find((f) => f.id === id);
  }

  // ---- word CRUD ----
  addWord(folderId: string, word: Omit<Word, 'id'>): void {
    this._folders.update((list) =>
      list.map((f) =>
        f.id === folderId ? { ...f, words: [...f.words, { ...word, id: uid() }] } : f,
      ),
    );
  }

  updateWord(folderId: string, wordId: string, patch: Partial<Omit<Word, 'id'>>): void {
    this._folders.update((list) =>
      list.map((f) =>
        f.id === folderId
          ? { ...f, words: f.words.map((w) => (w.id === wordId ? { ...w, ...patch } : w)) }
          : f,
      ),
    );
  }

  deleteWords(folderId: string, wordIds: string[]): void {
    const ids = new Set(wordIds);
    this._folders.update((list) =>
      list.map((f) => (f.id === folderId ? { ...f, words: f.words.filter((w) => !ids.has(w.id)) } : f)),
    );
  }

  moveWords(fromFolderId: string, wordIds: string[], toFolderId: string): void {
    const ids = new Set(wordIds);
    this._folders.update((list) => {
      const source = list.find((f) => f.id === fromFolderId);
      const moving = source?.words.filter((w) => ids.has(w.id)) ?? [];
      return list.map((f) => {
        if (f.id === fromFolderId) return { ...f, words: f.words.filter((w) => !ids.has(w.id)) };
        if (f.id === toFolderId) return { ...f, words: [...f.words, ...moving] };
        return f;
      });
    });
  }

  // ---- CSV ----
  exportFolderCsv(folder: Folder): string {
    const header = 'english,thai,pronunciation,part of speech,note';
    const rows = folder.words.map((w) =>
      [w.translation, w.word, w.pronunciation ?? '', w.partOfSpeech, w.customNote ?? '']
        .map((v) => `"${(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );
    return [header, ...rows].join('\n');
  }

  importFolderCsv(folderId: string, csvText: string): number {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return 0;
    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQuotes) {
          if (c === '"' && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else if (c === '"') {
            inQuotes = false;
          } else {
            cur += c;
          }
        } else if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          out.push(cur);
          cur = '';
        } else {
          cur += c;
        }
      }
      out.push(cur);
      return out;
    };

    let start = 0;
    const first = parseLine(lines[0]).map((c) => c.toLowerCase().trim());
    if (['english', 'word'].includes(first[0])) start = 1;

    let count = 0;
    const added: Word[] = [];
    for (let i = start; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const [english, thai, pronunciation, partOfSpeech, customNote] = cols;
      if (!english || !thai) continue;
      added.push({
        id: uid(),
        word: thai,
        translation: english,
        pronunciation: pronunciation || undefined,
        partOfSpeech: (['noun', 'verb', 'adjective', 'phrase', 'adverb'].includes(partOfSpeech)
          ? partOfSpeech
          : 'noun') as Word['partOfSpeech'],
        customNote: customNote || undefined,
      });
      count++;
    }
    if (added.length) {
      this._folders.update((list) =>
        list.map((f) => (f.id === folderId ? { ...f, words: [...f.words, ...added] } : f)),
      );
    }
    return count;
  }

  // ---- SRS review ----
  status(wordId: string): MasteryStatus {
    return this._progress().mastery[wordId] ?? 'new';
  }

  reviewWord(wordId: string, grade: 'again' | 'good' | 'easy'): void {
    this.ensureToday();
    const current = this.status(wordId);
    let next: MasteryStatus;
    if (grade === 'again') next = 'learning';
    else if (grade === 'good') next = current === 'new' ? 'learning' : 'mastered';
    else next = 'mastered';

    const gained = grade === 'again' ? 1 : grade === 'good' ? 3 : 5;
    this._progress.update((p) => ({
      ...p,
      mastery: { ...p.mastery, [wordId]: next },
      points: p.points + gained,
      reviewedToday: p.reviewedToday + 1,
    }));
  }

  // ---- games ----
  recordGameResult(mode: GameMode, score: number, total: number): GameResult {
    this.ensureToday();
    const deckName = this.activeDeckName();
    const points = score * 10;
    const prevBest = this._progress().bests[mode];
    const ratio = total ? score / total : 0;
    const prevRatio = prevBest && prevBest.total ? prevBest.score / prevBest.total : -1;
    const isBest = !prevBest || ratio > prevRatio;
    const best: GameBest = isBest ? { score, total, at: Date.now() } : prevBest;

    this._progress.update((p) => ({
      ...p,
      points: p.points + points,
      bests: { ...p.bests, [mode]: best },
    }));

    const result: GameResult = { mode, score, total, points, deckName, isBest };
    this._lastResult.set(result);
    return result;
  }

  clearLastResult(): void {
    this._lastResult.set(null);
  }

  private ensureToday(): void {
    const today = todayStr();
    const p = this._progress();
    if (p.lastActiveDate === today) return;
    const wasYesterday = p.lastActiveDate === yesterdayStr();
    this._progress.set({
      ...p,
      streak: wasYesterday ? p.streak + 1 : 1,
      reviewedToday: 0,
      lastActiveDate: today,
    });
  }
}
