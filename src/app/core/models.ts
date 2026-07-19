/** Slim snapshot of the signed-in Firebase user, safe to store in a signal. */
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'phrase' | 'adverb';

export type MasteryStatus = 'new' | 'learning' | 'mastered';

export interface Word {
  id: string;
  word: string; // Thai
  translation: string; // English
  pronunciation?: string; // English IPA, paired with `translation`
  partOfSpeech: PartOfSpeech;
  customNote?: string;
}

export interface Folder {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  words: Word[];
}

export type GameMode = 'match' | 'quiz' | 'type' | 'speak';

export interface GameBest {
  score: number;
  total: number;
  at: number;
}

export interface Progress {
  mastery: Record<string, MasteryStatus>; // key = translation (english)
  bests: Partial<Record<GameMode, GameBest>>;
  streak: number;
  points: number;
  reviewedToday: number;
  lastReviewDate: string | null; // yyyy-mm-dd
  lastActiveDate: string | null;
}

export interface GameResult {
  mode: GameMode;
  score: number;
  total: number;
  points: number;
  deckName: string;
  isBest: boolean;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  isEarned: (progress: Progress, folders: Folder[]) => boolean;
}

export interface LeaderboardEntry {
  name: string;
  points: number;
  isYou?: boolean;
}
