import { Component, computed, inject, signal } from '@angular/core';
import { ModalShell } from './modal-shell';
import { StoreService } from '../core/store.service';

@Component({
  selector: 'app-move-modal',
  imports: [ModalShell],
  template: `
    @if (state(); as s) {
      <app-modal-shell [title]="'Move ' + s.wordIds.length + ' word(s)'" (backdrop)="close()">
        @if (targets().length) {
          <ul class="targets">
            @for (folder of targets(); track folder.id) {
              <li>
                <button type="button" class="target" [class.selected]="target() === folder.id" (click)="target.set(folder.id)">
                  <span>{{ folder.name }}</span>
                  <span class="count">{{ folder.words.length }} words</span>
                </button>
              </li>
            }
          </ul>
          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
            <button type="button" class="btn btn-primary" [disabled]="!target()" (click)="move()">Move</button>
          </div>
        } @else {
          <p class="empty">No other decks yet. Create another deck first to move words into it.</p>
          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="close()">Close</button>
          </div>
        }
      </app-modal-shell>
    }
  `,
  styles: [
    `
      .targets {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-height: 260px;
        overflow-y: auto;
      }
      .target {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.7rem 0.9rem;
        border-radius: var(--r-control);
        border: 1px solid transparent;
        background: var(--surface);
        box-shadow: var(--sh-sm);
        text-align: left;
        transition: box-shadow 0.15s ease, background 0.15s ease;
      }
      .target.selected {
        background: var(--teal-tint);
        color: var(--teal-deep);
        box-shadow: var(--sh-inset-sm);
      }
      .count {
        color: var(--muted);
        font-size: 0.8rem;
      }
      .empty {
        color: var(--ink-soft);
        margin: 0.5rem 0 1rem;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.6rem;
        margin-top: 1rem;
      }
    `,
  ],
})
export class MoveModal {
  private readonly store = inject(StoreService);

  readonly state = computed(() => {
    const m = this.store.activeModal();
    return m?.type === 'move' ? m : null;
  });

  readonly targets = computed(() => {
    const s = this.state();
    if (!s) return [];
    return this.store.folders().filter((f) => f.id !== s.folderId);
  });

  readonly target = signal<string | null>(null);

  move(): void {
    const s = this.state();
    const targetId = this.target();
    if (!s || !targetId) return;
    this.store.moveWords(s.folderId, s.wordIds, targetId);
    this.close();
  }

  close(): void {
    this.store.closeModal();
  }
}
