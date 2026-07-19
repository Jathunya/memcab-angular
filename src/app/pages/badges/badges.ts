import { Component, inject } from '@angular/core';
import { StoreService } from '../../core/store.service';
import { BADGES, LEADERBOARD } from '../../core/data';

@Component({
  selector: 'app-badges',
  templateUrl: './badges.html',
  styleUrl: './badges.css',
})
export class BadgesPage {
  protected readonly store = inject(StoreService);
  protected readonly badges = BADGES;

  protected readonly leaderboard = LEADERBOARD.map((entry) => entry).concat({
    name: 'You',
    points: this.store.progress().points,
    isYou: true,
  }).sort((a, b) => b.points - a.points);

  protected isEarned(id: string): boolean {
    return this.store.earnedBadges().some((b) => b.id === id);
  }
}
