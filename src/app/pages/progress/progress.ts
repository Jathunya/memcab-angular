import { Component, computed, inject } from '@angular/core';
import { StoreService } from '../../core/store.service';
import { GameMode } from '../../core/models';

interface ModeMeta {
  mode: GameMode;
  color: 'teal' | 'amber' | 'violet' | 'coral';
  title: string;
}

const MODES: ModeMeta[] = [
  { mode: 'match', color: 'teal', title: 'Word Match' },
  { mode: 'quiz', color: 'amber', title: 'Speed Quiz' },
  { mode: 'type', color: 'violet', title: 'Type It' },
  { mode: 'speak', color: 'coral', title: 'Word Scramble' },
];

@Component({
  selector: 'app-progress',
  templateUrl: './progress.html',
  styleUrl: './progress.css',
})
export class ProgressPage {
  protected readonly store = inject(StoreService);
  protected readonly modes = MODES;

  protected readonly newCount = computed(
    () => this.store.totalTrackedCount() - this.store.masteredCount() - this.store.learningCount(),
  );

  private readonly masteredPct = computed(() =>
    this.store.totalTrackedCount()
      ? (this.store.masteredCount() / this.store.totalTrackedCount()) * 100
      : 0,
  );
  private readonly learningPct = computed(() =>
    this.store.totalTrackedCount()
      ? (this.store.learningCount() / this.store.totalTrackedCount()) * 100
      : 0,
  );

  protected readonly donutBackground = computed(() => {
    const a = this.masteredPct();
    const b = a + this.learningPct();
    return `conic-gradient(var(--teal) 0 ${a}%, var(--amber) ${a}% ${b}%, var(--new-grey) ${b}% 100%)`;
  });

  protected best(mode: GameMode) {
    return this.store.progress().bests[mode];
  }
}
