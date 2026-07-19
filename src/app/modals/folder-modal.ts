import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShell } from './modal-shell';
import { StoreService } from '../core/store.service';

@Component({
  selector: 'app-folder-modal',
  imports: [FormsModule, ModalShell],
  template: `
    @if (state(); as s) {
      <app-modal-shell [title]="s.folder ? 'Edit deck' : 'New deck'" (backdrop)="close()">
        <form class="field-stack" (ngSubmit)="save()">
          <div class="field">
            <label for="folder-name">Deck name</label>
            <input id="folder-name" name="name" [ngModel]="name()" (ngModelChange)="name.set($event)" required maxlength="40" placeholder="e.g. Travel Thai" />
          </div>
          <div class="field">
            <label for="folder-desc">Description</label>
            <textarea id="folder-desc" name="description" [ngModel]="description()" (ngModelChange)="description.set($event)" rows="3" maxlength="140" placeholder="What's this deck for?"></textarea>
          </div>
          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="!name().trim()">
              {{ s.folder ? 'Save changes' : 'Create deck' }}
            </button>
          </div>
        </form>
      </app-modal-shell>
    }
  `,
  styles: [
    `
      .field-stack {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.6rem;
        margin-top: 0.5rem;
      }
    `,
  ],
})
export class FolderModal {
  private readonly store = inject(StoreService);

  readonly state = computed(() => {
    const m = this.store.activeModal();
    return m?.type === 'folder' ? m : null;
  });

  readonly name = signal(this.state()?.folder?.name ?? '');
  readonly description = signal(this.state()?.folder?.description ?? '');

  constructor() {
    const s = this.state();
    if (s?.folder) {
      this.name.set(s.folder.name);
      this.description.set(s.folder.description);
    }
  }

  save(): void {
    const s = this.state();
    if (!s || !this.name().trim()) return;
    if (s.folder) {
      this.store.updateFolder(s.folder.id, this.name().trim(), this.description().trim());
    } else {
      this.store.createFolder(this.name().trim(), this.description().trim());
    }
    this.close();
  }

  close(): void {
    this.store.closeModal();
  }
}
