import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModalShell } from './modal-shell';
import { StoreService } from '../core/store.service';

@Component({
  selector: 'app-save-word-modal',
  imports: [ModalShell, RouterLink],
  template: `
    @if (state(); as s) {
      <app-modal-shell title="Add to My Decks" (backdrop)="close()">
        <div class="preview">
          <span class="thai word">{{ s.word.word }}</span>
          <span class="translation">{{ s.word.translation }}</span>
        </div>

        @if (folders().length) {
          <ul class="targets">
            @for (folder of folders(); track folder.id) {
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
            <button type="button" class="btn btn-primary" [disabled]="!target()" (click)="save()">Save word</button>
          </div>
        } @else {
          <p class="empty">You don't have any decks yet. Create one from My Decks, then come back to save this word.</p>
          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="close()">Close</button>
            <a routerLink="/decks" class="btn btn-primary" (click)="close()">Go to My Decks</a>
          </div>
        }
      </app-modal-shell>
    }
  `,
  styles: [
    `
      .preview {
        display: flex;
        align-items: baseline;
        gap: 0.6rem;
        padding: 0.75rem 0.9rem;
        border-radius: var(--r-control);
        background: var(--teal-tint);
        margin-bottom: 1rem;
      }
      .preview .word {
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--teal-deep);
      }
      .preview .translation {
        color: var(--ink-soft);
        font-weight: 600;
      }
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
export class SaveWordModal {
  private readonly store = inject(StoreService);

  readonly state = computed(() => {
    const m = this.store.activeModal();
    return m?.type === 'save-word' ? m : null;
  });

  readonly folders = computed(() => this.store.folders());
  readonly target = signal<string | null>(null);

  save(): void {
    const s = this.state();
    const targetId = this.target();
    if (!s || !targetId) return;
    this.store.addWord(targetId, s.word);
    this.close();
  }

  close(): void {
    this.store.closeModal();
  }
}
