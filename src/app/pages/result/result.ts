import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/store.service';
import { GameMode } from '../../core/models';

const MODE_META: Record<GameMode, { icon: string; title: string; path: string }> = {
  match: { icon: '🧩', title: 'Word Match', path: '/match' },
  quiz: { icon: '⏱️', title: 'Speed Quiz', path: '/quiz' },
  type: { icon: '⌨️', title: 'Type It', path: '/type' },
  speak: { icon: '🔤', title: 'Word Scramble', path: '/speak' },
};

@Component({
  selector: 'app-result',
  imports: [RouterLink],
  templateUrl: './result.html',
  styleUrl: './result.css',
})
export class ResultPage implements OnInit {
  protected readonly store = inject(StoreService);
  private readonly router = inject(Router);

  protected readonly modeMeta = MODE_META;

  ngOnInit(): void {
    if (!this.store.lastResult()) this.router.navigateByUrl('/home');
  }

  protected get percent(): number {
    const r = this.store.lastResult();
    if (!r || !r.total) return 0;
    return Math.round((r.score / r.total) * 100);
  }

  protected replay(): void {
    const r = this.store.lastResult();
    if (!r) return;
    this.router.navigateByUrl(MODE_META[r.mode].path);
  }
}
