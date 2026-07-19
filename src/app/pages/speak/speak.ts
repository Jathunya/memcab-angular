import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/store.service';
import { AudioService } from '../../core/audio.service';
import { Word } from '../../core/models';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface LetterTile {
  id: number;
  char: string;
  used: boolean;
}

const MIN_WORDS = 1;
const WRONG_RESET_DELAY_MS = 700;
const CORRECT_ADVANCE_DELAY_MS = 1500;

@Component({
  selector: 'app-speak',
  imports: [RouterLink],
  templateUrl: './speak.html',
  styleUrl: './speak.css',
})
export class SpeakPage implements OnInit {
  protected readonly store = inject(StoreService);
  protected readonly audio = inject(AudioService);
  private readonly router = inject(Router);

  protected readonly words = signal<Word[]>([]);
  protected readonly index = signal(0);
  protected readonly score = signal(0);
  protected readonly insufficientWords = signal(false);
  protected readonly minWords = MIN_WORDS;

  protected readonly scrambledLetters = signal<LetterTile[]>([]);
  protected readonly placedTileIds = signal<number[]>([]);
  protected readonly feedback = signal<'idle' | 'correct' | 'wrong'>('idle');

  protected readonly current = computed<Word | null>(() => this.words()[this.index()] ?? null);
  protected readonly total = computed(() => this.words().length);

  protected readonly answerDisplay = computed<(string | null)[]>(() => {
    const word = this.current();
    const len = word ? word.translation.length : 0;
    const placed = this.placedTileIds();
    const tiles = this.scrambledLetters();
    return Array.from({ length: len }, (_, i) => {
      const id = placed[i];
      if (id === undefined) return null;
      return tiles.find((t) => t.id === id)?.char ?? null;
    });
  });

  ngOnInit(): void {
    const deckWords = this.store.activeDeckWords();
    if (deckWords.length < MIN_WORDS) {
      this.insufficientWords.set(true);
      return;
    }
    const deck = shuffle(deckWords).slice(0, 8);
    this.words.set(deck);
    this.setupWord();
  }

  protected goBackToHub(): void {
    this.router.navigate(['/hub']);
  }

  protected playTarget(): void {
    const word = this.current();
    if (word) this.audio.speak(word.translation, 'en-US');
  }

  protected selectLetter(tileId: number): void {
    if (this.feedback() !== 'idle') return;
    const tile = this.scrambledLetters().find((t) => t.id === tileId);
    if (!tile || tile.used) return;

    this.scrambledLetters.update((list) =>
      list.map((t) => (t.id === tileId ? { ...t, used: true } : t)),
    );
    this.placedTileIds.update((ids) => [...ids, tileId]);

    const word = this.current();
    if (word && this.placedTileIds().length === word.translation.length) {
      this.checkAnswer();
    }
  }

  protected removeAt(displayIndex: number): void {
    if (this.feedback() !== 'idle') return;
    const ids = this.placedTileIds();
    const tileId = ids[displayIndex];
    if (tileId === undefined) return;
    this.placedTileIds.set(ids.filter((_, i) => i !== displayIndex));
    this.scrambledLetters.update((list) =>
      list.map((t) => (t.id === tileId ? { ...t, used: false } : t)),
    );
  }

  protected reset(): void {
    if (this.feedback() === 'correct') return;
    this.resetAttempt();
  }

  protected skip(): void {
    this.next();
  }

  private checkAnswer(): void {
    const word = this.current();
    if (!word) return;
    const answer = this.placedTileIds()
      .map((id) => this.scrambledLetters().find((t) => t.id === id)?.char ?? '')
      .join('')
      .toLowerCase();
    const target = word.translation.toLowerCase();

    if (answer === target) {
      this.feedback.set('correct');
      this.score.update((s) => s + 1);
      setTimeout(() => this.next(), CORRECT_ADVANCE_DELAY_MS);
    } else {
      this.feedback.set('wrong');
      setTimeout(() => {
        this.feedback.set('idle');
        this.resetAttempt();
      }, WRONG_RESET_DELAY_MS);
    }
  }

  private resetAttempt(): void {
    this.scrambledLetters.update((list) => list.map((t) => ({ ...t, used: false })));
    this.placedTileIds.set([]);
    this.feedback.set('idle');
  }

  private setupWord(): void {
    const word = this.current();
    if (!word) return;
    const chars = word.translation.split('');
    let shuffled = shuffle(chars);
    if (chars.length > 1 && shuffled.join('') === chars.join('')) {
      shuffled = shuffle(chars);
    }
    this.scrambledLetters.set(shuffled.map((char, id) => ({ id, char, used: false })));
    this.placedTileIds.set([]);
    this.feedback.set('idle');
  }

  protected next(): void {
    if (this.index() + 1 >= this.total()) {
      this.finish();
    } else {
      this.index.update((i) => i + 1);
      this.setupWord();
    }
  }

  private finish(): void {
    this.store.recordGameResult('speak', this.score(), this.total());
    this.router.navigateByUrl('/result');
  }
}
