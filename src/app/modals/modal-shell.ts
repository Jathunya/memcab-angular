import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal-shell',
  template: `
    <div class="backdrop" (click)="backdrop.emit()">
      <div class="sheet card" [class.wide]="wide" (click)="$event.stopPropagation()">
        <header>
          <h2>{{ title }}</h2>
          <button type="button" class="close" (click)="backdrop.emit()" aria-label="Close">✕</button>
        </header>
        <div class="body">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        background: color-mix(in srgb, var(--ink) 45%, transparent);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        padding: 1.5rem;
      }
      .sheet {
        width: 100%;
        max-width: 440px;
        max-height: 85vh;
        overflow-y: auto;
        border-radius: var(--r-sheet);
        box-shadow: var(--shadow-modal);
        animation: pop 0.15s ease;
      }
      .sheet.wide {
        max-width: 560px;
      }
      @keyframes pop {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem 0.5rem;
      }
      h2 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 800;
      }
      .close {
        border: none;
        background: transparent;
        font-size: 1rem;
        color: var(--ink-soft);
        border-radius: var(--r-pill);
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .close:hover {
        background: color-mix(in srgb, var(--ink) 6%, transparent);
      }
      .body {
        padding: 0.5rem 1.5rem 1.5rem;
      }
      @media (max-width: 480px) {
        .backdrop {
          padding: 0.75rem;
          align-items: flex-end;
        }
        .sheet {
          max-height: 90vh;
        }
        header {
          padding: 1rem 1.1rem 0.4rem;
        }
        .body {
          padding: 0.4rem 1.1rem 1.1rem;
        }
      }
    `,
  ],
})
export class ModalShell {
  @Input() title = '';
  @Input() wide = false;
  @Output() backdrop = new EventEmitter<void>();
}
