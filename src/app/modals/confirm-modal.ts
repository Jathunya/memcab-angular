import { Component, computed, inject } from '@angular/core';
import { ModalShell } from './modal-shell';
import { StoreService } from '../core/store.service';

@Component({
  selector: 'app-confirm-modal',
  imports: [ModalShell],
  template: `
    @if (state(); as s) {
      <app-modal-shell [title]="s.title" (backdrop)="close()">
        <p class="body-text">{{ s.body }}</p>
        <div class="actions">
          <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
          <button type="button" class="btn btn-danger" (click)="confirm(s)">{{ s.confirmLabel }}</button>
        </div>
      </app-modal-shell>
    }
  `,
  styles: [
    `
      .body-text {
        color: var(--ink-soft);
        margin: 0 0 1.25rem;
        line-height: 1.5;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.6rem;
      }
    `,
  ],
})
export class ConfirmModal {
  private readonly store = inject(StoreService);

  readonly state = computed(() => {
    const m = this.store.activeModal();
    return m?.type === 'confirm' ? m : null;
  });

  confirm(s: { onConfirm: () => void }): void {
    s.onConfirm();
    this.close();
  }

  close(): void {
    this.store.closeModal();
  }
}
