import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { StoreService } from '../../core/store.service';
import { GameMode } from '../../core/models';

interface DeckOption {
  id: string;
  name: string;
  count: number;
}

interface ModeCard {
  mode: GameMode;
  path: string;
  color: 'teal' | 'amber' | 'violet' | 'coral';
  title: string;
  description: string;
  minWords: number;
}

@Component({
  selector: 'app-hub',
  templateUrl: './hub.html',
  styleUrl: './hub.css',
})
export class HubPage {
  protected readonly store = inject(StoreService);
  private readonly router = inject(Router);

  protected readonly deckOptions = computed<DeckOption[]>(() =>
    this.store.folders().map((f) => ({ id: f.id, name: f.name, count: f.words.length })),
  );

  protected readonly selectedDeckId = signal(
    this.store.activeDeckId() ?? this.store.folders()[0]?.id ?? '',
  );

  protected readonly selectedCount = computed(
    () => this.deckOptions().find((d) => d.id === this.selectedDeckId())?.count ?? 0,
  );

  protected readonly modes: ModeCard[] = [
    { mode: 'match', path: '/match', color: 'teal', title: 'Word Match', description: 'Tap-to-pair EN ↔ Thai grid.', minWords: 4 },
    { mode: 'quiz', path: '/quiz', color: 'amber', title: 'Speed Quiz', description: 'Timed multiple choice.', minWords: 4 },
    { mode: 'type', path: '/type', color: 'violet', title: 'Type It', description: 'Spell from meaning + hint.', minWords: 1 },
    { mode: 'speak', path: '/speak', color: 'coral', title: 'Word Scramble', description: 'Unscramble the English spelling.', minWords: 1 },
  ];

  protected selectDeck(id: string): void {
    this.selectedDeckId.set(id);
    this.store.setActiveDeck(id);
  }

  protected best(mode: GameMode) {
    return this.store.progress().bests[mode];
  }

  protected play(card: ModeCard): void {
    if (this.selectedCount() < card.minWords) return;
    this.router.navigateByUrl(card.path);
  }
}
