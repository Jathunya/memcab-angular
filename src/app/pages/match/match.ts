import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/store.service';
import { Word } from '../../core/models';

interface Tile {
  id: string;
  wordId: string;
  label: string;
  lang: 'th' | 'en';
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const MIN_WORDS = 4;

@Component({
  selector: 'app-match',
  imports: [RouterLink],
  templateUrl: './match.html',
  styleUrl: './match.css',
})
export class MatchPage implements OnInit {
  protected readonly store = inject(StoreService);
  private readonly router = inject(Router);

  protected readonly tiles = signal<Tile[]>([]);
  protected readonly selected = signal<string[]>([]);
  protected readonly mismatchIds = signal<string[]>([]);
  protected readonly pairCount = signal(0);
  protected readonly insufficientWords = signal(false);
  protected readonly minWords = MIN_WORDS;

  protected readonly matchedCount = signal(0);

  ngOnInit(): void {
    const deckWords = this.store.activeDeckWords();
    if (deckWords.length < MIN_WORDS) {
      this.insufficientWords.set(true);
      return;
    }
    const words = shuffle(deckWords).slice(0, 8);
    this.pairCount.set(words.length);
    const tiles: Tile[] = words.flatMap((w: Word) => [
      { id: `${w.id}-th`, wordId: w.id, label: w.word, lang: 'th' as const, matched: false },
      { id: `${w.id}-en`, wordId: w.id, label: w.translation, lang: 'en' as const, matched: false },
    ]);
    this.tiles.set(shuffle(tiles));
  }

  protected goBackToHub(): void {
    this.router.navigate(['/hub']);
  }

  protected select(tile: Tile): void {
    if (tile.matched || this.selected().includes(tile.id) || this.mismatchIds().length) return;

    if (this.selected().length === 0) {
      this.selected.set([tile.id]);
      return;
    }

    const firstId = this.selected()[0];
    const first = this.tiles().find((t) => t.id === firstId)!;
    this.selected.update((s) => [...s, tile.id]);

    if (first.wordId === tile.wordId && first.lang !== tile.lang) {
      setTimeout(() => {
        this.tiles.update((ts) =>
          ts.map((t) => (t.wordId === tile.wordId ? { ...t, matched: true } : t)),
        );
        this.selected.set([]);
        this.matchedCount.update((n) => n + 1);
        if (this.matchedCount() === this.pairCount()) this.finish();
      }, 250);
    } else {
      this.mismatchIds.set([firstId, tile.id]);
      setTimeout(() => {
        this.selected.set([]);
        this.mismatchIds.set([]);
      }, 550);
    }
  }

  private finish(): void {
    this.store.recordGameResult('match', this.matchedCount(), this.pairCount());
    this.router.navigateByUrl('/result');
  }
}
