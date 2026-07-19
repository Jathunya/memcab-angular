import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreService } from './store.service';

describe('StoreService', () => {
  let store: StoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(StoreService);
  });

  /**
   * Note on scope: there is no separate "SRS service" with an SM-2-style
   * interval/Easiness-Factor scheduler in this codebase. reviewWord() below
   * IS the real spaced-repetition implementation -- a 3-state Leitner-style
   * confidence model (New -> Learning -> Mastered) driven by self-graded
   * Again/Good/Easy, with flat point rewards. These tests cover that actual
   * state machine rather than a formula that isn't implemented.
   */
  describe('reviewWord() -- confidence-based mastery state machine', () => {
    it('"again" resets a word to learning and awards 1 point', () => {
      store.reviewWord('w1', 'again');
      expect(store.status('w1')).toBe('learning');
      expect(store.progress().points).toBe(1);
    });

    it('"good" on a brand-new word advances it to learning (not straight to mastered)', () => {
      store.reviewWord('w1', 'good');
      expect(store.status('w1')).toBe('learning');
      expect(store.progress().points).toBe(3);
    });

    it('"good" on an already-learning word advances it to mastered', () => {
      store.reviewWord('w1', 'again'); // new -> learning
      store.reviewWord('w1', 'good'); // learning -> mastered
      expect(store.status('w1')).toBe('mastered');
    });

    it('"easy" jumps a brand-new word straight to mastered and awards 5 points', () => {
      store.reviewWord('w1', 'easy');
      expect(store.status('w1')).toBe('mastered');
      expect(store.progress().points).toBe(5);
    });

    it('an unreviewed word defaults to "new"', () => {
      expect(store.status('never-touched')).toBe('new');
    });

    it('increments reviewedToday on every grade, regardless of outcome', () => {
      store.reviewWord('w1', 'again');
      store.reviewWord('w2', 'easy');
      expect(store.progress().reviewedToday).toBe(2);
    });
  });

  describe('masteryPercent -- boundary value analysis', () => {
    it('is 0 (not NaN/Infinity) when there are zero tracked words', () => {
      expect(store.masteryPercent()).toBe(0);
    });
  });

  describe('setActiveUser() -- per-account data isolation (regression guard for the cross-account deck leak)', () => {
    it('a newly-active uid starts with an empty deck list, never a previous uid\'s data', () => {
      store.setActiveUser('uid-a');
      store.createFolder('Account A Secret Deck', '');
      expect(store.folders().length).toBe(1);

      store.setActiveUser('uid-b');
      expect(store.folders()).toEqual([]);
    });

    it('persists a uid\'s decks to a key scoped by that uid, and restores them when switching back', async () => {
      store.setActiveUser('uid-a');
      store.createFolder('Account A Deck', '');

      // Persistence runs inside an effect(), which Angular flushes
      // asynchronously -- poll for the eventual state instead of asserting
      // on the scheduler's internal timing (flake-resistant by design).
      await vi.waitFor(() => {
        expect(localStorage.getItem('memcab_folders::uid-a')).not.toBeNull();
      });

      store.setActiveUser('uid-b');
      expect(store.folders()).toEqual([]);

      store.setActiveUser('uid-a');
      expect(store.folders().length).toBe(1);
      expect(store.folders()[0].name).toBe('Account A Deck');
    });

    it('never writes to the unscoped legacy key (memcab_folders) for a signed-in uid', async () => {
      store.setActiveUser('uid-a');
      store.createFolder('Deck', '');
      await vi.waitFor(() => {
        expect(localStorage.getItem('memcab_folders::uid-a')).not.toBeNull();
      });
      expect(localStorage.getItem('memcab_folders')).toBeNull();
    });

    it('is a no-op when called again with the uid that is already active, so in-progress edits are not clobbered', () => {
      store.setActiveUser('uid-a');
      store.createFolder('Deck', '');
      store.setActiveUser('uid-a');
      expect(store.folders().length).toBe(1);
    });

    it('resets to an empty dataset when uid is null (signed out)', () => {
      store.setActiveUser('uid-a');
      store.createFolder('Deck', '');
      store.setActiveUser(null);
      expect(store.folders()).toEqual([]);
    });
  });

  describe('wipeAllData() -- account deletion', () => {
    it('clears in-memory decks/progress and removes the scoped storage keys for that uid', async () => {
      store.setActiveUser('uid-a');
      store.createFolder('Deck', '');
      store.reviewWord('w1', 'good');
      await vi.waitFor(() => {
        expect(localStorage.getItem('memcab_folders::uid-a')).not.toBeNull();
        expect(localStorage.getItem('memcab_progress::uid-a')).not.toBeNull();
      });

      store.wipeAllData('uid-a');

      expect(store.folders()).toEqual([]);
      expect(store.progress().points).toBe(0);
      expect(localStorage.getItem('memcab_folders::uid-a')).toBeNull();
      expect(localStorage.getItem('memcab_progress::uid-a')).toBeNull();
    });

    it('does not touch a different uid\'s data', async () => {
      store.setActiveUser('uid-a');
      store.createFolder('Keep me', '');
      await vi.waitFor(() => {
        expect(localStorage.getItem('memcab_folders::uid-a')).not.toBeNull();
      });

      store.wipeAllData('uid-b'); // deleting a DIFFERENT account

      expect(localStorage.getItem('memcab_folders::uid-a')).not.toBeNull();
    });
  });

  describe('folder CRUD', () => {
    beforeEach(() => {
      store.setActiveUser('uid-a');
    });

    it('createFolder adds a folder with an empty word list', () => {
      const folder = store.createFolder('Travel Thai', 'For the trip');
      expect(store.folders()).toContainEqual(folder);
      expect(folder.words).toEqual([]);
    });

    it('deleteFolder removes it and clears activeDeckId if it was the active deck', () => {
      const folder = store.createFolder('Temp', '');
      store.setActiveDeck(folder.id);
      store.deleteFolder(folder.id);
      expect(store.folders()).toEqual([]);
      expect(store.activeDeckId()).toBeNull();
    });

    it('addWord appends a word to the correct folder only', () => {
      const a = store.createFolder('A', '');
      const b = store.createFolder('B', '');
      store.addWord(a.id, { word: 'น้ำ', translation: 'water', partOfSpeech: 'noun' });
      expect(store.folderById(a.id)?.words.length).toBe(1);
      expect(store.folderById(b.id)?.words.length).toBe(0);
    });
  });
});
