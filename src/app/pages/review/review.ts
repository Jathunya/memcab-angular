import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../../core/store.service';
import { AudioService } from '../../core/audio.service';
import { Word } from '../../core/models';

@Component({
  selector: 'app-review',
  imports: [RouterLink],
  templateUrl: './review.html',
  styleUrl: './review.css',
})
export class ReviewPage {
  protected readonly store = inject(StoreService);
  private readonly audio = inject(AudioService);
  private readonly route = inject(ActivatedRoute);

  protected readonly deckOptions = this.store.reviewDecks;
  // Deep-linked from Deck Detail's "Study this deck" menu via ?deckId=...;
  // falls back to the normal empty (all-decks) selection when absent.
  protected readonly selectedDeckIds = signal<Set<string>>(this.initialDeckSelection());
  protected readonly started = signal(false);

  protected readonly previewCount = computed(() =>
    this.store.reviewQueueForDecks([...this.selectedDeckIds()]).length,
  );

  private readonly session = signal<Word[]>([]);
  protected readonly index = signal(0);
  protected readonly flipped = signal(false);
  protected readonly reviewedThisSession = signal(0);

  protected readonly current = computed<Word | null>(() => this.session()[this.index()] ?? null);
  protected readonly total = computed(() => this.session().length);
  protected readonly done = computed(() => this.index() >= this.total());

  private initialDeckSelection(): Set<string> {
    const deckId = this.route.snapshot.queryParamMap.get('deckId');
    if (!deckId) return new Set();
    const exists = this.store.reviewDecks().some((d) => d.id === deckId);
    return exists ? new Set([deckId]) : new Set();
  }

  protected toggleDeck(id: string): void {
    this.selectedDeckIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected startReview(): void {
    this.session.set(this.store.reviewQueueForDecks([...this.selectedDeckIds()]));
    this.index.set(0);
    this.reviewedThisSession.set(0);
    this.flipped.set(false);
    this.started.set(true);
  }

  protected changeDecks(): void {
    this.started.set(false);
  }

  protected hear(): void {
    const word = this.current();
    if (word) this.audio.speak(word.translation, 'en-US');
  }

  protected flip(): void {
    this.flipped.set(true);
  }

  protected grade(g: 'again' | 'good' | 'easy'): void {
    const word = this.current();
    if (!word) return;
    this.store.reviewWord(word.id, g);
    this.reviewedThisSession.update((n) => n + 1);
    if (g === 'again') this.session.update((s) => [...s, word]);
    this.index.update((i) => i + 1);
    this.flipped.set(false);
  }
}
