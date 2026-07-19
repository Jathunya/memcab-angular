import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/store.service';
import { Word } from '../../core/models';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const MIN_WORDS = 1;

@Component({
  selector: 'app-type',
  imports: [FormsModule, RouterLink],
  templateUrl: './type.html',
  styleUrl: './type.css',
})
export class TypePage implements OnInit {
  protected readonly store = inject(StoreService);
  private readonly router = inject(Router);

  protected readonly words = signal<Word[]>([]);
  protected readonly index = signal(0);
  protected readonly score = signal(0);
  protected readonly input = signal('');
  protected readonly hintCount = signal(0);
  protected readonly submitted = signal(false);
  protected readonly isCorrect = signal(false);
  protected readonly insufficientWords = signal(false);
  protected readonly minWords = MIN_WORDS;

  protected readonly current = computed<Word | null>(() => this.words()[this.index()] ?? null);
  protected readonly total = computed(() => this.words().length);

  protected readonly hint = computed(() => {
    const word = this.current();
    if (!word) return '';
    const answer = word.translation;
    return answer
      .split('')
      .map((ch, i) => (ch === ' ' ? ' ' : i < this.hintCount() ? ch : '_'))
      .join(' ');
  });

  ngOnInit(): void {
    const deckWords = this.store.activeDeckWords();
    if (deckWords.length < MIN_WORDS) {
      this.insufficientWords.set(true);
      return;
    }
    const deck = shuffle(deckWords).slice(0, 10);
    this.words.set(deck);
  }

  protected goBackToHub(): void {
    this.router.navigate(['/hub']);
  }

  protected addHint(): void {
    const max = this.current()?.translation.length ?? 0;
    this.hintCount.update((n) => Math.min(n + 1, max - 1 || 1));
  }

  protected submit(): void {
    if (this.submitted() || !this.current()) return;
    const correct =
      this.input().trim().toLowerCase() === this.current()!.translation.trim().toLowerCase();
    this.isCorrect.set(correct);
    this.submitted.set(true);
    if (correct) this.score.update((s) => s + 1);

    setTimeout(() => {
      if (this.index() + 1 >= this.total()) {
        this.finish();
      } else {
        this.index.update((i) => i + 1);
        this.input.set('');
        this.hintCount.set(0);
        this.submitted.set(false);
      }
    }, 900);
  }

  private finish(): void {
    this.store.recordGameResult('type', this.score(), this.total());
    this.router.navigateByUrl('/result');
  }
}
